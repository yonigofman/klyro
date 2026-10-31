# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two primary audiences:

- **Platform/SRE teams** running Klyro as a self-hosted internal tool to operate their org's clusters.
- **Individual developers and small teams** juggling several personal or project clusters, wanting something lighter-weight than Lens/Rancher.

## Product Purpose

Klyro is an open-source Kubernetes management platform: a centralized interface for exploring, monitoring, and managing Kubernetes resources across multiple independent clusters. Success means operators can understand and act on cluster state faster and with less friction than existing tools.

## Positioning

Three reinforcing claims, all held simultaneously:

- **UX/polish-first:** dramatically more polished and intuitive than incumbents (Lens, K9s, Rancher, OpenLens, Headlamp), at Linear/Vercel/Grafana-grade UX quality — not a generic dashboard template.
- **Multi-cluster-native:** multi-cluster support is foundational to the architecture, not bolted on.
- **Open-source, self-hostable alternative:** no vendor lock-in, positioned against commercial platforms (Rancher, Lens Pro).

## Operating Context

Operators connect one or more independent Kubernetes clusters (different contexts/versions) and work across namespace-scoped resources: pods, deployments, statefulsets, daemonsets, services, ingresses/routes, nodes, events. Live resource state matters — watches/SSE drive real-time updates rather than polling. Phase 2+ adds direct resource mutation (create/edit/delete, YAML editing, logs, exec/terminal, scaling, restarts), so authorization and RBAC are operationally load-bearing, not cosmetic.

## Capabilities and Constraints

- Frontend must never talk to Kubernetes API servers directly; all cluster access goes through the Go backend's Kubernetes integration layer.
- Kubeconfig contents, certificates, and credentials must never be exposed through API responses or the browser.
- Must respect Kubernetes RBAC — the UI cannot assume more permission than the underlying service account has.
- Dark-first interface, shadcn/ui-based design system (see `AGENTS.md` for the full stack and conventions).

## Brand Commitments

Name "Klyro" is fixed. No logo, color system, or other visual assets exist yet — design has a free hand on everything else.

## Evidence on Hand

No real screenshots, testimonials, case studies, or user research exist yet. Future work must not fabricate any of these.

## Product Principles

1. Multi-cluster is a first-class concern in every feature, not an afterthought bolted onto a single-cluster mental model.
2. Never trade credential/RBAC safety for convenience — the backend is the only thing that ever touches cluster credentials.
3. Polish is the differentiator against incumbents: prefer fewer, better-finished surfaces over broad, generic-dashboard coverage.
4. Build incrementally per the Phase 1 → 2 → 3 roadmap in `AGENTS.md`; don't assume later-phase features (resource mutation, RBAC management, Helm, metrics) exist until built.

## Accessibility & Inclusion

No product-specific accessibility requirement has been established beyond standard good practice (see `AGENTS.md`: accessible labels, keyboard navigation, focus states).
