---
version: 1
slug: "cluster-overview-dashboard"
primary_target: "cluster overview dashboard"
related_targets: []
---

## Direction contract

THESIS: The category default a monitoring dashboard ships is a sidebar of KPI cards over a data table, read passively. Klyro's cluster overview refuses that arrangement: it is a live departure board — every connected cluster is a row that visibly flips when its state changes, read by scanning the whole roster at once, never by opening one card to find out whether it's fine.

OWN-WORLD: Dark, near-black slate ground (dark-first, per existing brand commitment). Identity/numeric fields (name, context, version, pod/node counts, last-seen) set in a tabular-figure monospace, board-row dense; labels and chrome in a workhorse UI sans (Inter). Exactly three status colors — green / amber / red — reserved only for health state, never decorative elsewhere. Hairline rules divide rows like a physical board; no card shadows, no gradients, no rounded-everything.

STORY: The operator lands, scans the roster top to bottom in under a second, spots the amber/red rows, picks one, and drops into that cluster's own scoped view (namespaces, workloads, nodes) without losing the fleet-level context — a persistent switcher always gets them back to the roster.

FIRST VIEWPORT: A full-width roster table pinned at top; a slim header bar above it holds the cluster switcher/search, no sidebar. Each row: status tag, name, context, k8s version, key resource counts, last-seen. Selecting a row scopes the page below into that cluster's detail rather than navigating away; the switcher bar stays fixed. The roster compresses to dense rows at 50+ clusters and opens into roomier spacing at 2-5, per the long-tail scale requirement.

FORM: Airport departure/gate board (IMPECCABLE'S PICK card, chosen over the assigned "fleet damage-control board" direction). seed: seed:674bcecc9097affd

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Scope note

Mode: Operate. Phase 1 scope only (read-only: cluster health, namespaces, pods/deployments/statefulsets/daemonsets, services, ingresses/routes, nodes, events) — no create/edit/delete, no logs/exec, per roadmap. Must handle 1 cluster and 50+ equally well (long-tail scale). Color strategy: Restrained (world-tinted dark neutrals + the three reserved state colors doing the real work, per mode rules — no fourth decorative accent). Fonts: Inter (UI/labels), a tabular-figure monospace (e.g. system ui-monospace stack or Geist Mono) for numeric/status columns — workhorse Operate faces, not display faces.
