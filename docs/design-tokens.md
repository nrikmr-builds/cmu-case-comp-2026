# Design tokens

The Hub's visual language is taken from PNC's own public site, read from live pages with the browser's computed styles. It is not guessed, and it does not come from logo sites or fan-made guides.

- **Where tokens live:** one place, the `@theme` block in `src/index.css`. Tailwind's default palette, radii, shadows and type scale are reset there, so components can only use these tokens.
- **The mirror file:** `src/lib/tokens.ts` holds the same values for places that need literal colours: Recharts SVG attributes, the figure-export label and the print stylesheet.

This is a concept prototype for a case competition. It is not an official PNC product, and it uses no PNC font files or image assets.

## Sources

| # | Page | Retrieved |
|---|---|---|
| S1 | https://www.pnc.com/en/personal-banking.html (personal-banking home) | Oct 23, 2026 |
| S2 | https://www.pnc.com/en/personal-banking/banking/checking.html (checking product page) | Oct 23, 2026 |
| P1 | https://www.chase.com/personal/checking (**patterns only**: heading scale, whitespace, button radius; no colours, logo or assets used) | Oct 23, 2026 |

Bank of America's dense, dated look was treated as the anti-pattern: no grey bevels, no crowded link lists, no all-caps micro-labels.

## Colour

| Token | Value | Use | Source |
|---|---|---|---|
| `brand-blue` | #0069AA | Primary button fill; secondary button border and text | S1, S2: "Get Started", "Open Checking & Savings" (rgb 0,105,170) |
| `brand-blue-dark` | #004C97 | Links; primary hover | S1, S2: link colour (rgb 0,76,151) |
| `brand-orange` | #F7841F | Accent rules and the active-tab underline only (2.54:1 on white, so **never text**) | S1, S2: orange accent background (rgb 247,132,31) |
| `brand-slate` | #424C55 | Header band | S1, S2: header and band background (rgb 66,76,85) |
| `brand-charcoal` / `ink` | #2D3943 | Nav row, headings, strong text | S1, S2: "Sign On" text and dark band (rgb 45,57,67) |
| `body` | #484848 | Body text | S1, S2: body and heading colour (rgb 72,72,72) |
| `line` | #E1E5EA | Dividers, inset panels | S1, S2: light rule and background (rgb 225,229,234) |
| `surface` | #F1F4F6 | Page background | S1: section background (rgb 241,244,246) |
| `surface-hero` | #EDEDEE | Hero band | S1, S2: band background (rgb 237,237,238) |
| `muted` | #5B6670 | Secondary text | *Derived* from PNC's slate family, darkened to ≥ 4.5:1 on every surface |
| `line-strong` | #8A96A1 | Form-control borders | *Derived*: 3.0:1 non-text contrast on white. PNC's "Sign On" border is #64727E (S1). |
| `surface-subtle` | #F7F9FA | Table header rows | *Derived* |

**Status colours.** PNC's public pages don't define status colours, so these are *derived*. Each text/soft pair passes AA, and status always shows an icon and a text label too, so colour is never the only cue.

| Status | Text | Soft background | Line | Text on soft |
|---|---|---|---|---|
| On Track (`positive`) | #1E7A46 | #E7F4EC | #B9DCC6 | 4.72:1 |
| Watch (`caution`) | #8A5A00 | #FDF3DD | #F0D59A | 5.37:1 |
| At Risk (`critical`) | #B3261E | #FCEBEA | #F2C4C0 | 5.67:1 |
| Info (`info`) | #0069AA | #E6F0F7 | #B3CFE3 | 5.05:1 |
| Accent (`accent`) | #9A4A00 | #FEF1E6 | #FBD2AD | 5.65:1 |
| Plum (dashboard icon only) | #6B3FA0 | #F1EBF8 | #D3C3EA | 6.32:1 |

