---
version: alpha
name: letsGraph — Ink (v4.3)
description: Korean product design system for letsGraph. Near-black ink on white with an active gray scale (every Radix gray step has a job), color only for status, market up/down and AI-made content, Pretendard for text and figures (tabular numerals), shadcn/ui on Radix. Rules carry IDs, smell tags and Verify lines (Astryx-style); Hangul rules from oh-my-design.
colors:
  primary: "#202020"
  bg-page: "#ffffff"
  bg-surface: "#ffffff"
  bg-sunken: "#f9f9f9"
  bg-tonal: "#f0f0f0"
  bg-tonal-hover: "#e8e8e8"
  bg-selected: "#e0e0e0"
  bg-pressed: "#d9d9d9"
  bg-inverted: "#202020"
  overlay-hover: "#0000000f"
  overlay-pressed: "#0000001f"
  text-primary: "#202020"
  text-secondary: "#646464"
  text-disabled: "#8d8d8d"
  text-inverted: "#fcfcfc"
  text-inverted-secondary: "#bbbbbb"
  border: "#e0e0e0"
  border-emphasized: "#8d8d8d"
  border-strong: "#202020"
  accent: "#202020"
  accent-hover: "#646464"
  on-accent: "#ffffff"
  ai: "#6e56cf"
  ai-muted: "#f4f0fe"
  text-ai: "#6550b9"
  border-ai: "#c2b5f5"
  skeleton-ai: "#ebe4ff"
  success: "#30a46c"
  success-muted: "#e6f6eb"
  text-success: "#193b2d"
  warning: "#ffc53d"
  warning-muted: "#fff7c2"
  text-warning: "#4f3422"
  error: "#e5484d"
  error-muted: "#feebec"
  text-error: "#ce2c31"
  info: "#0090ff"
  info-muted: "#e6f4fe"
  text-info: "#113264"
  data-up: "#e5484d"
  data-down: "#0090ff"
  text-up: "#ce2c31"
  text-down: "#0d74ce"
  data-1: "#202020"
  data-2: "#838383"
  data-3: "#bbbbbb"
  data-track: "#f0f0f0"
  graph-canvas: "#f9f9f9"
  graph-job: "#202020"
  graph-saved: "#202020"
  graph-node: "#8d8d8d"
  graph-node-dim: "#d9d9d9"
  graph-edge: "#bbbbbb"
  graph-orbit: "#d9d9d9"
  graph-division: "#646464"
  graph-grid: "#cecece"
  skeleton: "#f0f0f0"
typography:
  display:
    fontFamily: Pretendard
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Pretendard
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: -0.02em
  heading-1:
    fontFamily: Pretendard
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.36
    letterSpacing: -0.02em
  heading-2:
    fontFamily: Pretendard
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: -0.01em
  heading-3:
    fontFamily: Pretendard
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: 0em
  body-lg:
    fontFamily: Pretendard
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em
  body:
    fontFamily: Pretendard
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  support:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  label:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0em
  label-strong:
    fontFamily: Pretendard
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0em
  caption:
    fontFamily: Pretendard
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0em
  figure-hero:
    fontFamily: Pretendard
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: -0.02em
    fontFeature: "'tnum' 1"
  figure:
    fontFamily: Pretendard
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
    fontFeature: "'tnum' 1"
  data:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0em
    fontFeature: "'tnum' 1"
  data-sm:
    fontFamily: Pretendard
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0em
    fontFeature: "'tnum' 1"
rounded:
  none: 0px
  inner: 2px
  element: 4px
  container: 6px
  tile: 16px
  sheet: 28px
  full: 9999px
spacing:
  hairline: 1px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 64px
  margin-mobile: 20px
  margin-desktop: 32px
  control-sm: 32px
  control-md: 40px
  control-lg: 48px
  touch-min: 44px
  row-height: 52px
  header-height: 56px
  tab-bar-height: 60px
  drawer-width: 360px
  side-panel-width: 240px
  floating-card-width: 364px
  content-max: 1280px
  reading-max: 720px
