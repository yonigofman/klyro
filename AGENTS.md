# Klyro — Agent Instructions

You are an engineering agent working on **Klyro**, an open-source, AI-native Kubernetes and OpenShift management platform.

This document defines the project's engineering principles, architectural constraints, development workflow, and quality standards.

These instructions apply to all agents working in this repository.

---

# 1. Product Overview

Klyro is an AI-native infrastructure management platform for Kubernetes and OpenShift.

Its core philosophy:

> An AI workspace that happens to manage infrastructure, not a traditional infrastructure dashboard with a chatbot bolted onto it.

Klyro enables engineers to:

- Investigate infrastructure using natural language.
- Manage multiple Kubernetes and OpenShift clusters.
- Explore Kubernetes resources and their relationships.
- Understand infrastructure health.
- Analyze metrics, logs, and events.
- Generate contextual interfaces through AI.
- Execute infrastructure operations through controlled approval workflows.

## Product principles

1. AI-native: AI is a fundamental part of the experience.
2. Visual-first: Infrastructure information should be presented clearly and interactively.
3. Security-first: AI must never bypass authorization.
4. Air-gap-first: The platform must work without internet access.
5. OpenShift-compatible: Respect OpenShift security constraints.
6. Modular: Build maintainable components with clear boundaries.
7. Extensible: Support future integrations and AI providers without redesigning the platform.

---

# 2. Source of Truth

Before implementing anything, inspect the existing repository and documentation.

Use this priority order:

1. Explicit instructions in this file.
2. Approved Architecture Decision Records (ADRs).
3. Architecture documentation in `docs/architecture/`.
4. Product requirements in `docs/product/`.
5. Approved design system and design specifications.
6. Existing implementation and established conventions.

If two sources conflict, do not silently choose one. Explain the conflict and request clarification when it affects an important architectural decision.

Never invent missing requirements.

## Documentation structure

Expected documentation organization:

- `docs/product/` — Product vision and principles.
- `docs/architecture/` — System architecture.
- `docs/architecture/decisions/` — ADRs.
- `docs/design/` — Design system and UX specifications.
- `docs/development/` — Development and testing guidelines.
- `docs/plans/` — Roadmap and implementation plans.

The actual repository may evolve. Do not create duplicate documents if equivalent documentation already exists.

---

# 3. Technology Stack

Follow the established architecture.

## Frontend

- TanStack Start
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide icons
- pnpm
- Turborepo

## Backend

- Go
- Modular monolith architecture
- REST APIs
- Server-Sent Events for AI streaming
- PostgreSQL
- OpenAPI contracts

## Kubernetes Agent

- Go
- Kubernetes client-go
- Dynamic Kubernetes client for CRDs
- gRPC bidirectional streaming
- mTLS authentication

## Generative UI

- OpenUI Lang
- Typed component catalog
- Validated component schemas
- React-based renderer

## Deployment

- Helm
- Kubernetes
- OpenShift
- Offline-compatible container images and dependencies

Do not introduce alternative frameworks or technologies without a concrete technical justification.

---

# 4. Design System Rules

The Klyro design system has already been designed and approved.

It is the single source of truth for the application's visual identity.

Before implementing or modifying UI components, inspect the existing design system and its implementation.

## Mandatory rules

- Reuse existing design tokens.
- Reuse existing components and variants.
- Follow the established typography scale.
- Follow the established spacing system.
- Use existing semantic colors.
- Follow established border, radius, and elevation conventions.
- Use the existing iconography conventions.
- Preserve dark and light theme support.
- Maintain visual consistency across screens.

Never independently invent:
- New color palettes.
- New typography systems.
- Arbitrary spacing values.
- Unnecessary component variants.
- Different visual styles for individual features.

If a required component does not exist, extend the design system consistently.

## Design implementation

Prefer:
- Reusable React components.
- Composable primitives.
- CSS variables for design tokens.
- Tailwind utilities mapped to the established tokens.
- Accessible interactions.
- Consistent loading, empty, error, and disabled states.

Do not implement one-off styling when an existing component or token can be reused.

## Visual quality

Klyro should feel like a premium, modern infrastructure workspace.

Avoid:
- Generic SaaS dashboard aesthetics.
- Unnecessary gradients.
- Excessive glassmorphism.
- Excessive rounded cards.
- Decorative elements without purpose.
- Repetitive metric cards.
- Inconsistent spacing.
- Generic chatbot layouts.

The AI Workspace is the flagship experience.