Chart colours come from the same tokens: `src/lib/chartColors.ts` reads `src/lib/tokens.ts`. There are no Recharts default colours. The two chart tints (#7FB4D5 and #F9B77A) are derived from brand blue and orange, and always appear with a legend or labels.

## Typography

| Observed on pnc.com | Source |
|---|---|
| Headings: **"Neulis Sans"** Medium/Light (H1 26.6 px, H2 24.9 px, H3 23.3 px, H4 21.9 px), weight 400, colour #484848 | S1, S2 |
| Brand labels: **"PNC Brand"** (proprietary) | S1, S2 (loaded fonts list) |
| Body: **Arial**, 18 px / 24 px, #484848 | S1, S2 |
| Icons: Font Awesome 7 Pro | S1 (loaded fonts list) |

**Our choice:**
- Neulis Sans is a commercial typeface and PNC Brand is proprietary, so **neither is copied.**
- Headings and key numbers use **Figtree** (SIL Open Font License 1.1), self-hosted from the `@fontsource-variable/figtree` npm package. It is a geometric sans with round, open forms and low stroke contrast, close to Neulis Sans in proportion. It has tabular figures.
- Body text uses **Arial**, as pnc.com does.
- Every number uses `font-variant-numeric: tabular-nums`.

**The scale, 6 sizes:**

| Token | Size / line height | Use |
|---|---|---|
| `text-xs` | 12 / 16 | Captions, table meta, chart axes |
| `text-sm` | 14 / 20 | Body in cards and tables, buttons |
| `text-base` | 16 / 24 | Lead body |
| `text-lg` | 20 / 28 | Card and section titles |
| `text-xl` | 28 / 34 | Key numbers, section headings |
| `text-2xl` | 40 / 46 | Page title (one per page) |

**Weights:** 400 (body), 500 (labels) and 600 (emphasis, headings, buttons). `strong`, `b` and `th` are capped at 600.

**Case:** one ALL-CAPS eyebrow per page (the hero eyebrow). Everything else is sentence case, and prose is capped at about 80 characters per line.

The heading scale follows the Chase *pattern* (P1): large, confident headings over a 16 px body, used sparingly.

## Shape, elevation, spacing, motion

| Token | Value | Source |
|---|---|---|
| `radius-sm` | 4 px for every button, input, card and panel | S1, S2: buttons and cards are 4 px (35 elements on S2). P1 also uses 4 px buttons. |
| pill | `rounded-full` for badges, chips and dots only | S1, S2: 50% circles for icons |
| `shadow-card` | 0 1px 2px rgb(45 57 67 / .06), 0 2px 8px rgb(45 57 67 / .10) | S2: cards are **shadow-only** with no border (0 2px 8px rgba(96,96,96,.5), radius 4 px, padding 30 px), softened for a data-dense screen |
| `shadow-pop` | 0 8px 24px rgb(45 57 67 / .18), 0 2px 6px rgb(45 57 67 / .08) | *Derived*: menus, sheets and the tour card |
| Spacing | 8-point grid for containers and sections: card padding 24 px, gaps between cards and sections 24 px, page padding 32 px. Small inline gaps inside controls use 4 px half-steps. | S2 card padding is 30 px; ours is 24 px, on the 8-point grid |
| Layout | 12-column grid at 1,280 px: the left rail takes 3 columns, the cards 9 | — |
| Motion | 150 ms (hover and colour), 200 ms (menus, sheets, dialogs), ease-out `cubic-bezier(.2,.8,.2,1)`; honours `prefers-reduced-motion` | — |
| Icons | lucide, one stroke weight (1.75) | PNC uses one icon family (S1) |

## Components (`src/index.css`, `@layer components`)

| Component | Spec |
|---|---|
| **Button** | `.btn` plus one of `.btn-primary` (blue fill, white text, 5.83:1), `.btn-secondary` (white, blue border and text, as PNC's "Learn More"), `.btn-tertiary` (text only), `.btn-destructive` (only for Reset demo and Delete). Sizes are 40 px default and 32 px (`.btn-sm`); `.btn-icon` makes it square, and `.btn-inline` drops the box for in-sentence actions. Focus ring: 2 px brand blue. Pressed state: moves down 1 px. |
| **Card** | `.card`: white, `radius-sm`, `shadow-card`, no border |
| **Badge / chip** | `.chip`: one pill style for status and labels; `button.chip` for filters, with pressed and selected states |
| **Tabs** | `.tab`: shared by the main nav, the Checking sub-tabs and the builder steps. 3 px underline in brand orange when active. Text colour follows the surface (white on the dark nav, ink on white). |
| **Inputs** | `.field`: 40 px (32 px compact), `line-strong` border, `radius-sm`. Checkboxes, radios and sliders use `accent-color: brand-blue`. |
| **Table** | Sentence-case header in `muted` 12 px, row lines in `line`, numbers right-aligned with tabular numerals |
| **Modal / sheet** | Overlay `ink/50`; the panel is white with `radius-sm`, `shadow-pop` and a 200 ms sheet entrance. Used by the builder, report, switcher, create dialog and tour. |
| **Skeleton** | `.skeleton`: a `line`-coloured block with a gentle pulse, holding each lazy section's space |
