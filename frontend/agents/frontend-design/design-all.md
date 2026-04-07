---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces following "The Kinetic Architect" design system. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications. Generates creative, polished code that avoids generic AI aesthetics.
license: Apache 2.0. Based on Anthropic's frontend-design skill. See NOTICE.md for attribution.
---

This skill guides creation of distinctive, production-grade frontend interfaces following **"The Kinetic Architect"** design system — engineered for high-performance developer environments. The UI is treated as a 3D architectural space rather than a flat screen. Inspired by CAD software precision and terminal depth, the system prioritizes structural clarity, intentional asymmetry, and a mechanical premium feel.

## Design Context — QorstackReport

- **Target audience**: Developers building report/document generation systems
- **Use cases**: PDF generation, invoice creation, report automation
- **Brand personality**: Premium developer tool — clever, agile, technically superior
- **Creative direction**: "The Kinetic Architect" — tonal offsets, electric blue pulses on deep obsidian, precision engineering

---

## The Kinetic Architect Design System

### Color Philosophy

The palette is rooted in the deep obsidian of a terminal, punctuated by electric, high-energy pulses of blue and violet. See [color reference](reference/color-and-contrast.md) for full token list.

**Core tokens (Dark — default):**
| Token | Value | Purpose |
|-------|-------|---------|
| `background` | `#0B0E14` | The Void — base canvas |
| `foreground` | `#ECEDF6` | On-surface text (never pure white) |
| `primary` | `#85ADFF` | Electric Pulse — CTAs, highlights |
| `secondary` | `#C8D8F3` | Steel — secondary info, subtle accents |
| `tertiary` | `#FBABFF` | Neon Ultraviolet — data viz, special states |
| `content1` | `#0D1018` | Surface lowest (sunken areas) |
| `content2` | `#10131A` | Surface low |
| `content3` | `#1C2028` | Surface high (cards, nav) |
| `content4` | `#282C36` | Surface highest |

**Core tokens (Light):**
| Token | Value | Purpose |
|-------|-------|---------|
| `background` | `#F6F8FC` | Light blue-gray canvas |
| `foreground` | `#0B0E14` | Deep obsidian text |
| `primary` | `#4A82E8` | Stronger blue for light backgrounds |
| `content1-4` | `#EEF1F8` → `#C5CEDD` | Blue-tinted surface scale |

### The "No-Line" Rule

**Strict Mandate: 1px solid borders are prohibited for sectioning.** Structural boundaries must be defined solely through background shifts (tonal layering). The eye should perceive depth through color value transitions, not "boxes."

- _Correct:_ A `content2` section on a `background` surface
- _Incorrect:_ Using a gray line to separate header from content