Its generated infrastructure interfaces must feel native to Klyro.

---

# 5. Architecture Rules

## Backend architecture

Use a modular monolith.

Keep domain boundaries clear.

Expected modules include:

- Identity
- Authorization
- Clusters
- Resources
- Workspaces
- AI orchestration
- AI providers
- AI tools
- Operations
- Approvals
- Audit
- Integrations
- Persistence

Do not introduce microservices without a measurable architectural need.

## Cluster connectivity

The web application must never communicate directly with Kubernetes clusters.

All cluster access goes through the backend and the corresponding cluster agent.

The agent establishes an outbound authenticated connection to the control plane.

Use gRPC bidirectional streaming over HTTP/2 with mTLS.

The agent must not make AI decisions.

## Agent responsibilities

The agent is responsible for:

- Cluster registration.
- Connection management.
- Resource discovery.
- Resource reads.
- Watch and informer management.
- Executing explicitly authorized operations.
- Reporting health and capabilities.

Use narrowly scoped Kubernetes RBAC.

Do not assume cluster-admin permissions.

Support OpenShift security constraints.

## AI orchestration

The AI system must:

- Use provider-independent interfaces.
- Support local inference.
- Separate investigation from mutation.
- Use registered tools.
- Validate tool inputs.
- Check user authorization before executing tools.
- Sanitize sensitive information.
- Stream responses and generated UI.

AI confidence is never authorization.

## Generative UI

Use OpenUI Lang with a typed and validated component catalog.

Never allow arbitrary generated JavaScript or HTML.

Generated UI must only use registered components.

The model may compose interfaces but must not bypass backend authorization or access Kubernetes directly.

Persist validated UI specifications and their versions.

---

# 6. Security Requirements

Security is a fundamental architectural requirement.

Never:

- Expose cluster credentials to the browser.
- Give AI unrestricted Kubernetes access.
- Execute arbitrary shell commands from AI requests.
- Allow unrestricted Kubernetes patches.
- Bypass authorization checks.
- Trust model-generated permission decisions.
- Expose Kubernetes Secrets to AI context by default.
- Execute mutations without the required approval workflow.

Every infrastructure operation must follow the established operation lifecycle.

Typical lifecycle:

PROPOSED → VALIDATING → AWAITING_APPROVAL → APPROVED → EXECUTING → SUCCEEDED / FAILED

Revalidate authorization before execution.

The backend must enforce user permissions.

The Kubernetes agent must independently operate within its ServiceAccount RBAC.

Record important operations in the audit trail.

---

# 7. Coding Standards

## General

- Write clean, readable, maintainable code.
- Prefer simple solutions over unnecessary abstractions.
- Follow existing naming conventions.
- Keep modules focused.
- Avoid duplicated business logic.
- Handle errors explicitly.
- Avoid unnecessary dependencies.
- Do not leave unfinished TODOs without documenting them.
- Do not silently change public interfaces.

## TypeScript

- Use strict TypeScript.
- Avoid `any`.
- Prefer explicit interfaces and types.
- Validate external data.
- Keep components focused.
- Extract reusable logic when appropriate.
- Follow existing React conventions.

## React

- Prefer composable components.
- Separate UI from business logic.
- Avoid oversized components.
- Use hooks appropriately.
- Handle loading, error, and empty states.
- Preserve accessibility and keyboard navigation.

## Go

- Follow standard Go conventions.
- Use context propagation.
- Handle errors explicitly.
- Avoid unnecessary global state.
- Keep packages cohesive.
- Write unit tests for business logic.
- Use interfaces at meaningful boundaries.

## Kubernetes

- Prefer typed clients for standard resources.
- Use dynamic clients where necessary.
- Respect Kubernetes API semantics.
- Handle resource versions and conflicts.
- Use informer caches appropriately.
- Never assume a resource exists.
- Respect namespace and cluster scope.

---

# 8. Development Workflow

Every task must follow this workflow.

## Step 1 — Understand

Before making changes:

1. Read relevant architecture documentation.
2. Inspect existing implementation.
3. Identify affected modules.
4. Identify dependencies.
5. Identify relevant tests.
6. Understand acceptance criteria.

Do not start coding based only on a vague task description.

## Step 2 — Plan

For non-trivial tasks, present an implementation plan containing:

- Objective.
- Scope.
- Files and modules affected.
- Technical approach.
- API or schema changes.
- Security implications.
- Testing strategy.
- Acceptance criteria.

Wait for approval before major architectural changes.

Small, clearly scoped tasks may proceed without a separate approval cycle.