components:
  page:
    backgroundColor: "{colors.bg-page}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
  page-secondary-text:
    backgroundColor: "{colors.bg-page}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.support}"
  surface:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.container}"
  side-panel:
    backgroundColor: "{colors.bg-sunken}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.support}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label-strong}"
    rounded: "{rounded.element}"
    height: 40px
    padding: 16px
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
  button-secondary:
    backgroundColor: "{colors.bg-tonal}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label-strong}"
    rounded: "{rounded.element}"
    height: 40px
    padding: 16px
  button-secondary-hover:
    backgroundColor: "{colors.bg-tonal-hover}"
    textColor: "{colors.text-primary}"
  button-pressed:
    backgroundColor: "{colors.bg-pressed}"
    textColor: "{colors.text-primary}"
  button-outline:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label-strong}"
    rounded: "{rounded.element}"
    height: 40px
    padding: 16px
  chip:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.element}"
    height: 32px
    padding: 12px
  chip-selected:
    backgroundColor: "{colors.bg-selected}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label-strong}"
  nav-item-active:
    backgroundColor: "{colors.bg-selected}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label-strong}"
    rounded: "{rounded.element}"
  list-row:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label-strong}"
    rounded: "{rounded.element}"
    height: 52px
    padding: 12px
  list-row-hover:
    backgroundColor: "{colors.overlay-hover}"
  list-row-pressed:
    backgroundColor: "{colors.overlay-pressed}"
  list-row-selected:
    backgroundColor: "{colors.bg-selected}"
    textColor: "{colors.text-primary}"
  badge-neutral:
    backgroundColor: "{colors.bg-tonal}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
    rounded: "{rounded.inner}"
    height: 22px
    padding: 8px
  input:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.element}"
    height: 40px
    padding: 12px
  input-placeholder:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-secondary}"
  input-boundary:
    backgroundColor: "{colors.border-emphasized}"
    height: 1px
  text-disabled-sample:
    textColor: "{colors.text-disabled}"
    typography: "{typography.label}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  rule-strong:
    backgroundColor: "{colors.border-strong}"
    height: 1px
  focus-ring:
    backgroundColor: "{colors.accent}"
    height: 2px
  trust-label-fact:
    backgroundColor: "{colors.bg-inverted}"
    textColor: "{colors.text-inverted}"
    typography: "{typography.data-sm}"
    rounded: "{rounded.inner}"
    height: 22px
    padding: 8px
  trust-label-ai:
    backgroundColor: "{colors.ai-muted}"
    textColor: "{colors.text-ai}"
    typography: "{typography.data-sm}"
    rounded: "{rounded.inner}"
    height: 22px
    padding: 8px
  trust-label-ai-edge:
    backgroundColor: "{colors.border-ai}"
    height: 1px
  ai-output-rule:
    backgroundColor: "{colors.ai}"
    padding: 3px
  agent-band:
    backgroundColor: "{colors.ai-muted}"
    textColor: "{colors.text-ai}"
    typography: "{typography.label}"
    padding: 16px
  skeleton:
    backgroundColor: "{colors.skeleton}"
    rounded: "{rounded.inner}"
    height: 12px
  skeleton-ai:
    backgroundColor: "{colors.skeleton-ai}"
    rounded: "{rounded.inner}"
    height: 12px
  toast:
    backgroundColor: "{colors.bg-inverted}"
    textColor: "{colors.text-inverted}"
    typography: "{typography.label}"
    rounded: "{rounded.element}"
    height: 44px
    padding: 16px
  toast-secondary-text:
    backgroundColor: "{colors.bg-inverted}"
    textColor: "{colors.text-inverted-secondary}"
    typography: "{typography.support}"
  avatar:
    backgroundColor: "{colors.bg-inverted}"
    textColor: "{colors.text-inverted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: 32px
  note-error:
    backgroundColor: "{colors.error-muted}"
    textColor: "{colors.text-error}"
    typography: "{typography.support}"
    rounded: "{rounded.element}"
    padding: 12px
  note-success:
    backgroundColor: "{colors.success-muted}"
    textColor: "{colors.text-success}"
    typography: "{typography.support}"
    rounded: "{rounded.element}"
    padding: 12px
  note-warning:
    backgroundColor: "{colors.warning-muted}"
    textColor: "{colors.text-warning}"
    typography: "{typography.support}"
    rounded: "{rounded.element}"
    padding: 12px
  note-info:
    backgroundColor: "{colors.info-muted}"
    textColor: "{colors.text-info}"
    typography: "{typography.support}"
    rounded: "{rounded.element}"
    padding: 12px
  status-dot-error:
    backgroundColor: "{colors.error}"
    rounded: "{rounded.full}"
    height: 8px
  status-dot-success:
    backgroundColor: "{colors.success}"
    rounded: "{rounded.full}"
    height: 8px
  status-dot-warning:
    backgroundColor: "{colors.warning}"
    rounded: "{rounded.full}"
    height: 8px
  status-dot-info:
    backgroundColor: "{colors.info}"
    rounded: "{rounded.full}"
    height: 8px
  figure-hero:
    backgroundColor: "{colors.bg-page}"
    textColor: "{colors.text-primary}"
    typography: "{typography.figure-hero}"
  delta-up:
    backgroundColor: "{colors.bg-page}"
    textColor: "{colors.text-up}"
    typography: "{typography.data}"
  delta-down:
    backgroundColor: "{colors.bg-page}"
    textColor: "{colors.text-down}"
    typography: "{typography.data}"
  chart-bar-up:
    backgroundColor: "{colors.data-up}"
    rounded: "{rounded.inner}"
  chart-bar-down:
    backgroundColor: "{colors.data-down}"
    rounded: "{rounded.inner}"
  chart-series-1:
    backgroundColor: "{colors.data-1}"
    rounded: "{rounded.inner}"
  chart-series-2:
    backgroundColor: "{colors.data-2}"
    rounded: "{rounded.inner}"
  chart-series-3:
    backgroundColor: "{colors.data-3}"
    rounded: "{rounded.inner}"
  chart-track:
    backgroundColor: "{colors.data-track}"
    rounded: "{rounded.full}"
    height: 10px
  graph-canvas:
    backgroundColor: "{colors.graph-canvas}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
  graph-job-node:
    backgroundColor: "{colors.graph-job}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    height: 52px
  graph-industry-node:
    backgroundColor: "{colors.bg-tonal}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label-strong}"
    rounded: "{rounded.full}"
    height: 32px
  graph-industry-ring:
    backgroundColor: "{colors.border-emphasized}"
    height: 1px
  graph-saved-company:
    backgroundColor: "{colors.graph-saved}"
    rounded: "{rounded.full}"
  graph-company:
    backgroundColor: "{colors.bg-surface}"
    rounded: "{rounded.full}"
  graph-company-ring:
    backgroundColor: "{colors.graph-node}"
    height: 1.5px
  graph-company-dim:
    backgroundColor: "{colors.graph-node-dim}"
    rounded: "{rounded.full}"
  graph-edge:
    backgroundColor: "{colors.graph-edge}"
    height: 1px
  graph-job-edge:
    backgroundColor: "{colors.graph-division}"
    height: 2px
  graph-grid:
    backgroundColor: "{colors.graph-grid}"
    rounded: "{rounded.full}"
    height: 1.5px
  graph-plane:
    backgroundColor: "{colors.bg-tonal}"
  floating-card:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.sheet}"
    padding: 24px
  floating-tile:
    backgroundColor: "{colors.bg-tonal}"
    textColor: "{colors.text-primary}"
    typography: "{typography.figure}"
    rounded: "{rounded.tile}"
    padding: 16px
  floating-capsule:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 4px
  graph-orbit:
    backgroundColor: "{colors.graph-orbit}"
    height: 1px
  graph-division:
    backgroundColor: "{colors.graph-division}"
    rounded: "{rounded.inner}"
    height: 12px
