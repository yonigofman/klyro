package discovery

import (
	"context"
	"path/filepath"
	"testing"
)

func TestGather_UnreachableCluster(t *testing.T) {
	info := Gather(context.Background(), filepath.Join(t.TempDir(), "does-not-exist"))
	if info.Available {
		t.Error("Gather() with a missing kubeconfig should report Available=false")
	}
}
