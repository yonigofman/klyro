package agentserver

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"

	agentv1 "github.com/yonigofman/klyro/packages/protocol/agent/v1"
)

// conn is the live handle for one agent's stream. The agent dials out and
// never accepts inbound connections, so a request the backend wants the
// agent to run (ListResources) is pushed DOWN this same stream and
// correlated to its response by request_id — there is no other way to
// reach the agent.
type conn struct {
	stream agentv1.AgentService_ConnectServer

	sendMu sync.Mutex

	pendingMu sync.Mutex
	pending   map[string]chan *agentv1.ListResourcesResponse
}

func newConn(stream agentv1.AgentService_ConnectServer) *conn {
	return &conn{
		stream:  stream,
		pending: make(map[string]chan *agentv1.ListResourcesResponse),
	}
}

func (c *conn) send(msg *agentv1.ServerMessage) error {
	c.sendMu.Lock()
	defer c.sendMu.Unlock()
	return c.stream.Send(msg)
}

// resolve delivers a response the agent sent back to whoever is waiting on
// its request_id. A response with no matching waiter (a late reply after a
// timeout, for example) is dropped.
func (c *conn) resolve(resp *agentv1.ListResourcesResponse) {
	c.pendingMu.Lock()
	ch, ok := c.pending[resp.GetRequestId()]
	if ok {
		delete(c.pending, resp.GetRequestId())
	}
	c.pendingMu.Unlock()

	if ok {
		ch <- resp
	}
}

var ErrRequestTimeout = errors.New("agent did not respond in time")

func (c *conn) ListResources(ctx context.Context, kind, namespace string) (*agentv1.ListResourcesResponse, error) {
	requestID := newRequestID()
	replyCh := make(chan *agentv1.ListResourcesResponse, 1)

	c.pendingMu.Lock()
	c.pending[requestID] = replyCh
	c.pendingMu.Unlock()

	if err := c.send(&agentv1.ServerMessage{
		Payload: &agentv1.ServerMessage_ListResourcesRequest{
			ListResourcesRequest: &agentv1.ListResourcesRequest{
				RequestId: requestID,
				Kind:      kind,
				Namespace: namespace,
			},
		},
	}); err != nil {
		c.pendingMu.Lock()
		delete(c.pending, requestID)
		c.pendingMu.Unlock()
		return nil, err
	}

	select {
	case resp := <-replyCh:
		return resp, nil
	case <-time.After(15 * time.Second):
		c.pendingMu.Lock()
		delete(c.pending, requestID)
		c.pendingMu.Unlock()
		return nil, ErrRequestTimeout
	case <-ctx.Done():
		c.pendingMu.Lock()
		delete(c.pending, requestID)
		c.pendingMu.Unlock()
		return nil, ctx.Err()
	}
}

func newRequestID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