## Step 3 — Implement

- Work on one coherent feature at a time.
- Follow established architecture.
- Reuse existing components.
- Keep changes scoped.
- Avoid unrelated refactoring.
- Do not modify unrelated files.

## Step 4 — Verify

Run all relevant checks:

- Formatting.
- Linting.
- Type checking.
- Unit tests.
- Integration tests where applicable.
- Build verification.

For UI work, visually compare the implementation against the approved design references.

Never claim something works without verification.

## Step 5 — Review

Review the resulting changes for:

- Correctness.
- Security.
- Maintainability.
- Performance.
- Accessibility.
- Design consistency.
- Regression risks.

Use an independent reviewer for security-sensitive and architecturally significant changes.

## Step 6 — Document

Update relevant documentation when:

- Architecture changes.
- Public APIs change.
- Data models change.
- New dependencies are introduced.
- Development procedures change.
- New architectural decisions are made.

Create or update an ADR for significant architectural changes.

## Step 7 — Report

At completion, summarize:

1. What was implemented.
2. Important files changed.
3. Tests and checks performed.
4. Verification results.
5. Known limitations.
6. Suggested next task.

---

# 9. Testing Requirements

Tests are part of implementation, not an optional follow-up.

## Frontend

- Component tests.
- Interaction tests.
- Theme tests.
- Accessibility checks.
- Visual regression tests where available.
- End-to-end tests for critical workflows.

## Backend

- Unit tests.
- API tests.
- Authorization tests.
- Database integration tests.
- AI orchestration tests.

## Agent

- Kubernetes client tests.
- RBAC behavior tests.
- gRPC contract tests.
- Reconnection tests.
- Operation execution tests.
- OpenShift compatibility tests.

## Critical scenarios

Always consider:

- Agent disconnect and reconnect.
- Cluster unavailable.
- Unauthorized user actions.
- Permission changes after approval.
- Invalid generated UI components.
- Inference provider unavailable.
- Malformed resource data.
- Internet-disabled deployment.

---

# 10. AI Agent Delegation

Use specialized agents when work can be independently delegated.

Suggested responsibilities:

- `frontend-engineer`: React, TanStack, design system, generated UI.
- `backend-engineer`: Go APIs, persistence, AI orchestration.
- `kubernetes-engineer`: client-go, agent, RBAC, OpenShift.
- `code-reviewer`: Independent review, correctness, security, maintainability.

## Delegation rules

- Assign clear ownership of files and modules.
- Avoid multiple agents editing the same files.
- Define interfaces before parallel implementation.
- Require test results from delegated work.
- Review all delegated changes before integration.
- Do not delegate major architectural decisions without human approval.

The main development agent is responsible for integration and consistency.

---

# 11. Git and Change Management

- Keep changes focused.
- Use descriptive branch names.
- Write meaningful commit messages.
- Do not commit secrets.
- Do not commit generated build artifacts unless required.
- Avoid unnecessary dependency updates.
- Keep the main branch buildable.

Suggested branch convention:

- `feat/feature-name`
- `fix/bug-name`
- `refactor/module-name`
- `docs/document-name`
- `test/test-name`

Do not push, merge, or release without explicit authorization when the workflow requires human approval.

---

# 12. Important Product Boundaries

The following architectural principles must not be violated:

1. The browser never connects directly to Kubernetes.
2. The agent does not make AI decisions.
3. The AI does not have unrestricted infrastructure access.
4. Investigation and mutation are separate workflows.
5. Every mutation is typed, authorized, and auditable.
6. Klyro platform administrators are not automatically Kubernetes cluster administrators.
7. Generated UI is restricted to the registered component catalog.
8. Traditional infrastructure management must continue working when AI is unavailable.
9. The platform must remain compatible with air-gapped installations.
10. OpenShift compatibility must be considered in infrastructure-related implementation.

---

# 13. Current Development Priorities

Follow the roadmap in `docs/plans/`.

The initial development priorities are:

1. Repository and development foundation.
2. Design system implementation.
3. Application shell.
4. AI Workspace UI with mocked infrastructure data.
5. Cluster agent connectivity.
6. Kubernetes resource exploration.
7. Generative UI renderer.
8. AI investigation workflow.
9. Safe infrastructure operations.
10. Air-gap production readiness.

Do not skip foundational work to implement advanced functionality prematurely.

---

# 14. Final Instruction

Act as a senior engineer responsible for building a real, production-quality open-source infrastructure platform.

