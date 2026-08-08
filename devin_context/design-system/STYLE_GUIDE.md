# UI Style Guide

Authoritative UI guidelines for this repository. Derived from
[UI Design Daily — Day 805, "Style Guide: Button, Dropdown, Input"](https://www.uidesigndaily.com/posts/sketch-style-guide-button-dropdown-input-day-805).

Visual reference: [`reference/uidesigndaily-day-805-style-guide.png`](./reference/uidesigndaily-day-805-style-guide.png)

Tokens: [`tokens.json`](./tokens.json) · [`tokens.css`](./tokens.css)

---

## 1. Colors

### Shape / UI elements

| Token | Hex | Use |
| --- | --- | --- |
| `color.shape.primary` | `#3457DC` | **Primary color.** Primary buttons, active borders, links. |
| `color.shape.primaryHover` | `#2D4DC8` | Hover state of primary surfaces. |
| `color.shape.primaryLight` | `#869FFD` | Light accent / de-emphasised primary fills. |
| `color.shape.surfaceMuted` | `#F7F9FD` | Page and section backgrounds. |
| `color.shape.borderSpecial` | `#DCDFF1` | Borders in special cases; also the disabled text color. |
| `color.shape.surface` | `#FFFFFF` | Cards, panels, input backgrounds. |

### Font colors

| Token | Hex | Use |
| --- | --- | --- |
| `color.text.heading` / `body` | `#202842` | Headings and primary body copy. |
| `color.text.muted` | `#5D698D` | Labels, secondary copy, placeholder text. |
| `color.text.link` | `#3457DC` | Links and text on light primary surfaces. |
| `color.text.onPrimaryMuted` | `#687DCF` | Lower-emphasis text on primary backgrounds. |
| `color.text.danger` | `#EA4D67` | Validation and destructive text. |
| `color.text.disabled` | `#DCDFF1` | Inactive control labels. |
| `color.text.onPrimary` | `#FFFFFF` | Text on primary and danger fills. |

Never introduce a color outside this palette. If a new one is genuinely required, add it to
`tokens.json` and this table in the same PR.

---

## 2. Typography

Typeface: **Open Sans** (fallback: system sans-serif stack).

| Style | Size | Weights | Use |
| --- | --- | --- | --- |
| Heading | 20px | regular / bold | Section titles |
| Body | 16px | regular / semibold / bold | Body copy, button labels |
| Small | 14px | regular / semibold | Secondary copy, compact controls |
| Caption | 12px | regular | Helper and validation text |
| Overline | 10px, ALL CAPS | semibold | Group labels above controls |

Do not invent intermediate sizes. Use the five steps above.

---

## 3. Buttons

Five variants. All share: Open Sans, `--motion-duration` transitions, and a visible focus ring
(2px `--color-primary` outline with 2px offset).

| Variant | Default | Hover | Notes |
| --- | --- | --- | --- |
| **Primary** | `#3457DC` fill, white 16px label, `--radius-md` | `#2D4DC8` fill + `--shadow-hover` | The main call to action. One per view. |
| **Primary rounded** | `#3457DC` fill, `--radius-pill`, leading icon | `#2D4DC8` fill + `--shadow-hover` | Compact, icon-led action (e.g. "+ New entry"). |
| **Secondary** | Transparent fill on a primary background, 1px `#869FFD` border, white label | Border brightens to `#FFFFFF` | Only valid **on a primary-colored surface**. |
| **Tertiary** | White fill, 1px `#DCDFF1` border, `#5D698D` label | Border `#202842`, label `#202842` | Neutral / secondary actions on light backgrounds. |
| **Quaternary (danger)** | `#EA4D67` fill, white label | `#E63F5B` fill + `--shadow-danger` | Destructive actions only (delete entry). |

Additional states:

- **Inactive / disabled** — white fill, 1px `#DCDFF1` border, `#DCDFF1` label, `cursor: not-allowed`,
  no hover effect. Never rely on opacity alone.
- **Tertiary small** — the tertiary variant at 14px with reduced padding, for inline row actions.

Do's and don'ts:

- Do keep labels in sentence case and verb-first ("Save entry", not "Submit form").
- Do use the danger variant *only* for destructive actions.
- Don't place a secondary button on a white background — use tertiary.
- Don't stack two primary buttons in the same action group.

See [`components/BUTTON.md`](./components/BUTTON.md).

---

## 4. Dropdown

- Panel: white fill, `--radius-md`, `--shadow-panel`, no visible border.
- Panel is anchored to its trigger with `--space-xs` of offset.
- Options: 14px regular, `#202842`; hovered option gets a `#F7F9FD` background.
- The selected option is semibold; do not use a checkmark and bold simultaneously.
- The trigger is a tertiary button or an input, never a bare text link.

See [`components/DROPDOWN.md`](./components/DROPDOWN.md).

---

## 5. Input

| State | Border | Text | Notes |
| --- | --- | --- | --- |
| Default | 1px `#DCDFF1` | placeholder `#5D698D` | White fill, `--radius-md`. |
| Active / focus | 1px `#3457DC` | value `#202842` | Focus ring uses the primary color. |
| Error | 1px `#EA4D67` | value `#202842` | 12px `#EA4D67` message directly below the field. |
| Disabled | 1px `#DCDFF1` | `#DCDFF1` | Not focusable. |

Rules:

- Every input has a visible 14px semibold `#202842` label above it. Placeholders are not labels.
- Error messages describe the fix ("Please enter your email address"), not the failure.
- Error styling appears on blur or submit, never while the user is first typing.

See [`components/INPUT.md`](./components/INPUT.md).

---

## 6. Layout and accessibility

- Spacing uses the 4/8/16/24/32px scale only.
- Page background is `#F7F9FD`; content sits on `#FFFFFF` cards with `--radius-md`.
- All text must meet WCAG AA contrast. `#5D698D` on white passes for body text;
  `#DCDFF1` is reserved for disabled states and is not an accessible text color.
- Every interactive element is reachable and operable by keyboard, with a visible focus state.
- Color is never the only signal — pair error color with an error message, and selection color
  with a text or weight change.
