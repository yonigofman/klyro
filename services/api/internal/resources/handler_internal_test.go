package resources

import (
	"context"
	"errors"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// This file tests streamLines directly (package resources, not
// resources_test) because the fake clientset's Pod-logs stub returns a
// fixed string and finishes instantly — it can never simulate a stream
// that's still blocked when the client disconnects, which is exactly the
// path a goroutine leak would hide in. io.Pipe gives genuine control over
// when (or whether) the reader side unblocks.

func TestStreamLines_StopsOnContextCancelEvenIfReaderNeverEnds(t *testing.T) {
	pr, pw := io.Pipe()
	defer pw.Close()

	ctx, cancel := context.WithCancel(context.Background())
	w := httptest.NewRecorder()

	done := make(chan struct{})
	go func() {
		streamLines(ctx, w, w, pr)
		close(done)
	}()

	if _, err := io.WriteString(pw, "line one\n"); err != nil {
		t.Fatalf("writing to pipe: %v", err)
	}

	select {
	case <-done:
		t.Fatal("streamLines returned before the context was canceled")
	case <-time.After(100 * time.Millisecond):
	}

	cancel()

	select {
	case <-done:
	case <-time.After(1 * time.Second):
		t.Fatal("streamLines did not return within 1s of context cancellation — goroutine leak")
	}

	if body := w.Body.String(); !strings.Contains(body, "data: line one") {
		t.Errorf("body = %q, want it to contain the line written before cancellation", body)
	}
}

func TestStreamLines_EndsCleanlyOnEOF(t *testing.T) {
	r := strings.NewReader("one\ntwo\n")
	w := httptest.NewRecorder()

	streamLines(context.Background(), w, w, r)

	if body := w.Body.String(); body != "data: one\n\ndata: two\n\n" {
		t.Errorf("body = %q", body)
	}
}

func TestStreamLines_WritesLogErrorEventOnReadFailure(t *testing.T) {
	pr, pw := io.Pipe()
	w := httptest.NewRecorder()

	done := make(chan struct{})
	go func() {
		streamLines(context.Background(), w, w, pr)
		close(done)
	}()

	_ = pw.CloseWithError(errors.New("upstream closed"))

	select {
	case <-done:
	case <-time.After(1 * time.Second):
		t.Fatal("streamLines did not return after the reader failed")
	}

	body := w.Body.String()
	if !strings.Contains(body, "event: log-error") || !strings.Contains(body, "upstream closed") {
		t.Errorf("body = %q, want a log-error event naming the failure", body)
	}
}
