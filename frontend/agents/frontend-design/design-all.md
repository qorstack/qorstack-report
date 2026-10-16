---
name: frontend-design
description: The "Press" design system for Qorstack Report — dark-only, black + signal red, square corners, print/document motifs. Follow it for every UI change.
---

# Press — Qorstack Report design system

Qorstack turns Word/Excel templates into PDF, DOCX and XLSX. The UI borrows from print production: paper,
crop marks, section numbers (§01), registration grids, rubber stamps. Precise, confident, easy to use.

Reference implementation: `agents/frontend-design/reference/landing-prototype.html` (static prototype of the
landing page, ported into `src/views/marketing/*`). When in doubt, match it.

## Non-negotiables

1. **Dark only.** No light mode, no theme switch. `<html class="dark">` is forced (`next-themes` `forcedTheme='dark'`).
   Never add `dark:` variants for new code — there is only one theme. Never hardcode light colors (`bg-white`, `text-black`, `#fff` surfaces) except on "paper" (document previews).
2. **Square.** Every `rounded-*` utility resolves to 0 (Tailwind config). Only `rounded-full` stays round — use it only for avatars, status dots and switch knobs. HeroUI radius is 0.
3. **One brand red, two shades** (`primary`): `#C92820` fills buttons with white text, `#F2271C` (`primary-500`) is the bright accent for active state bars, focus rings, crop marks and large display words. Never as a large background except deliberate moments (Pro plan card, hero "PDF" block, ticker band).
4. **Errors are not the brand red.** `danger` = `#FF4D6D` and always comes with an icon + text. Destructive buttons use `variant="bordered"`/`flat` danger, never the solid primary red.
5. **Accessible.** Text ≥ 4.5:1 (helper text = `text-default-500` or lighter; never `default-300/400` for text that must be read). Body text ≥ 14px; labels ≥ 12px; nothing below 11px. Real `<button>`/`<a>`; `aria-label` on icon-only buttons; visible `:focus-visible` (global red outline). Respect `prefers-reduced-motion` (global rule exists).

## Tokens (tailwind.config.ts — HeroUI theme `pressTheme`)

| Token | Value | Use |
|---|---|---|
| `background` | `#070707` | page |
| `content1` | `#101010` | sidebar, sections, panels |
| `content2` | `#171717` | cards, inputs |
| `content3` | `#202020` | hover, raised |
| `content4` | `#2A2A2A` | pressed / strongest surface |
| `foreground` / `default-900` | `#F4F1EC` | primary text (warm off-white, never pure white) |
| `default-500` | `#A9A59F` | secondary text |
| `default-400` | `#8C8882` | tertiary text / placeholders (still ≥4.5:1) |
| `default-300` | `#3A3835` | strong hairline / borders on hover |
| `default-200` / `divider` | `#2A2826` | hairlines |
| `primary` | `#C92820` (hover `primary-600` `#B0211A`) | filled buttons with white text — 5.5:1 |
| `primary-500` | `#F2271C` | bright accent: crop marks, large display words, focus ring — never behind small white text |
| `success` / `warning` / `danger` | `#3DDC84` / `#FFB020` / `#FF4D6D` | status |

Borders: 1px `border-divider` (`#2A2826`) for structure; `border-default-300` for inputs/emphasis; `border-primary` for focus/selection.
Shadows: rarely. Prefer borders and surface steps. A floating layer may use `shadow-[0_24px_60px_-24px_rgba(0,0,0,.8)]`.

## Typography

| Role | Font | Notes |
|---|---|---|
| UI + body | **Archivo** (`font-sans`, variable width) | weights 400–900 |
| Thai | **Anuphan** (`font-thai`, chained after Archivo automatically) | |
| Display | Archivo 800–900, uppercase, condensed: `font-extrabold uppercase [font-variation-settings:'wdth'_72] leading-[.88] tracking-[-0.01em]` | headings on marketing + page titles |
| Labels / code / numbers | **JetBrains Mono** (`font-mono`, `font-label`) | labels: `font-mono text-[12px] uppercase tracking-[0.16em] text-default-500` |

Scale: display 64–176px (marketing), page title 28–36px uppercase condensed, section title 18–20px uppercase, body 15–16px, small 13–14px, label 12px mono.

## Components & patterns

