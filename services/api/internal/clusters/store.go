package clusters

import (
	"sync"

	kube "github.com/yonigofman/klyro/services/api/internal/kubernetes"
)

// record pairs a Cluster with the live Client used to re-probe it. The
// Client is only ever exposed to other packages via Service.ClientFor, for
// reusing a Cluster's connection (e.g. internal/resources) — it never goes
// into an HTTP response; API responses only ever see Cluster.
type record struct {
	cluster Cluster
	client  *kube.Client
}

// store is an in-memory, concurrency-safe Cluster registry. Clusters do not
// persist across process restarts — Postgres-backed storage is a later spec.
type store struct {
	mu      sync.RWMutex
	records map[string]record
}

func newStore() *store {
	return &store{records: make(map[string]record)}
}

func (s *store) put(c Cluster, client *kube.Client) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.records[c.ID] = record{cluster: c, client: client}
}

func (s *store) updateCluster(c Cluster) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if r, ok := s.records[c.ID]; ok {
		r.cluster = c
		s.records[c.ID] = r
	}
}

func (s *store) get(id string) (Cluster, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	r, ok := s.records[id]
	return r.cluster, ok
}

func (s *store) getClient(id string) (*kube.Client, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	r, ok := s.records[id]
	return r.client, ok
}

func (s *store) list() []Cluster {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Cluster, 0, len(s.records))
	for _, r := range s.records {
		out = append(out, r.cluster)
	}
	return out
}

func (s *store) all() []record {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]record, 0, len(s.records))
	for _, r := range s.records {
		out = append(out, r)
	}
	return out
}

func (s *store) delete(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.records[id]; !ok {
		return false
	}
	delete(s.records, id)
	return true
}