**Exception — "Ghost Border":** For inputs and accessibility needs, use `var(--ghost-border)` — `outline-variant` (#45484F) at 20% opacity. It creates a "suggestion" of a boundary that doesn't disrupt the architectural flow.

### Typography — Two-Font Stack (Technical Authority)

| Role                   | Font                                             | Use                                                                                     |
| ---------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **Display & Headline** | Space Grotesk (`font-headline`)                  | Hero statements, section titles. "Architectural beams." Tight letter-spacing (-0.02em). |
| **Body & Utility**     | Inter (`font-sans`)                              | Documentation, functional data, long-form text. Neutral, high-readability.              |
| **Labels**             | Space Grotesk (`font-label`)                     | All-caps with 0.05em letter-spacing to mimic technical blueprints.                      |
| **Thai**               | Prompt / Sarabun (`font-prompt`, `font-sarabun`) | Thai language support                                                                   |

### Elevation — Tonal Layering

Depth is "material density," not shadow. Stack surfaces to create hierarchy of focus:

| Layer                | Token                          | Use                            |
| -------------------- | ------------------------------ | ------------------------------ |
| Level 0 (Foundation) | `background` / `surface`       | Main workspace                 |
| Level 1 (Site)       | `content2` / `surface-low`     | Sidebars, secondary navigation |
| Level 2 (Component)  | `content3` / `surface-high`    | Cards, code editors            |
| Level 3 (Float)      | `content4` / `surface-highest` | Tooltips, active popovers      |

**Ambient Shadows:** When elements must float, use large blur (32px) at 8% opacity. Shadow color must be tinted toward blue (`--ambient-glow`), creating a "glow" effect rather than a dark drop.

### Glassmorphism — Floating Elements Only

Use `surface-container` at 60% opacity with `backdrop-blur(20px)` for floating navigation bars and modals to allow the "void" to bleed through.

**DO NOT** apply glassmorphism to cards, sections, or static content.

### Buttons (Kinetic Style)

| Type          | Style                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| **Primary**   | Gradient fill (primary → primary-container at 135deg), `on-primary` text, `rounded-sm` (0.25rem). No border. |
| **Secondary** | Ghost style. Transparent bg, ghost border (20% opacity outline), primary text.                               |
| **Tertiary**  | No background or border. `label-md` typography in `secondary`.                                               |

### Input Fields (Terminal Style)

- **Surface:** `surface-container-lowest` (#000000)
- **Indicator:** Instead of full-box focus, use a 2px vertical "power bar" on left edge in `primary` when active
- **Corner:** Sharp `rounded-sm`

### Cards & Lists (The Block Method)

- **Strict Rule:** No dividers. Use `spacing-6` (1.3rem) of vertical whitespace to separate items.
- **Interaction:** On hover, shift from `surface-high` to `surface-highest`.

---

## Frontend Aesthetics Guidelines

### Typography

> _Consult [typography reference](reference/typography.md) for scales, pairing, and loading strategies._

**DO**: Use Space Grotesk for headlines with fluid `clamp()` sizing and tight letter-spacing (-0.02em)
**DO**: Use Inter for body with clear weight hierarchy (400 body, 600 emphasis, 700 headings)
**DO**: Use Space Grotesk all-caps for labels with 0.05em tracking (mimic technical blueprints)
**DO**: Use mono-spacing for any numerical or code-related data
**DON'T**: Mix more than 2 font families in a single view (plus Thai fallback)
**DON'T**: Put large icons with rounded corners above every heading

### Color & Theme

> _Consult [color reference](reference/color-and-contrast.md) for palette tokens and dark mode rules._

**DO**: Use tonal layering for depth — shift background colors, not add borders
**DO**: Tint all neutrals toward blue (hue ~220)
**DO**: Use `tertiary` (neon ultraviolet) sparingly for data visualization or special states
**DON'T**: Use pure white (#FFFFFF) — it shatters the obsidian aesthetic. Use `on-surface` (#ECEDF6)
**DON'T**: Use 1px solid borders to separate sections — use background shifts
**DON'T**: Use gray text on colored backgrounds — use a shade of the background color

### Layout & Space

> _Consult [spatial reference](reference/spatial-design.md) for grids, rhythm, and container queries._

**DO**: Embrace asymmetry — align header far left, primary action to non-standard grid position
**DO**: Use `6rem` (96px) spacing for section breaks to let editorial typography breathe
**DO**: Use fluid spacing with `clamp()` on larger screens
**DO**: Let content drive the architecture — avoid making every card same height/width
**DON'T**: Wrap everything in bordered cards — use tonal layering instead
**DON'T**: Nest cards inside cards
**DON'T**: Use flat grids with identical card sizing

### Visual Details

**DO**: Use intentional decorative elements reinforcing the "Architect" brand
**DO**: Use `backdrop-blur` on navigation to create depth
**DO**: Layer surfaces like dark slate stacked on top of each other
**DON'T**: Use glassmorphism on non-floating elements
**DON'T**: Use thick colored borders — use ghost borders or tonal shifts
**DON'T**: Use circular corners (except status indicators). Stay within `rounded-sm` (0.25rem) to `rounded-lg` (0.5rem) for "high-tech" edge
**DON'T**: Clutter the UI with icons — rely on typography scale for hierarchy

### Motion

> _Consult [motion reference](reference/motion-design.md) for timing, easing, and reduced motion._

**DO**: Focus on high-impact entrance moments with staggered reveals
**DO**: Use exponential easing (`ease-out-quart`/`expo`) for natural deceleration
**DO**: Use subtle surface tone shifts for hover states — no standard ripples
**DON'T**: Animate layout properties — use `transform` and `opacity` only
**DON'T**: Use bounce/elastic easing

### Interaction

> _Consult [interaction reference](reference/interaction-design.md) for forms, focus, and loading patterns._

**DO**: Use progressive disclosure
**DO**: Design empty states that teach
**DO**: Hover states = gentle surface tone shift or subtle glow (bloom) on icons
**DON'T**: Use standard Material ripples — interaction should be subtle

### Responsive

> _Consult [responsive reference](reference/responsive-design.md) for mobile-first and container queries._

**DO**: Use container queries for component-level responsiveness
**DO**: Adapt interface for different contexts — don't just shrink
**DON'T**: Hide critical functionality on mobile

### UX Writing

> _Consult [ux-writing reference](reference/ux-writing.md) for labels, errors, and empty states._

**DO**: Make every word earn its place
**DON'T**: Repeat information users can already see

---

## The AI Slop Test

**Critical quality check**: If you showed this interface to someone and said "AI made this," would they believe you immediately? If yes, that's the problem.

A distinctive interface should make someone ask "how was this made?" not "which AI made this?"

**Kinetic Architect-specific anti-patterns to avoid:**

- Cyan-on-dark with neon glows (generic "hacker" aesthetic)
- Purple-to-blue gradients on everything
- Glassmorphism on every surface
- Generic card grids with identical sizing

---

## Implementation Principles

Match implementation to the Kinetic Architect vision: deep obsidian depth through tonal layering, engineered Space Grotesk headlines, and surgical precision in spacing and hierarchy.

**Dark mode is the primary experience.** Light mode should feel equally polished — not an afterthought. Use HeroUI semantic tokens (`bg-background`, `text-foreground`, `bg-content1-4`) so both themes work automatically.

Remember: {{model}} is capable of extraordinary creative work. Commit fully to the Kinetic Architect vision — structural, mechanical, premium.
