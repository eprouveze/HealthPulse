---
name: visualize-gaps
description: >
  Generate a single-file HTML dashboard that visualizes plan coverage gaps for stakeholders.
  Companion to the evaluate-plan skill. Use when the user says "visualize gaps", "show coverage",
  "coverage dashboard", "gap report", or "visualize coverage". Requires a completed coverage
  evaluation (from evaluate-plan) as input.
metadata:
  version: "1.0.0"
  argument-hint: <path-to-coverage-report>
  companion: evaluate-plan
---

# Visualize Gaps

Generate a stakeholder-ready HTML dashboard from a plan coverage evaluation.

**Prerequisite**: Run `/evaluate-plan` first. This skill consumes the coverage report it produces.

## Input: Finding the Coverage Data

Locate the coverage data in this order:

1. **File argument** — if the user provides a path (e.g., `visualize gaps @docs/coverage.md`)
2. **Conversation context** — if `/evaluate-plan` was run in this session, use its output directly
3. **Known file** — check for `docs/EVALplancoverage.md` in the project root
4. **Ask the user** — if none found, ask where the coverage data lives

## Output

Generate a **single self-contained HTML file** — no external dependencies.

**Default output path**: `docs/plan-coverage-dashboard.html`
If a different location is requested, use that instead.

## Audience

A product lead or VP who needs to understand in under 60 seconds:
1. How confident can I be in this plan?
2. Where are the biggest risks?
3. What needs to happen to get to full coverage?

## Required Sections

The dashboard must communicate all of the following:

### 1. Hero: Overall Coverage Score

- Large, prominent score with visual indicator (progress ring, gauge, or arc)
- Coverage composition bar: X covered / Y partial / Z missing
- Before/after arc if data exists: "Initial Plan → After Remediation → Full Alignment Target"
- **Must be above the fold** — no scrolling to find the headline

### 2. Strengths & Risks (two-column layout)

| Left Column: What's Strong | Right Column: What's at Risk |
|---|---|
| Areas at 100% or near-100% coverage | Areas with significant gaps |
| Builds stakeholder confidence | Severity indicators on each item |

### 3. Top Gaps & Why They Matter

Prioritized list of the 5-10 highest-impact gaps. Each gap includes:
- Requirement reference (PRD ID or section name)
- Severity label: `CRITICAL` / `IMPORTANT` / `DETAIL`
- One sentence: what's missing
- One sentence: what breaks or degrades without it

### 4. Coverage by Severity

Visual breakdown showing coverage for each severity tier:
- Critical requirements: X% covered (full/partial/missing breakdown)
- Important requirements: X% covered
- Detail requirements: X% covered

A plan that covers 90% of details but 60% of critical items is not a 90% plan — make this visible.

### 5. Coverage by Functional Area

Grid or table showing each major feature area with its coverage percentage.
Use progress bars and color to make it scannable at a glance.

### 6. Remediation Roadmap

Include when there are gaps to close. Show 2-4 workstreams:
- Workstream name/theme
- Which gaps it addresses (list requirement IDs)
- Estimated impact on overall coverage score

Skip this section only if coverage is already >= 95%.

### 7. Appendix: Full Gap List (collapsible)

Complete table of all requirements with coverage status.
- Default: collapsed
- Filterable or sortable by status, severity, or functional area
- For stakeholders who want to drill into specifics

## Design Specification

### Visual Style

Think: **GitHub coverage dashboard meets product brief**

### Typography & Layout
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Generous whitespace, clear section separation with subtle shadows/borders
- Responsive: desktop and tablet (mobile is bonus, not required)

### Color Palette (dark theme)

| Element | Color |
|---------|-------|
| Background | `#1a1d24` |
| Surface / cards | `#21252b` |
| Text | `#e1e4e8` |
| Covered (green) | `#28a745` |
| Partial (amber) | `#fd7e14` |
| Missing (red) | `#dc3545` |
| Secondary UI | muted blue or purple |

### Technical Constraints

- **Single HTML file** — works when opened locally or sent via email
- **Self-contained CSS** — inline `<style>` block, no external stylesheets
- **Minimal JS** — only for interactive elements (collapsible sections, filtering)
- **No frameworks, no CDN links** — pure HTML/CSS/JS
- **Professional, not flashy** — clean, tasteful, subtle transitions

## Anti-Patterns

- **Don't dump raw data without hierarchy** — this is a decision-making artifact, not a spreadsheet
- **Don't bury risks** — stakeholders must see what's missing without hunting for it
- **Don't show coverage score without severity context** — a high overall score can mask critical gaps
- **Don't skip the before/after narrative** — the improvement arc is the story stakeholders need to see
