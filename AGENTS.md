# AGENTS.md

# Klyro — AI Agent Instructions

## Project Overview

**Klyro** is a modern, open-source Kubernetes management platform designed to make operating Kubernetes clusters intuitive and accessible.

It provides a centralized interface for exploring, monitoring, and managing Kubernetes resources across multiple independent clusters.

### Product & Design Context

- Durable product truth (users, positioning, constraints, evidence) lives in `PRODUCT.md` — read it alongside this file before product or design decisions.
- Confirmed surface shapes/direction contracts live under `.impeccable/surfaces/`. The **cluster overview dashboard** has a confirmed brief and direction there (`cluster-overview-dashboard.md`, airport departure/gate-board world) — don't re-shape it from scratch; build or extend against that brief.

### Core Principles

- **Modern UX:** A polished, intuitive interface inspired by Linear, Vercel, and Grafana.
- **Multi-cluster first:** Support multiple independent Kubernetes clusters.
- **Cloud-native:** Built around Kubernetes APIs and ecosystem standards.
- **Modular architecture:** Keep features isolated and maintainable.
- **Type safety:** Use TypeScript and Go with strict typing.
- **Security first:** Never expose Kubernetes credentials or sensitive data to the browser.

---

## Technology Stack

### Frontend

- React 19
- TypeScript
- TanStack Start
- TanStack Router
- TanStack Query
- Tailwind CSS
- shadcn/ui
- Lucide React
- Zustand

### Backend

- Go
- REST API
- Kubernetes client-go
- controller-runtime (only when reconciliation functionality is needed)
- Server-Sent Events (SSE) for live updates

### Data & Infrastructure

- PostgreSQL for persistent application data.
- Redis (optional) for caching and distributed coordination.
- Docker for containerization.
- Helm for Kubernetes deployment.
- pnpm and Turborepo for monorepo management.

---

## Repository Structure

Follow this structure unless there is a strong architectural reason to change it.

```text
klyro/
├── apps/
│   └── web/
│       ├── src/
│       │   ├── routes/
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   ├── layout/
│       │   │   └── shared/
│       │   ├── features/
│       │   ├── hooks/
│       │   └── lib/
│       └── package.json
│
├── services/
│   └── api/
│       ├── cmd/
│       ├── internal/
│       │   ├── auth/
│       │   ├── clusters/
│       │   ├── kubernetes/
│       │   ├── resources/
│       │   └── streaming/
│       └── go.mod
│
├── packages/
│   └── api-client/
│
├── deploy/
│   ├── docker/
│   └── helm/
│
├── docs/
│
├── AGENTS.md
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Frontend Guidelines

### Architecture

- Organize application code by feature rather than by technical type alone.
- Keep reusable components inside `components/`.
- Keep feature-specific components, hooks, and utilities inside their respective feature directories.
- Keep API communication outside presentation components.
- Prefer composition over large, monolithic components.
- Avoid unnecessary global state.

### UI & Design System

Use **shadcn/ui** as the foundation for the design system.

Design direction:

- Dark-first interface.
- Clean, minimal layouts.
- Subtle borders and restrained shadows.
- Consistent spacing and typography.
- Neutral surfaces with carefully selected accent colors.
- Responsive layouts.
- Clear visual hierarchy.
- Smooth, subtle interactions.

Avoid:

- Excessive gradients.
- Unnecessary animations.
- Overly rounded cards everywhere.
- Excessive use of accent colors.
- Generic dashboard templates.
- Cluttered interfaces.

### Component Rules

- Reuse shadcn/ui components whenever possible.
- Extend existing components instead of creating duplicate implementations.
- Use Lucide icons consistently.
- Use Tailwind CSS for styling.
- Avoid inline styles unless necessary.
- Ensure accessible labels, keyboard navigation, and focus states.
- Use skeletons for loading states.
- Provide meaningful empty states and error states.

### Data Fetching

- Use TanStack Query for server state.
- Use Zustand only for client-side UI state when necessary.
- Avoid duplicating server state in Zustand.
- Implement proper query keys and invalidation.
- Handle loading, error, empty, and success states.
- Use SSE for resources that require real-time updates.

### Forms & Validation

- Use React Hook Form for complex forms.
- Use Zod for schema validation.
- Provide clear validation messages.
- Validate data on both frontend and backend.

---

## Backend Guidelines

### Go Architecture

- Keep application code inside `internal/`.
- Expose application entry points through `cmd/`.
- Separate HTTP handlers, business logic, and infrastructure integrations.
- Avoid unnecessary abstractions.
- Prefer small, focused packages.
- Use dependency injection where it improves testability.
- Handle errors explicitly.
- Use structured logging.

### Kubernetes Integration

Use `client-go` as the primary Kubernetes integration library.

All Kubernetes interactions must go through a dedicated Kubernetes integration layer.

The frontend must never communicate directly with Kubernetes API servers.

Support:

- Multiple independent clusters.
- Different Kubernetes contexts.
- Namespace-scoped operations.
- Resource discovery.
- Kubernetes watch APIs.
- Resource CRUD operations.
- Logs and pod exec functionality.

### Kubernetes Resource Handling

- Prefer Kubernetes API types over custom representations when possible.
- Use dynamic clients when working with arbitrary resource types.
- Respect API discovery and supported API versions.
- Handle Kubernetes API errors gracefully.
- Support pagination where appropriate.
- Avoid unnecessary API polling.
- Use watches for real-time resource updates.
- Handle expired watches and reconnect appropriately.

### Cluster Management

Treat each cluster as an independent connection.

Cluster configuration should include:

- Unique cluster identifier.
- Display name.
- Connection configuration.
- Kubernetes version.
- Connection status.
- Optional metadata.

Never expose kubeconfig contents, certificates, or credentials through API responses.

---

## API Guidelines

- Use RESTful resource-oriented endpoints.
- Version APIs under `/api/v1`.
- Return consistent JSON responses.
- Use appropriate HTTP status codes.
- Validate all incoming requests.
- Document endpoints using OpenAPI.
- Generate TypeScript API clients from the OpenAPI specification.
- Use SSE for live event streams.

Example endpoints:

```text
GET    /api/v1/clusters
POST   /api/v1/clusters
GET    /api/v1/clusters/:clusterId