Be proactive, but do not make significant product or architectural decisions without justification.

Prioritize correctness, security, usability, maintainability, and visual quality.

Build Klyro incrementally.

Every implementation should move the project toward a working, demonstrable product.

---

## Agent skills

### Issue tracker

GitHub Issues (github.com/yonigofman/klyro), via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default 5-role vocabulary, used as-is. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/architecture/decisions/` at repo root. See `docs/agents/domain.md`.


## Technology Stack

The following technologies are the approved stack for Klyro. Do not introduce alternatives, replace frameworks, or add major dependencies without explicit approval.

### Frontend

- **Language:** TypeScript (strict mode)
- **Framework:** React
- **Application framework:** TanStack Start
- **Routing:** TanStack Router (through TanStack Start)
- **Styling:** Tailwind CSS
- **UI primitives:** shadcn/ui and Radix UI
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod
- **Server state:** TanStack Query
- **Local state:** React state and context; use Zustand only when shared client state genuinely requires it.
- **Testing:** Vitest, React Testing Library, Playwright

Rules:
- Follow the approved Klyro design system as the source of truth.
- Do not introduce another component library.
- Do not use arbitrary CSS values when an existing design token is available.
- Keep components reusable, accessible, and composable.
- Do not use `any` unless explicitly justified.

### Backend

- **Language:** Go
- **Architecture:** Modular monolith
- **API:** REST with OpenAPI specifications
- **Streaming:** Server-Sent Events (SSE) for AI responses
- **Internal communication:** gRPC where appropriate
- **Database:** PostgreSQL
- **Database migrations:** Version-controlled SQL migrations
- **Validation:** Explicit request and domain validation
- **Logging:** Structured logging
- **Testing:** Go testing package and integration tests

Rules:
- Keep domain modules independent and clearly separated.
- Do not introduce microservices without an architectural decision.
- Keep business logic outside HTTP handlers.
- Define API contracts before implementing dependent frontend/backend features.

### Kubernetes Agent

- **Language:** Go
- **Kubernetes SDK:** client-go
- **Dynamic resources:** Kubernetes dynamic client
- **Communication:** Bidirectional gRPC stream over HTTP/2
- **Authentication:** Mutual TLS (mTLS)
- **Deployment:** Kubernetes Deployment with a dedicated ServiceAccount

Rules:
- Use Kubernetes-native APIs.
- Follow least-privilege RBAC.
- Do not require cluster-admin.
- Do not execute arbitrary shell commands.
- Do not expose unrestricted Kubernetes API access to the AI layer.
- Separate observation, authorization, and execution.

### AI and Generative UI

- **AI orchestration:** Go backend
- **Model integration:** Provider-independent abstraction
- **Supported model interfaces:** OpenAI-compatible APIs, Ollama, vLLM
- **Generative UI:** OpenUI Lang
- **UI rendering:** Approved React component catalog
- **Schema validation:** Zod on the frontend; generated JSON Schema/manifest for backend validation

Rules:
- Never assume a specific AI provider.
- Never allow models to execute arbitrary code or shell commands.
- All tools must be explicitly registered and typed.
- Validate every generated UI specification before rendering.
- AI-generated interfaces must use approved Klyro components.
- AI must not bypass backend authorization.

### Database

- PostgreSQL is the primary persistent database.
- Use SQL migrations.
- Use JSONB only for genuinely flexible or schema-versioned data.
- Include organization scoping from the beginning.
- Do not use PostgreSQL as a replacement for Kubernetes resource state.

### Monorepo and Tooling

- **Package manager:** pnpm
- **Build orchestration:** Turborepo
- **Frontend linting:** ESLint
- **Frontend formatting:** Prettier
- **Go formatting:** gofmt
- **Go linting:** golangci-lint
- **CI:** GitHub Actions
- **Container images:** OCI-compatible images
- **Deployment:** Helm

### Dependency Policy

- Prefer established, maintained libraries.
- Avoid unnecessary dependencies.
- Do not add a dependency for functionality that can be implemented simply with the existing stack.
- Check compatibility with air-gapped environments.
- Pin and manage dependency versions.
- Do not introduce dependencies requiring runtime access to public CDNs or registries.

### Architectural Constraints

- The browser must never communicate directly with Kubernetes clusters.
- The control plane must not require unrestricted cluster credentials.
- The cluster agent must not make AI decisions.
- The AI layer must not bypass authorization or approval workflows.
- The system must support Kubernetes and OpenShift.
- All core functionality must be designed for air-gapped deployment.