- **Buttons** (HeroUI `Button`, radius 0): primary = `color="primary"` solid red, uppercase semibold, letter-spacing `.04em`. Secondary = `variant="bordered"` with `border-default-300`, hover border `foreground`. Ghost/text = `variant="light"`. Heights 40 (sm) / 48 (md) / 56 (lg). One primary action per view.
- **Inputs**: `variant="bordered"`, bg `content2`, border `default-300`, focus border `primary` (+ inset 3px red left bar optional). Labels above the field (mono label style when it is a template variable such as `{{customer}}`, text-primary).
- **Cards / panels**: `bg-content1 border border-divider` (no radius, no shadow). Hover: `border-default-300` or a 3px red top bar (`before:` element). Group related cards in a shared-border grid (cells separated by 1px lines).
- **Crop marks**: wrap highlighted boxes (playground, code, terminal, empty states) with the `.crop` helper — four 12px red corner ticks.
- **Section header** (marketing): `§01 — LABEL` mono line with a 2px red top border, then a huge uppercase display title; one word in red.
- **Page header** (dashboard): breadcrumb (mono, clickable) → uppercase condensed title → one-line description → actions on the right (primary last). Same component everywhere (`PageHeader`).
- **Tabs / segmented**: square segments with 1px borders; selected = `bg-foreground text-background` or red bottom bar.
- **Chips / badges**: square, mono 11–12px uppercase. Type badges: PDF = red outline, Excel = success outline, DOCX = foreground outline.
- **Tables**: header row mono uppercase 11–12px `text-default-500`, 1px row dividers, row hover `bg-content2`.
- **Empty states**: crop-marked box, short uppercase title, one sentence, one primary button.
- **Code blocks**: bg `#050505`, border `divider`, mono 13px; keys `#FFB4AC`, strings foreground, comments `default-400`.
- **Paper** (document previews): `#FFFFFF` background, `#141414` text — the only light surface allowed.
- **Motion**: purposeful and short (150–300ms UI, ≤1s showcase). Line-by-line reveal for display titles, `opacity/translate` reveal on scroll, red underline grow on link hover. No blobs, glows orbs, glassmorphism on content, or gradient washes.

## Logo

`src/components/brand/Logo.tsx` — `LogoMark` (square Q whose tail becomes three document lines + red tab) and `Logo` (mark + QORSTACK / REPORT wordmark). App icon: `src/app/icon.svg`. Do not use `/images/logo/logo.png` anymore.

## Writing (UX copy)

Plain words over jargon: "Fields" not "Primitives", "Preview" not "Source/Result", "Replace file" not "Update Template", "Version 3" not "v3". Uppercase only for display titles, labels and buttons. English UI (Thai content must render with Anuphan).

## Dashboard (app) mode — calm, not marketing

The landing page is loud on purpose. The management UI (dashboard, builder, settings) must be CALM and easy:

1. **Red budget: one red thing per view** — the primary action (e.g. Generate, New template) and the active nav item's 3px bar. Nothing else red: no red variable names, red badges, red borders, red tabs, red section numbers, red mono labels.
2. **Variables / tokens** (`{{name}}`): mono, `text-foreground` on `bg-content2`, no red. Filled state = small `success` dot, empty = `text-default-400` text — not colored borders.
3. **Type badges** (Word/Excel/PDF): neutral — `border-default-300 text-default-500`, mono 11px. Color only via a 6px dot (red = Word/PDF, green = Excel).
4. **Case**: page titles may stay uppercase condensed (one per page, no red word). Section titles, tabs, buttons, labels inside the app: **sentence case**, Archivo 13–15px medium — not mono uppercase with letter-spacing. Mono only for keys, codes, numbers.
5. **No crop marks, no § numbers, no big display type** inside the app. Crop marks are a marketing motif.
6. **Borders**: one level (`border-divider`). Avoid boxes inside boxes; separate with spacing first, borders second.
7. **Density**: 14px body, 36–40px inputs, 16–24px gaps. Helper text `text-default-500`.

## Dark only (final)

The light theme was removed again: the site has ONE theme, dark. `<html class="dark">` is set in `app/layout.tsx`,
`next-themes` runs with `forcedTheme='dark'`, the HeroUI config only defines `pressTheme`, and there is no theme toggle.
- Use tokens (`bg-background`, `bg-content1..4`, `text-foreground`, `text-default-*`, `border-divider`, `primary`).
- Do not add `dark:` variants or light-mode styles for new code. Existing `dark:` classes are harmless leftovers.
- Paper previews (document pages) stay white `#FFFFFF` with `#141414` text — the only light surface.

## Buttons, badges, disabled (v2 review)

- **Primary button** = `color="primary"`: fill `#C92820`, white text (WCAG AA). Hover darkens (`primary-600`), never brightens.
- **Disabled primary** = neutral `#2A2A2A` fill + `#8C8882` text (global rule in globals.css) — a disabled button must not look like a dimmed main action. Save buttons are disabled until something changed (same rule on every settings page).
- **File-type badges**: `components/common/FileTypeBadge` only — neutral border + icon (file-text = Word, sheet = Excel). No red or green: red means action/error, green means success.
- **Surfaces**: page `#070707` → panel `content1` → card `content2` → raised `content3`; each step is visibly different, borders `divider`.
- **Wording**: templates are **Word** or **Excel** (the source file); outputs are PDF/DOCX (Word) or XLSX (Excel). Never "PDF template".
