---
status: accepted
---

# Resource detail views get a real TanStack Router route, not client state

Every drill-down in Klyro so far (cluster selection, resource tab, namespace filter) is pure Zustand client state — nothing changes the URL. Resource detail views break that pattern on purpose: each gets a real, bookmarkable route (e.g. `/clusters/$clusterId/pods/$namespace/$name`, one per resource kind). A specific Pod or Workload is something an operator plausibly wants to link to directly (share with a teammate, bookmark while debugging) — unlike "which tab is open," which has no deep-link use case. This is also the first real use of TanStack Router, already in the stack but idle until now.

## Considered Options

- Keep it as client state (another Zustand slot, no URL change) — rejected: no deep-link value, and it would make "everything is client state" the house style by default rather than a deliberate choice.
- A real route per resource kind — accepted: matches the actual use case, uses the router that's already there.