---

# letsGraph — DESIGN.md v4.3 "Ink"

## Overview

letsGraph helps Korean undergraduates (2nd–4th year) understand industries, companies and jobs through how money flows: a job map (직무 맵), division money structures from filings, posting analysis, experience cards and a prompt kit. The identity is **Ink**: near-black ink on white with a working gray scale. Grays are not leftovers between black and white; they carry surfaces, selection, quantity and the graph. Color appears only where it means something: status, market up/down, and AI-made content. Chosen by the user 2026-11-13 from three candidates (코발트, 잉크, 제이드); "use the mid grays actively" is a standing instruction.

Versions: v4.3 (2026-11-16) no prism; the glass lens bends only near-black content. v4.2 (2026-11-16) glass material settled — clear liquid glass with lens and gloss. v4.1 (2026-11-16) synced to the app at main 870b9c2 — 직무 맵 with circle vertices and industry icons, the floating layer family over the graph (glass material, `sheet` / `tile` radii), React Flow attribution hidden. v4 (2026-11-13) is archived in context/design-archive/.

How to read this file:
- **YAML tokens are normative values. Prose is intent.** When a value is wrong, change the token; never patch a raw value in code.
- **Rule IDs** (`COL-3`, `TYP-2`, …) are cited in reviews and lint messages. Each rule ends in a `Verify:` line anyone (or an agent) can run.
- **Smell tags** say who decides: `[auto]` a tool decides (design.md lint, @shadcn/lint, hangul check, contrast script); `[assist]` a tool flags, a human confirms; `[judge]` human judgment from a screenshot.
- **Look vs structure.** Token values (this YAML) are the look and may be retuned. Structure is fixed in code and in the Components and States sections: which role a part uses, its variants, its states. "This gray should be darker" is a token change; "badges should use another role" is a structure change.
- **Team rules that decide unclear cases:** minimize user fatigue (few words, one question per region); the user's 대표 직무 anchors every screen; every AI-made value or sentence is labelled.

Open-source foundations: Radix Colors (MIT) gray, alpha and status scales with fixed step roles; Pretendard (OFL); Lucide icons (ISC); shadcn/ui (MIT) components on Radix Primitives; Hangul rules from oh-my-design /hangul (MIT, sourced from W3C klreq, 국립국어원, KRDS, TDS, SEED and 67 measured Korean services); the AI tone idea from SEED Design (Apache-2.0); the rule format, state taxonomy and color-token grammar from Meta Astryx (MIT). Ideas are borrowed; no third-party prose or brand assets are copied.

## Colors

*Why it matters.* In a black-and-white system the eye reads hierarchy from value (light to dark) alone, so every gray must have one job. Without assigned jobs, grays drift into "slightly different light gray" everywhere and the screen goes flat; with them, a gray tells you whether something is a surface, a selection, a quantity or a boundary before you read it.

**Token grammar** (Astryx-style): `bg-<role>`, `text-<role>`, `border-<role>`; intents `accent`, `ai`, `success`, `warning`, `error`, `info` with `-muted` (pale fill) and `text-<intent>` (readable text on that fill); `on-<fill>` for content on a solid fill; `overlay-*` alpha tints; domain layers `data-*` (charts) and `graph-*` (직무 맵). `primary` is an alias of `accent` kept for the DESIGN.md linter and shadcn.

