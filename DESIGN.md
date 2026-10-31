---
name: Klyro
description: A multi-cluster Kubernetes management platform that reads like a live airport departure board, not a generic admin template.
colors:
  background: "#0b0e11"
  foreground: "#e5e7eb"
  card: "#0f1317"
  popover: "#0f1317"
  secondary: "#1a1f24"
  muted: "#151a1e"
  muted-foreground: "#8b97a1"
  border: "#1f252b"
  ring: "#3a4654"
  health-green: "#10b981"
  health-amber: "#f59e0b"
  health-red: "#ef4444"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
  identity:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontWeight: 400
    letterSpacing: "0em"
  subject:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "1.125rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
rounded:
  sm: "0.25rem"
  md: "0.3125rem"
  lg: "0.375rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
components:
  status-dot:
    backgroundColor: "{colors.health-green}"
    rounded: "9999px"
    size: "0.5rem"
  roster-row:
    backgroundColor: "{colors.background}"
    padding: "0.5rem 0"
  detail-header-name:
    textColor: "{colors.foreground}"
    typography: "{typography.subject}"
---

# Design System: Klyro

## Overview

**Creative North Star: "The Departure Board"**

Klyro's confirmed direction (see `.impeccable/surfaces/cluster-overview-dashboard.md`) refuses the category default a Kubernetes dashboard always ships: a sidebar of KPI cards over a passive data table. Instead, every connected Cluster is a row on a live departure board, scanned top to bottom in under a second, with state changes that visibly flip into place rather than silently updating. The same restraint that makes a real departure board trustworthy — exactly the colors that carry meaning, nothing decorative — is Klyro's whole color discipline: three reserved health colors (green/amber/red) and nowhere else.

The system is dark-first, dense, and quiet by default. Its one authored motion — the flip — is reserved for state that actually changed, never scattered as decoration across unrelated UI. A screen with no state to report reads as still; a screen with state to report reads as alive.

**Key Characteristics:**
- Near-black slate ground, never pure black
- Tabular-figure monospace for every identity/numeric field; Inter for labels and prose
- Hairline row dividers do the structural work rows a card grid would otherwise need
- Exactly three reserved colors for health state, never used decoratively
- One signature motion (the flip), triggered only by real state change or first paint — never a scroll-triggered reveal or a hover flourish

## Colors

Restrained: world-tinted dark neutrals plus the three reserved state colors doing the only real color work on the page.

### Primary
- **Near-Black Slate** (`#0b0e11`, `--background`): the ground every surface sits on. Never pure black — carries a cool slate tint.
- **Pale Slate** (`#e5e7eb`, `--foreground`): primary text and the one piece of content every screen leads with — a Resource's own name.

