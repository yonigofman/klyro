---
status: accepted
---

# The Manifest view is a scoped, one-off exception to curated Detail DTOs

Every Resource view in Klyro so far — Summary (list) and Detail (drill-down) — is a curated DTO: a deliberately chosen subset of fields, never the raw Kubernetes object (see CONTEXT.md's Summary/Detail entry). The Manifest view (a read-only "show me the YAML" affordance on each Detail page) breaks that rule on purpose: it serializes the exact client-go object already fetched for that Detail page straight to YAML, with no field curation at all.

This is scoped deliberately narrow, not a new general capability:

- It only exists for the same five kinds the Detail views already cover (Pod, Workload, Service, Ingress, Node) — no generic "any GVK" raw viewer.
- It reuses the typed object `internal/kubernetes` already returns for that kind's existing `Get*` call. No new Kubernetes-integration-layer method, no dynamic client, no second code path for talking to a cluster.
- It is read-only. Mutating from a pasted/edited Manifest is explicitly out of scope here — that's Phase 2's planned Monaco YAML *editor*, a different feature.
- It must never be extended to Secrets. A Secret's raw object contains credential material directly (unlike Pods/Services/etc., which only ever reference Secrets by name) — a Secret getting the same "just marshal the object" treatment would violate AGENTS.md's "never expose credentials" rule outright. Any future Secret-browsing feature needs its own explicit decision, not an accidental extension of this one.

No redaction is applied beyond that boundary — a Manifest shows exactly what `kubectl get <kind> <name> -o yaml` would show an operator with equivalent RBAC, since that's already the access level this feature assumes.

## Considered Options

- A generic `/resources/:kind/:namespace/:name/raw` endpoint backed by a dynamic client, covering arbitrary GVKs — rejected: introduces a second way of reaching the Kubernetes API for no current use case; every kind that needs this already has a typed `Get*` path.
- Extend the curated `*Detail` DTOs with a catch-all raw field — rejected: would make "sometimes curated, sometimes not" the shape of the same type, defeating the point of curation.
- A sibling per-kind endpoint reusing the existing typed `Get*` object, marshaled to YAML — accepted: simplest, no new Kubernetes-layer surface, and honest about being a one-off exception rather than a new pattern.