**The gray scale has jobs** (Radix gray steps, light mode):

| Step | Hex | Token(s) | Job |
|---|---|---|---|
| 1 | #FCFCFC | text-inverted | text on ink |
| 2 | #F9F9F9 | bg-sunken, graph-canvas | side panels, page bands, the graph canvas |
| 3 | #F0F0F0 | bg-tonal, skeleton, data-track | tonal buttons, wells, badges, chart tracks, loading blocks, industry vertices, the plane behind an opened industry, tiles in a floating card |
| 4 | #E8E8E8 | bg-tonal-hover | hover on tonal parts |
| 5 | #E0E0E0 | bg-selected, border | selected chip / row / nav item; dividers |
| 6 | #D9D9D9 | bg-pressed, graph-node-dim, graph-orbit | pressed; dimmed nodes; orbit rings (superseded orbit map only) |
| 7 | #CECECE | graph-grid | the graph's dot grid |
| 8 | #BBBBBB | data-3, graph-edge, text-inverted-secondary | third chart series; graph edges; secondary text on ink |
| 9 | #8D8D8D | border-emphasized, graph-node, text-disabled | input and control boundaries (3.3:1); company and industry rings; disabled text |
| 10 | #838383 | data-2 | second chart series |
| 11 | #646464 | text-secondary, accent-hover, graph-division | secondary text (5.9:1); primary hover; job→industry lines; division nodes |
| 12 | #202020 | text-primary, accent, bg-inverted, data-1, graph-job, graph-saved | ink: body text, primary action, toast, focus series, the job node, saved companies |

Alpha overlays (Radix grayA 3 / 5) tint whatever surface they sit on for hover and press.

- **COL-1 — Every gray has one job.** A gray is chosen by role from the table, never by "a bit lighter". Verify: every gray in a diff maps to a token in this table. `[auto]` via @shadcn/lint `no-raw-colors`.
- **COL-2 — Ink is scarce.** Solid ink (`accent`) marks the one primary action per region, the job node, saved companies and the focus data series. Selection uses gray (`bg-selected`), not ink. Verify: squint at a screen; at most one ink block per region besides text and the graph.
- **COL-3 — Mid grays carry structure.** Use `bg-sunken` for side panels and the graph canvas, `bg-tonal` for secondary actions, badges and wells, `bg-selected` for current items, gray-9/10/8 for data and nodes. Verify: remove all borders in a screenshot; regions are still separable by gray value alone. `[judge]`
- **COL-4 — Color only for meaning.** Hue appears only in status (`success`, `warning`, `error`, `info`), market movement (`data-up` red / `data-down` blue, Korean convention) and AI content (`ai` violet). Never decorative. Verify: every non-gray pixel answers "what does this mean?". `[assist]`
- **COL-5 — Color is never alone.** Status pairs color with an icon or word; AI pairs violet with a dashed edge and an "AI" label; up/down pairs color with ▲/▼ and a sign. Verify: in grayscale the meaning survives. `[assist]`
- **COL-6 — Fill tokens are not text tokens.** `data-up`, `data-down`, `success`, `warning`, `error`, `info`, `ai` are fills and indicators; text uses `text-up`, `text-down`, `text-<intent>`. Verify: contrast script passes for every text pair. `[auto]`
- **COL-7 — Contrast.** Text ≥ 4.5:1, control boundaries and meaningful graphics ≥ 3:1, in both modes. Verify: the contrast script (44 pairs) and `design.md lint` report no failures. `[auto]`

Smells: `[auto]` raw hex or Tailwind palette classes in components; `[auto]` text on a fill token; `[assist]` gray text on a colored fill (use `text-<intent>`); `[assist]` an opaque black hover block (use `overlay-hover`); `[judge]` three or more ink blocks competing in one region; `[judge]` violet used for anything not AI-made.

Got it right: the page reads as white, two or three gray planes and ink; the eye lands on one ink action; numbers that rise or fall carry a sign and a color; AI content is recognisable at a glance without being loud.

**Dark mode** (Radix grayDark; same jobs, values below). Ink and paper swap: page #111111, surface and sunken #191919, tonal #222222, tonal-hover #2A2A2A, selected #313131, pressed #3A3A3A, inverted #EEEEEE; overlay-hover #FFFFFF12, overlay-pressed #FFFFFF22; text-primary #EEEEEE, text-secondary #B4B4B4, text-disabled #6E6E6E, text-inverted #111111, text-inverted-secondary #606060; border #313131, border-emphasized #6E6E6E, border-strong #EEEEEE; accent #EEEEEE with on-accent #111111, accent-hover #B4B4B4; ai-muted #291F43, text-ai #BAA7FF, border-ai #56468B, skeleton-ai #33255B; success-muted #132D21 / text #3DD68C; warning-muted #302008 / text #FFCA16; error-muted #3B1219 / text #FF9592; info-muted #0D2847 / text #70B8FF; text-up #FF9592, text-down #70B8FF; data-1 #EEEEEE, data-2 #7B7B7B, data-3 #484848, data-track #2A2A2A; graph-canvas #191919, graph-job and graph-saved #EEEEEE, graph-node #7B7B7B, graph-node-dim #3A3A3A, graph-edge #606060, graph-orbit #3A3A3A, graph-division #B4B4B4, graph-grid #484848; skeleton #222222. Light is the default (projector demo); dark follows the system setting.

