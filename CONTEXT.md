# Klyro

A multi-cluster Kubernetes management platform: a centralized interface for exploring, monitoring, and managing Kubernetes resources across independent clusters.

## Language

**Cluster**:
A Klyro-managed record for one Kubernetes API server connection, identified by a Klyro-generated identifier independent of any kubeconfig context name. Registering the same underlying API server twice creates two separate Cluster records — Klyro does not deduplicate by server endpoint.
_Avoid_: Connection (use for the underlying config, not the record itself)

**Context**:
The kubeconfig context name associated with a Cluster's connection configuration — a label on how Klyro reaches the API server, not part of the Cluster's identity.
_Avoid_: Cluster name, cluster ID

**Connection Status**:
Whether Klyro can currently reach a Cluster's API server (e.g. connected, unreachable, error). A precondition for Health — an unreachable Cluster has no meaningful Health signal.
_Avoid_: Health, state

**Health**:
An aggregate signal of what's happening inside a reachable Cluster (node readiness, pod failures, etc.), rendered as the dashboard's three reserved status colors: green (all Nodes Ready, no Workload below desired replicas), amber (degraded but nothing fully down — e.g. a Node NotReady or a Workload under-replicated but not at zero), red (something is actually failing — e.g. a Workload at zero ready replicas, or enough NotReady Nodes to not trust the Cluster). An unreachable Cluster also shows red, regardless of its last-known internal state.
_Avoid_: Status, connection status

**Resource**:
Any Kubernetes object Klyro exposes within a Cluster. Splits into two subtypes with different identity and scoping:

- **Namespace-scoped Resource**: identified by namespace + name; scoped to one Namespace. Pods, Deployments, StatefulSets, DaemonSets, Services, Ingresses/Routes, and Events are all Namespace-scoped Resources.
- **Cluster-scoped Resource**: identified by name alone; scoped to the whole Cluster, not any Namespace. Nodes and Namespaces are both Cluster-scoped Resources.
_Avoid_: Object, entity (for the general term); treating Nodes or Namespaces as namespace-scoped

**Namespace**:
A Cluster-scoped Resource that also acts as the scoping boundary Namespace-scoped Resources are filtered by. Not a separate top-level concept from Resource — just a Cluster-scoped Resource with a second role.
_Avoid_: Treating Namespace as distinct from Resource

**Resource Identity**:
Cluster is always the outermost component of a Resource's identity: `(Cluster, Namespace, Name)` for a Namespace-scoped Resource, `(Cluster, Name)` for a Cluster-scoped one. Klyro never correlates or deduplicates same-named resources across two different Clusters — identically-named namespaces or pods on separate Clusters are always distinct Resources.
_Avoid_: Treating (Namespace, Name) alone as a sufficient key

**Resource Update**:
A watch-driven SSE message with a kind (Added / Modified / Deleted) and the affected Resource, pushed to the frontend when a Kubernetes watch fires. Distinct from Event (the k8s Event API object) — "Event" always means the logged k8s object, never the live push notification.
_Avoid_: Event, watch event (for this concept — "Event" is reserved for the k8s Event Resource)

**Workload**:
A Namespace-scoped Resource that owns a Pod template and supports scale and restart: Deployment, StatefulSet, or DaemonSet. Bare Pods are not Workloads — they have no replica count or rollout semantics, so "restart" doesn't apply to them the same way.
_Avoid_: Using "workload" to include Pods

**Summary**:
A Resource as exposed in a list (e.g. `PodSummary`, `WorkloadSummary`): a curated set of fields chosen for triage at a glance, never the raw Kubernetes object. The same curation principle extends to **Detail** — a richer, still-curated view of one Resource (more fields than a Summary, e.g. full container specs, conditions, labels), used when drilling into a single Resource. Neither a Summary nor a Detail is ever the raw object — that's reserved for an explicit, later YAML-viewing feature, not implied by either term.
_Avoid_: DTO, view model (use Summary/Detail, the names already used in code)

**Ingress**:
The standard Kubernetes Ingress object. "Route" (as in the roadmap's "Ingresses and Routes") is informal phrasing for the same object, not OpenShift's distinct `route.openshift.io` API — genuine OpenShift Route support is out of scope until explicitly committed.
_Avoid_: Route (as a separate resource kind)
