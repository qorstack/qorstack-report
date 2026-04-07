# Color & Contrast — The Kinetic Architect

## Color System Overview

The QorstackReport palette is rooted in the deep obsidian of a terminal, punctuated by electric, high-energy pulses of blue and violet. Dark mode is the primary experience. All neutrals are tinted toward blue (hue ~220) for structural cohesion.

## Color Tokens

### Dark Theme (Default)

**Surfaces (Tonal Layering):**

| Token        | Hex       | Purpose                              |
| ------------ | --------- | ------------------------------------ |
| `background` | `#0B0E14` | The Void — base canvas               |
| `content1`   | `#0D1018` | Sunken areas (code editors, footers) |
| `content2`   | `#10131A` | Low surface                          |
| `content3`   | `#1C2028` | Raised surface (cards, nav)          |
| `content4`   | `#282C36` | Highest surface                      |
| `foreground` | `#ECEDF6` | On-surface text (never pure white)   |

**Brand Colors:**

| Token                 | Hex       | Purpose                                     |
| --------------------- | --------- | ------------------------------------------- |
| `primary` (DEFAULT)   | `#85ADFF` | Electric Pulse — CTAs, highlights, focus    |
| `primary-300`         | `#3268CC` | Brand anchor blue                           |
| `primary-800`         | `#DDEAFF` | Light primary for text emphasis             |
| `secondary` (DEFAULT) | `#C8D8F3` | Steel — secondary info, subtle accents      |
| `secondary-800`       | `#F0F4FC` | Light secondary container                   |
| `tertiary` (DEFAULT)  | `#FBABFF` | Neon Ultraviolet — data viz, special states |
| `tertiary-800`        | `#7A3D7A` | Deep ultraviolet container                  |

**Semantic Colors:**

| Token     | Hex       | Purpose             |
| --------- | --------- | ------------------- |
| `success` | `#4ADE80` | Positive states     |
| `warning` | `#FBBF24` | Caution states      |
| `danger`  | `#F87171` | Error / destructive |

**Neutrals (Blue-tinted):**

| Token         | Hex       | Purpose               |
| ------------- | --------- | --------------------- |
| `default-50`  | `#0D1018` | Darkest neutral       |
| `default-200` | `#1C2028` | Subtle borders        |
| `default-400` | `#353A46` | Muted UI              |
| `default-600` | `#6B7285` | Secondary text        |
| `default-800` | `#B8BFD0` | Strong secondary text |
| `default-900` | `#ECEDF6` | Near-white            |

### Light Theme

**Surfaces:**

| Token        | Hex       | Purpose                      |
| ------------ | --------- | ---------------------------- |
| `background` | `#F6F8FC` | Light blue-gray canvas       |
| `content1`   | `#EEF1F8` | Base surface                 |
| `content2`   | `#E2E7F2` | Tinted light surface         |
| `content3`   | `#D5DCE9` | Raised surface               |
| `content4`   | `#C5CEDD` | Highest surface              |
| `foreground` | `#0B0E14` | Primary text (deep obsidian) |

**Brand Colors:**

| Token                 | Hex       | Purpose                           |
| --------------------- | --------- | --------------------------------- |
| `primary` (DEFAULT)   | `#4A82E8` | Strong blue for light bg contrast |
| `secondary` (DEFAULT) | `#6A90CC` | Supporting steel                  |
| `focus`               | `#4A82E8` | Focus ring = primary              |

## The No-Line Rule

**1px solid borders are prohibited for sectioning.** Use background color shifts instead.

```
Correct:  A content2 section sitting on a background surface
Incorrect: Using a gray border-b to separate header from content
```

**Ghost Border (exception):** For inputs and accessibility needs only:

```css
border: 1px solid var(--ghost-border); /* rgba(133, 173, 255, 0.20) */
```

The ghost border transitions to `1px solid primary` on focus.

## Tinted Neutrals

All neutrals carry a subtle blue tint (hue ~220). This creates cohesion with the primary palette.

```css
/* Blue-tinted neutrals (Kinetic Architect) */
--neutral-100: oklch(95% 0.01 220); /* Near-white with blue hint */
--neutral-500: oklch(50% 0.01 220); /* Mid-tone */
--neutral-900: oklch(12% 0.01 220); /* Near-black with blue hint */
```

**Never use pure gray** (`oklch(50% 0 0)`) — it has no personality and breaks cohesion.

## The 60-30-10 Rule (Kinetic Architect Application)

- **60%**: Surface backgrounds (`background`, `content1-2`) — the deep obsidian canvas
- **30%**: Neutrals and secondary text — blue-tinted grays (Steel)
- **10%**: Primary electric blue (`#85ADFF`) and tertiary ultraviolet (`#FBABFF`) — rare, impactful

The accent colors work _because_ they're rare. Overuse kills their power.

## Contrast & Accessibility

### WCAG Requirements

| Content Type                    | AA Minimum | AAA Target |
| ------------------------------- | ---------- | ---------- |
| Body text                       | 4.5:1      | 7:1        |
| Large text (18px+ or 14px bold) | 3:1        | 4.5:1      |
| UI components, icons            | 3:1        | 4.5:1      |

### Dark Mode Contrast Notes

- `foreground` (#ECEDF6) on `background` (#0B0E14) = ~15:1 ratio (passes AAA)
- `primary` (#85ADFF) on `background` (#0B0E14) = ~8:1 ratio (passes AAA)
- `default-600` (#6B7285) on `background` = ~4.5:1 (passes AA for body text)
- Ghost borders are decorative — no contrast requirement

### Dangerous Combinations to Avoid

- Light gray text on white background
- Gray text on colored backgrounds — use a shade of the background color
- Red text on green (8% of men can't distinguish)
- Thin light text on images
- Pure white (#FFFFFF) — it shatters the obsidian aesthetic

## Shadows — Blue-Tinted Ambient

Never use pure black shadows. All shadows are tinted toward primary blue:

```css
/* Tailwind config shadows */
small: '0 1px 4px 0 rgba(133, 173, 255, 0.04)'
medium: '0 2px 12px 0 rgba(133, 173, 255, 0.06)'
large: '0 4px 32px 0 rgba(133, 173, 255, 0.08)'
```

Shadows are secondary to tonal layering. Use surface color stacking as the primary depth mechanism. When a float requires a shadow, use large blur (32px) at 8% opacity — creating a "glow" effect rather than a dark drop.

## Alpha Transparency

Heavy alpha usage signals an incomplete palette. Define explicit colors for each context. Exception: ghost borders and glassmorphism on floating elements (modals, popovers, nav).

```css
/* Acceptable alpha usage */
--ghost-border: rgba(133, 173, 255, 0.2);
--ambient-glow: rgba(133, 173, 255, 0.08);
backdrop-filter: blur(20px); /* floating elements only */
```

---

**Avoid**: Pure gray. Pure white (#FFFFFF). Pure black (#000). Heavy alpha everywhere. Color as sole information carrier. Skipping color blindness testing. Circular corners (keep to 0.25rem–0.5rem).