## Typography

*Why it matters.* Korean UI breaks in ways Latin UI does not: Latin habits (tight tracking, line-height 1, break-all, italics) make Hangul look cramped or broken. Hierarchy comes from role, weight and gray, not from many near-equal sizes.

Faces: **Pretendard** only, for all text and all figures (`"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif`). Figures, dates, D-day and step numbers use `font-variant-numeric: tabular-nums`, so columns align and units (조, 억, 원) and signs (▲ ▼) stay in the same face. No separate mono face (decided 2026-11-13; this is the Korean product norm, see context/research-fonts.md).

- **TYP-1 — Roles, not sizes.** Use the roles in the YAML: display 40 (30 on mobile), heading-1 28, heading-2 22, heading-3 18, body-lg 17 (long reading), body 16, support 14, label 14, caption 13 (skippable text only); figures in Pretendard tabular numerals (figure-hero 40/700, figure 22/600, data 14, data-sm 12). Verify: no font-size outside the roles. `[auto]`
- **TYP-2 — Body 16 / 1.5, tracking 0** (HG-3, HG-4, HG-6). Long reading 17 / 1.6. Verify: hangul check reports no HG-3/4/6. `[auto]`
- **TYP-3 — Headings ≥ 1.3 line-height, tracking no tighter than −0.03em** (HG-5, HG-7); we use −0.02em at 28 and 40, −0.01em at 22, 0 below 20. Verify: hangul check, no BLOCK. `[auto]`
- **TYP-4 — Line breaking.** `word-break: keep-all` with `overflow-wrap: anywhere` on headings, buttons, labels, chips and cards; never `break-all`; long tokens get `overflow-wrap: anywhere` (HG-8..10). Verify: hangul check. `[auto]`
- **TYP-5 — Weight and gray before size.** Within a region, one lead (heading or figure); the rest is ranked by weight (700 / 600 / 500 / 400) and by `text-primary` vs `text-secondary`. Only two text grays for content. Verify: squint test reads lead → support → groups. `[judge]`
- **TYP-6 — Numbers.** Group with `Intl.NumberFormat('ko-KR')`, attach units (`1,234억`, `3개`, `D-11`), tabular figures, one convention per screen; money in 조/억 with the basis stated nearby (e.g. "대한통운 제외") (HG-13). Verify: no mixed 원/억 conventions in one view. `[assist]`
- **TYP-7 — No italic, no synthetic weights on Hangul; load only weights the font ships** (HG-11, HG-12). `[auto]`
- **TYP-8 — Sentences stay short.** Explanations under ~40 Korean characters; reading text in a 720px column; 해요체 in product UI. `[assist]`

Smells: `[auto]` letter-spacing below −0.03em or negative tracking on body; `[auto]` line-height under 1.3 on wrapping Hangul; `[auto]` body under 14px or anything under 12px; `[assist]` adjacent steps used for the same job; `[judge]` everything bold.

Got it right: a page title, a figure, a body sentence and a caption are distinguishable at a glance; Korean wraps between words in titles and buttons; numbers line up in columns.

## Layout

*Why it matters.* Proximity tells users what belongs together before they read. Dense money data stays readable when regions are framed first and records are rows.

- **LAY-1 — Frame first.** Settle the shell and region budgets (header 56, side panel, main, drawer 360, mobile tab bar 60) before content. The 탐색 graph screen is the exception: the graph is full-bleed under the header and the controls float over it (see Elevation → Floating layers over the graph). Verify: every screen names its regions and their widths. `[judge]`
- **LAY-2 — Weakest container first.** Group with spacing, then a divider, then a section with a heading; a bordered card only for a self-contained widget (a KPI, a chart, a gallery item). Never a card inside a card. Verify: Impeccable reports no nested cards. `[auto]`
- **LAY-3 — Records are rows.** Companies, postings, episodes and kit items are rows (48–56px) in a list or table, not one card each. `[assist]`
- **LAY-4 — Gaps grow with grouping.** 4 → 8 → 12/16 → 24 → 32/48 from label-to-value up to section-to-section, on the 4px grid. Verify: with borders removed, groups are still nameable from spacing alone. `[judge]`
- **LAY-5 — One content line per region; one border between regions.** The container owns padding; children do not add margins at the edge; adjacent regions share a single divider. Verify: a vertical line down a region's left edge touches every label. `[judge]`
- **LAY-6 — Gray planes, not boxes.** Distinguish regions by plane: white main, `bg-sunken` side panels and graph canvas, `bg-tonal` wells. Verify: each region is separable by value alone. `[judge]`
- **LAY-7 — Responsive contract per region.** For each region, write what happens below 1180px and below 768px (stack, collapse to a select, move to a bottom sheet, become a tab). Mobile: bottom tab bar, primary actions in the lower half, 44px targets. `[assist]`