GET    /api/v1/clusters/:clusterId/namespaces
GET    /api/v1/clusters/:clusterId/pods
GET    /api/v1/clusters/:clusterId/deployments

GET    /api/v1/clusters/:clusterId/events
GET    /api/v1/clusters/:clusterId/pods/:podName/logs
```

---

## Security Guidelines

Security is a core requirement, not an optional enhancement.

- Never expose Kubernetes credentials to the frontend.
- Never store secrets in source code.
- Never log credentials, tokens, or sensitive environment variables.
- Enforce authentication on protected API endpoints.
- Enforce authorization on every Kubernetes operation.
- Respect Kubernetes RBAC permissions.
- Validate and sanitize user input.
- Protect against CSRF, SSRF, and injection attacks where applicable.
- Use secure defaults for cluster connections.
- Do not disable TLS certificate verification in production.
- Avoid granting cluster-admin permissions by default.
- Use least-privilege service accounts.

Any operation that modifies or deletes Kubernetes resources must be authorized by the backend.

---

## Testing Guidelines

### Frontend

- Test important components and user interactions.
- Test form validation.
- Test API loading and error states.
- Test critical user workflows.

### Backend

- Write unit tests for business logic.
- Mock Kubernetes clients where appropriate.
- Test Kubernetes API error handling.
- Test authorization and authentication.
- Test API handlers.
- Add integration tests for important Kubernetes workflows.

Do not introduce tests that merely duplicate implementation details.

---

## Code Quality

- Use strict TypeScript.
- Avoid `any` unless absolutely necessary.
- Keep functions small and focused.
- Avoid duplicated business logic.
- Use descriptive naming.
- Prefer explicit types over implicit assumptions.
- Remove unused code and dependencies.
- Do not introduce dependencies without a clear benefit.
- Keep the application buildable after each meaningful change.

---

## Development Workflow

Before implementing a feature:

1. Understand the existing architecture.
2. Inspect relevant components and services.
3. Identify reusable functionality.
4. Consider security and authorization implications.
5. Plan the smallest maintainable implementation.

When implementing:

1. Keep changes scoped to the requested feature.
2. Follow existing project conventions.
3. Add appropriate loading, error, and empty states.
4. Add or update tests.
5. Update API documentation when necessary.

After implementation:

1. Run relevant tests.
2. Run linting and type checks.
3. Verify the build.
4. Review the final diff.
5. Report what changed and any remaining limitations.

Never claim that tests or builds passed unless they were actually executed.

---

## Product Roadmap

Klyro should evolve incrementally.

### Phase 1 — Cluster Explorer

- Cluster overview.
- Cluster health.
- Namespace management.
- Pods.
- Deployments.
- StatefulSets.
- DaemonSets.
- Services.
- Ingresses and Routes.
- Nodes.
- Events.

### Phase 2 — Resource Management

- Create, edit, and delete resources.
- YAML editor with Monaco.
- Resource details.
- Pod logs.
- Pod terminal using xterm.js.
- Scale workloads.
- Restart workloads.

### Phase 3 — Advanced Operations

- Multi-cluster dashboard.
- RBAC management.
- Helm releases.
- Metrics and resource utilization.
- Persistent volumes and claims.
- Live resource updates.
- Advanced resource discovery.

---

## Instructions for AI Coding Agents

When working on Klyro:

1. Always inspect the existing codebase before making architectural decisions.
2. Treat this document as project-wide guidance.
3. Do not assume that planned features have already been implemented.
4. Do not introduce unnecessary frameworks or dependencies.
5. Prefer simple, maintainable solutions.
6. Preserve existing functionality when modifying code.
7. Follow the established design system.
8. Keep frontend and backend responsibilities separated.
9. Consider multi-cluster support in every Kubernetes-related feature.
10. Prioritize security, accessibility, and developer experience.

**Primary goal:** Build Klyro into a polished, reliable, and extensible Kubernetes management platform with an excellent user experience.