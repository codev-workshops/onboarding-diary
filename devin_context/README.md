# devin_context

Machine-readable design and UI context for this repository. Anything in this directory is
intended to be read by an AI agent (Devin) at the start of a session, before it writes any
frontend code.

## Contents

| Path | What it is |
| --- | --- |
| `design-system/STYLE_GUIDE.md` | The authoritative UI style guide: colors, typography, buttons, dropdown, input. |
| `design-system/tokens.json` | Design tokens as data — colors, typography, spacing, radii, shadows. |
| `design-system/tokens.css` | The same tokens as CSS custom properties, importable by the app. |
| `design-system/components/` | Per-component specs (props, states, do's and don'ts). |
| `design-system/reference/` | Visual references (design exports / screenshots) to build against. |

## How to use this in a prompt

Point the agent at this directory explicitly and give it success criteria:

> Build the entry list screen. Follow the design tokens in `devin_context/design-system/tokens.json`
> and the component specs in `devin_context/design-system/components/`. Match the visual reference
> in `devin_context/design-system/reference/uidesigndaily-day-805-style-guide.png`.
> Run `npm run lint` and `npm run build` after each component.
> Iterate until the frontend is functional and matches the design.

## Rules of the road

- Never hardcode a hex value, font size, radius, or shadow in a component. Use a token.
- If a design need is not covered by a token, add the token first, then use it.
- Every interactive component must implement all states defined in its spec (default, hover,
  focus, active, disabled/inactive, error where applicable).
- Update this directory in the same PR whenever the design system changes.

## Source

The style guide is derived from **UI Design Daily — Day 805, "Style Guide: Button, Dropdown, Input"**:
https://www.uidesigndaily.com/posts/sketch-style-guide-button-dropdown-input-day-805

UI Design Daily assets are free to use in personal and commercial work: https://www.uidesigndaily.com/license