## Elevation & Depth

No shadows on resting content. Depth is expressed by gray planes and 1px dividers. Floating layers (menu, popover, drawer, dialog, toast) sit above the page in a fixed order — base < sticky header < dropdown < drawer/dialog (with a 30% scrim) < toast < tooltip — and use one edge language: a 1px `border` plus, for menus and popovers only, a quiet shadow `0 4px 16px rgba(0,0,0,0.08)`. Focus rings are not elevation (2px ink outline, 2px offset).

- **ELV-1 — Planes before shadows.** `[assist]` **ELV-2 — One edge language per surface** (border or shadow, not a hairline plus a wide blur). `[assist]` **ELV-3 — Floating content escapes containers** (no clipping by `overflow: hidden` ancestors). `[auto]`

### Floating layers over the graph (glass)

On the 탐색 graph screen the graph fills the screen and the controls float over it (Toss layout, Apple-Maps-style card; decisions 2026-11-15). These layers form one family:
- **직무 바 JobBar:** top-left capsule — my jobs (selected = raised segment), 직무 더 고르기 (+), view switch (graph / list).
- **확대 캡슐 ZoomCapsule:** bottom-right capsule — +, −, 전체 보기; 배치 되돌리기 appears after a drag.
- **범례 줄 GraphLegend:** one line at the bottom-left, desktop only.
- **상세 카드 DetailCard:** a `floating-card-width` (364px) card at the right from 1024px up; below that a bottom sheet up to 46% of the height with a grab handle.

