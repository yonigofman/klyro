// Package clusters holds in-memory cluster registration state.
//
// This is a Phase 5 placeholder: real persistence (Postgres) is a
// deliberately deferred decision, not forgotten (see the wayfinder map).
package clusters

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

type HealthStatus int

const (
	HealthUnspecified HealthStatus = iota
	HealthHealthy
	HealthDegraded
)

type Capabilities struct {
	KubernetesVersion  string
	NodeCount          int32
	DiscoveryAvailable bool
}

type Cluster struct {
	ID           string
	Name         string
	AgentVersion string
	Status       HealthStatus
	Capabilities Capabilities
	RegisteredAt time.Time
	LastSeenAt   time.Time
}

// Store is a thread-safe, in-memory registry of connected clusters.
type Store struct {
	mu       sync.RWMutex
	clusters map[string]*Cluster
}

func NewStore() *Store {
	return &Store{clusters: make(map[string]*Cluster)}
}

func (s *Store) Register(name, agentVersion string) *Cluster {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	c := &Cluster{
		ID:           newID(),
		Name:         name,
		AgentVersion: agentVersion,
		RegisteredAt: now,
		LastSeenAt:   now,
	}
	s.clusters[c.ID] = c
	return c
}

func (s *Store) Heartbeat(id string, status HealthStatus, caps Capabilities) (*Cluster, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	c, ok := s.clusters[id]
	if !ok {
		return nil, false
	}
	c.Status = status
	c.Capabilities = caps
	c.LastSeenAt = time.Now()
	return c, true
}

func (s *Store) Get(id string) (*Cluster, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	c, ok := s.clusters[id]
	return c, ok
}

func (s *Store) List() []*Cluster {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*Cluster, 0, len(s.clusters))
	for _, c := range s.clusters {
		out = append(out, c)
	}
	return out
}

func newID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