### State (reserved — never decorative)
- **Health Green** (`#10b981`): Ready / Healthy / meets-desired-replicas. Never used for anything else.
- **Health Amber** (`#f59e0b`): Degraded / partially ready / an Unknown condition.
- **Health Red** (`#ef4444`): Down / Not Ready / zero-ready / a condition in its bad state (including inverted ones like a Node's MemoryPressure, where `True` — not `False` — is the bad reading).

### Neutral
- **Panel Slate** (`#0f1317`, `--card` / `--popover`): dialogs, the command palette, popover surfaces — one step up from the ground.
- **Raised Slate** (`#1a1f24`, `--secondary` / `--accent`): hover and selected-row backgrounds.
- **Recessed Slate** (`#151a1e`, `--muted`): the Manifest view's code-block background.
- **Cool Gray** (`#8b97a1`, `--muted-foreground`): secondary text, column headers, metadata (Age, namespace, context) — everything that isn't the thing the screen is about.
- **Hairline** (`#1f252b`, `--border`): every row divider, section rule, and the themed scrollbar thumb. Division by line weight, not by card boundary.
- **Focus Ring** (`#3a4654`, `--ring`): focus rings and text selection.

### Named Rules
**The Three-Color Rule.** Green, amber, and red exist for exactly one job — Resource health — at every scale from a single Pod's own Ready condition up to a Cluster's aggregate. They never appear as a brand accent, a decorative highlight, or a fourth meaning.

## Typography

**Body Font:** Inter (with ui-sans-serif, system-ui fallback)
**Identity/Numeric Font:** a tabular-figure monospace (system `ui-monospace` stack)

**Character:** A workhorse pairing for an Operate surface — Inter carries labels and prose at normal weight, the monospace carries anything that is data (a Resource's name, a version string, a replica count, a timestamp) so numeric columns align and identity strings read as exactly what they are: values, not prose.

### Hierarchy
- **Subject** (600 weight, 1.125rem, -0.025em tracking, monospace): a Resource Detail page's own name — the one thing on the page set larger and bolder than its surroundings, so the page's subject is legible even with the content stripped away.
- **Body** (400 weight, 0.875rem): table cell content, section text.
- **Label** (400 weight, 0.75rem, uppercase, wide tracking, `text-muted-foreground`): column headers and section titles (`STATUS`, `CONDITIONS`, `MANIFEST`).
- **Metadata** (400 weight, 0.75rem, monospace, tabular-nums, `text-muted-foreground`): Age, context, namespace — present but deliberately quieter than the subject.

### Named Rules
**The Tabular Rule.** Any field that is a count, a version, a timestamp, or an identity string sets in the monospace stack with `tabular-nums`. Prose and labels never do.

## Layout

Full-width tables, not card grids. The Cluster roster is a single table pinned at the top with no sidebar; selecting a row scopes a detail panel in below it rather than navigating away, keeping fleet-level context on screen. Density is content-aware: the roster compresses to tighter rows past 50 clusters and stays roomier below that (`rosterDensity`). Resource Detail pages stack sections in a single column, each bounded where it can grow unboundedly (Events, Manifest) to a fixed max-height with its own scroll, so one chatty Resource never pushes the rest of the page out of reach.

## Elevation & Depth

Flat by design. No shadows anywhere — depth is conveyed by the near-black-to-panel-slate ground shift (`--background` → `--card`) and by hairline rules, never by a shadow or a glow.

### Named Rules
**The No-Shadow Rule.** Every surface is flat. A raised state (hover, selection) is a background-color shift, never a shadow.

## Shapes

Small, consistent corner radius (`0.375rem` on dialogs/inputs/buttons via `--radius`) — enough to feel considered, never "rounded-everything." Tables, rows, and the Manifest code block use square corners and hairline borders instead; a radius marks an interactive control, a hairline marks a division.

## Components

### Status Dot
A filled circle (`0.5rem`, `rounded-full`) in exactly one of the three reserved health colors — the system's only recurring iconography. Appears beside a Cluster row's status, a Resource Detail page's own header (its own readiness, not an aggregate), and inline wherever a Ready/Condition/Rollout field needs the same signal a sighted operator would otherwise have to read as text.

### Flip Value (signature component)
The departure board's one authored motion (`FlipValue`, `.animate-flip-reveal` in `styles.css`): any value that just changed, or just arrived on first paint, plays a 420ms flap-settling animation (`rotateX(90deg) → -12deg overshoot → 0deg`, opacity 0.4 → 1, `cubic-bezier(0.16, 1, 0.3, 1)`) before coming to rest. Content is always synchronously present underneath — the animation never hides or delays the real value, and `prefers-reduced-motion: reduce` disables it entirely, swapping instantly. Reserved for state that changed (a Cluster's health, node/pod counts, connection status) and the roster's own first-paint reveal, staggered per row (40ms apart, capped at 400ms) so the whole board visibly "powers up" rather than popping in at once. Never applied to identity fields (name, context) that didn't change.

### Resource Table
Every tabular list (Pods, Workloads, Events, Containers, Conditions-as-rows) shares one table shell: hairline row dividers, a sticky header within any scrollable ancestor, `pr-6` column gaps dropped on the last column. No per-list reimplementation.

### Collapsible (Manifest)
Collapsed by default, a chevron rotates 90° on open. Houses the one deliberate exception to curated data in the whole system — a Resource's raw Kubernetes object as YAML, monospaced, in the Recessed Slate code-block background.

### Command Palette
A centered modal (shadcn `Command` + `Dialog`), not a costume of a terminal command line — standard web dialog chrome, grouped results by Resource kind, plain substring filtering (no fuzzy scoring).

## Do's and Don'ts

### Do:
- **Do** reserve green/amber/red for health state only, at any zoom level from one Pod's own condition up to a Cluster's aggregate.
- **Do** set every identity/numeric value in the monospace stack with `tabular-nums`.
- **Do** play the flip motion only on real state change or first paint — never as a decorative entrance on static content.
- **Do** respect `prefers-reduced-motion: reduce` on every animation.
- **Do** keep tables and hairlines as the structural device; reach for `ResourceTable` before inventing a new list shell.

### Don't:
- **Don't** add a fourth decorative accent color. The palette is Restrained by brief, not by oversight.
- **Don't** add card shadows, gradients, or rounded-everything — flat ground-shift and hairlines carry depth instead.
- **Don't** scatter the flip motion across unrelated hovers or page transitions; it is one signature move, not a motion library.
- **Don't** build a new table/list component when `ResourceTable` already does the job.
- **Don't** let the command palette, or any future control, read as a costume of a terminal — it's a standard web dialog with standard web controls.