Material: **clear liquid glass** (Apple's clear variant, decided 2026-11-16). The whole family uses this one variant; never mix it with a frosted look. On Chromium every layer gets its own lens filter (`app/components/explore/use-liquid-glass.ts`, values in `app/styles/glass.css`):
- **Lens:** a displacement map shaped to the layer bends what is behind it only in a rim band (bezel 14px on capsules, 22px on the card; inward shift up to 17 / 26px), and only near-black content bends — vertices and labels (luminance below 0.4, fully below 0.2). The dot grid and the gray lines cross the rim straight, and a bent vertex leaves no unbent ghost. The middle stays clear. No prism (removed 2026-11-16).
- **Fill and frost:** 5% `bg-surface` on capsules, 3% on the card; frost 0.3px on capsules, 3px in the card's middle; no backdrop brightening (saturate 1.5 only), so the glass never looks whiter than the canvas.
- **Light:** a gloss gradient (20% surface at the top → clear → 3% ink at the bottom), a crisp 0.5px outer hairline, 1px top and left specular lines, a 1px bottom floor line, a 1.5px rim ring that is brightest at the top-left and bottom-right corners, a soft inner bevel and a small shadow (0 8px 24px −10px).
- **Text on glass:** no white pane. Card text carries a soft surface-coloured halo (vibrancy-like) and a 6% pane sits inside the card rim, so text separates from a vertex passing under it.
- Other engines keep the same family as frosted glass (14px blur, 62% fill; card 78%).

Order: legend and zoom capsule z-10, job bar and card z-20.

- **ELV-4 — Glass only for floating layers over the graph canvas.** Never on page content, rows or dialogs; never glass on glass (a selected segment inside a glass bar is a raised `bg-surface` segment, not another glass layer). `[judge]`
- **ELV-5 — Glass always has a solid fallback:** no backdrop-filter → 96% `bg-surface`; reduced transparency → solid `bg-surface`; more contrast or forced colors → solid `bg-surface` + 1px `border-strong`, no rim. Reading text on glass keeps 4.5:1 in every case. `[auto]`
- **ELV-6 — Floating layers never cover the data.** The graph's fit padding equals the floating layers' extents (desktop: top 84, right 404, bottom 76, left 48 px; narrow: top 76, sides 20, bottom 48%), so after a fit no vertex or label sits under a bar, capsule or card. No third-party marks in the canvas corners: the React Flow attribution is hidden (`proOptions.hideAttribution`, decided 2026-11-16); the MIT credit stays in THIRD_PARTY_NOTICES.md. `[assist]`

## Shapes

Small, square-leaning corners for page content: `inner` 2px (labels, badges, swatches), `element` 4px (buttons, chips, inputs, rows), `container` 6px (cards, panels, dialogs). The floating family over the graph is the one round exception (Toss style): `sheet` 28px (상세 카드 and the bottom sheet), `tile` 16px (tiles and rows inside a sheet), `full` (capsules, the segments inside them, chips and the back button inside a sheet). Elsewhere `full` is only for the avatar, status and unread dots, count badges and graph vertices.

- **SHP-1 — Radius by role** from the YAML; no other values. `[auto]`
- **SHP-2 — Nested corners stay concentric:** inner radius = outer radius − padding (never negative; 0 if padding ≥ radius). Inside a `sheet`, tiles and rows use `tile` regardless of padding. `[auto]`
- **SHP-3 — No side-stripe accents on rounded cards;** emphasis uses fill or a full border. `[judge]`
- Icons: Lucide, 1.5–2px stroke, 16/18/20/24px; meaning first, never decoration; no sparkle icons for AI (use the "AI" label).

## Components

Implementation is shadcn/ui on Radix Primitives. shadcn variables map onto our tokens; components keep shadcn names where they exist and our domain names (Korean name + English identifier, used verbatim in code) where they do not.

| shadcn variable | Our token |
|---|---|
| --background / --foreground | bg-page / text-primary |
| --card / --popover | bg-surface |
| --primary / --primary-foreground | accent (primary) / on-accent |
| --secondary / --secondary-foreground | bg-tonal / text-primary |
| --muted / --muted-foreground | bg-sunken / text-secondary |
| --accent (shadcn hover fill) | bg-tonal-hover |
| --border / --input / --ring | border / border-emphasized / accent |
| --destructive | error |
| --chart-1..3 | data-1..3 |

Core parts:
- **Buttons:** primary = ink fill (one per region); secondary = tonal gray fill; outline = surface with `border-emphasized`; ghost = text only with tonal hover. Heights 32 / 40 / 48. Labels are plain verbs ("분석 보기", "PDF 올리기"). **CMP-1**: one primary per region `[assist]`.
- **Chips / filters:** surface with `border-emphasized`; selected = `bg-selected` + 600 weight (not ink). **CMP-2** `[auto]` via no-restyle contract.
- **Navigation:** current tab = `bg-selected` + `text-primary`; others `text-secondary`.
- **Rows (기업 행 CompanyRow, 공고 행 PostingRow, 에피소드 행 EpisodeRow):** 48–56px; title label 15/600, meta support 14 gray; values right-aligned in tabular numerals; hover `overlay-hover`, selected `bg-selected`. On `bg-selected` the meta text switches to `text-primary` (gray-11 on gray-5 is 4.48:1, just under AA). **CMP-5** `[auto]`.
- **Badges:** neutral = `bg-tonal` + `text-secondary`; D-day urgent (≤ 7) = `error-muted` + `text-error`; status words always present.
- **근거 라벨 TrustLabel:** filing-based = ink fill, paper text ("공시 근거") + source and date in support gray; AI-made = `ai-muted` fill, `text-ai`, 1px dashed `border-ai` ("AI 요약", "AI 추론", "추정"). **CMP-3**: every value or sentence from a filing or from AI carries one `[assist]`.
- **AI 출력 블록 AiOutput:** AI-made paragraph with a 3px `ai` left rule (square ends, not on a rounded card) and an AI label below.
- **인사이트 셀 InsightCell:** question (heading-3), one answer sentence (body-lg), at most one figure (figure) or one chart, then a TrustLabel.
- **기간 슬라이더 PeriodScrubber:** segmented control of fiscal periods in tabular numerals; current = `bg-selected`.
- **차트 Chart:** focus series `data-1` (ink), comparison `data-2`, context `data-3`; tracks `data-track`; up/down only with `data-up`/`data-down` plus ▲/▼. Every number shown against another number (previous year, share, total). **CMP-4** `[judge]`.
- **직무 맵 JobMap (graph; shown to users as 나의 취업 그래프, spec FR-MAP-03):** React Flow (@xyflow/react) renders, our d3-force lays out one star per liked job (up to 5), bubblesets-js draws the plane. Canvas `graph-canvas` with a `graph-grid` dot grid (20px gap, 1.5px dots). Every vertex is a **circle with its name under it** (on a canvas-coloured halo); an icon is never shown without the name.
  - 내 직무 job = `graph-job` ink circle (~52px) with a Lucide briefcase in `text-inverted`; name body 700.
  - 산업 industry = `bg-tonal` circle with a 1px `border-emphasized` ring, sized by linked companies (~30–42px), Lucide industry pictogram inside (half the diameter, 1.75 stroke); name label-strong. Opened = 1.5px dashed `border-strong` outline (4px offset) and a `bg-tonal` plane (75%, 1px `border`) around it and its companies.
  - 기업 company = open circle (`bg-surface`, 1.5px `graph-node` ring) sized by revenue (square-root scale, ~14–34px); saved = `graph-saved` fill; estimated link or no figures = dashed ring, no figures = smallest. Name caption 500 (saved 600).
  - Lines: job→industry `graph-division`, 1.9–6.4px by posting evidence (posting links count double); industry→company `graph-edge`, posting solid 2px, estimated dashed 1px. Nothing links one star to another and no industry carries a shared-jobs tag (D 2026-11-17).
  - Hover or focus dims the rest (vertices 40%, lines 15%); selection and keyboard focus = 2px canvas gap + 2px `border-strong` ring.
  - Drag: a dropped vertex stays where dropped; dragging a job moves its star, an industry moves its companies; 배치 되돌리기 restores the layout. Fit never zooms below 0.92, so labels stay ≥ 12px.
  - Legend = 범례 줄 GraphLegend (glass, bottom-left, desktop): 내 직무 · 산업 · 기업 · 클수록 매출이 커요 · 추정.
- **상세 카드 DetailCard:** the floating sheet of the graph screen (see Elevation). Toss-style content: a 44px icon circle + heading-2 title + one caption line; at most two stat tiles (`tile`, `overlay-hover` tint, figure 22/600 + unit + caption); then rows (`tile` corners, label-strong title, caption sub, tabular value, chevron); one primary action; the TrustLabel / source line last. The company view leads with a heading-1 name and a figure-hero revenue. Back = a ghost capsule with a chevron. Sentences in 해요체, one line each.
- **Toast:** ink fill, paper text, brief. **Inputs:** surface, `border-emphasized`, focus = ink border + 3px `bg-selected` ring. **Skeleton:** `skeleton` gray blocks in the final layout; AI-pending content uses `skeleton-ai`.

## States

States are grouped by who drives them. Reuse a listed representation before inventing one.

- **User:** rest; hover = `overlay-hover` tint (never an opaque block); pressed = `overlay-pressed` + scale 0.98 on buttons; focus-visible = 2px ink outline, 2px offset; selected = (a) filled ink for checkbox, radio and switch, (b) `bg-selected` for chips, rows, nav items, segmented controls, (c) 2px ink underline for tabs; dragging = 50% opacity ghost, 2px ink insertion line.
- **System:** disabled = `text-disabled` with the reason available; loading = gray skeleton in the final geometry (no layout shift); processing in place = spinner inside the control, same size; status prominence tiers = muted fill with icon and text (in-flow, persistent) → solid fill (compact chip, urgent) → ink toast (brief overlay). One meaning keeps one color across tiers.
- **Agent (AI):** working = a full-width band in `ai-muted` with dashed `border-ai` top and bottom, a 3-step bar and a plain status line ("공고 분석 중 · 2/3 요구 역량 정리"), `skeleton-ai` placeholders; streaming = text appears into the final block, the AI label is shown from the first token; awaiting input = the question in `text-primary` with an ink primary action, the band stays violet-edged; done = output keeps its AI label and source line. No hidden reasoning is shown.
- **STA-1** every interactive part defines rest, hover, focus, pressed, disabled, plus selected/loading where relevant `[assist]`; **STA-2** busy states never change dimensions `[assist]`; **STA-3** AI states never use the user/system colors and system states never use violet `[judge]`.

## Motion

Motion confirms an action or reveals a change; it never decorates. Fast 120–180ms for hover/press (color and transform only), medium 200–260ms for drawers, sheets and branch reveals on the job map, ease-out, no bounce. Camera moves on the graph (fit, zoom, 배치 되돌리기) take 450ms; the force layout settles once and then rests; the detail card enters in 220ms (6px rise + fade). Only `transform` and `opacity` animate. Nothing loops on working screens (the AI step bar fills, it does not pulse). `prefers-reduced-motion` turns transitions off.

## Do's and Don'ts

- Do give every gray one job from the Colors table; do let gray planes, not boxes, separate regions.
- Do keep one ink action per region; do mark selection with gray.
- Do label every filing-based and AI-made value; do pair every color with a word, sign or icon.
- Do set Korean with Pretendard, 16/1.5 body, tracking 0, keep-all on short UI text.
- Do show numbers in tabular numerals with units and a comparison.
- Don't use raw hex, Tailwind palette colors or arbitrary values in components.
- Don't use hue for decoration, gradients or glows (the glass rim light and gloss are the only exceptions), emoji or sparkle icons.
- Don't nest cards, wrap records in cards, or add side stripes to rounded cards.
- Don't use italics, break-all, line-height under 1.3 on wrapping Hangul, or tracking below −0.03em.
- Don't add intro loaders, looping animation or opaque black hover blocks.

## Enforcement

Docs alone are suggestions; these checks make the rules stick. Run them before a screen is called done.
- `npx -p @google/design.md designmd lint DESIGN.md` — structure, broken references, component contrast (0 errors, 0 warnings expected); `designmd diff` on every DESIGN.md change; `export --format css-tailwind` (Tailwind v4 theme for shadcn) and `--format dtcg` (W3C DTCG 2025.10 tokens).
- **@shadcn/lint** (ESLint): `no-raw-colors`, `no-arbitrary-values`, `no-inline-styles`, `no-unknown-classes`, `require-static-classes`, and `no-restyle` contracts per component (e.g. Button owns its padding and shape; Chip owns its selected style) with messages that cite the rule ID here.
- **Hangul check** (`oh-my-design/skills/hangul/scripts/check.mjs`): no BLOCK or WARN on UI sources.
- **Contrast script**: the 22 text and UI pairs per mode listed in the design-v4 page must pass (text 4.5, UI 3.0).
- **Impeccable** `detect` on the rendered page: no warnings (advisories reviewed).
- **Screenshot review** at 1440 and 390, light and dark, on five axes: layout fidelity, visual hierarchy, spacing and alignment, component fidelity, color and theming.
