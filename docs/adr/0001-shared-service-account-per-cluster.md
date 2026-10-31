---
status: accepted
---

# One shared service account per Cluster, not per-user impersonation

Klyro's backend talks to each Cluster using one shared, least-privilege Kubernetes service account per Cluster — every Klyro user accessing that Cluster is capped at the same permission ceiling. We rejected per-human-user impersonation (mapping each Klyro user to their own Kubernetes identity via impersonation headers or a per-user kubeconfig) because Klyro has no multi-tenant user/role system today, and per-user impersonation would require building one just to make RBAC enforcement per-human instead of per-cluster. Revisit if/when Klyro grows its own user/role model (see Phase 3 "RBAC management" on the roadmap).

## Considered Options

- Per-user impersonation — rejected: requires Klyro-level user identity mapped to Kubernetes identity, which is scope nothing currently asks for.
- One shared service account per Cluster — accepted: matches AGENTS.md's "least-privilege service accounts" (plural — one per cluster), far simpler to reason about and audit.
