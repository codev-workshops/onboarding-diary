# Accessibility and Responsiveness (T-191)

Covers FR-X5 (usable from 360 px) and AC-12 (keyboard navigation, visible focus, labelled
inputs, WCAG AA contrast). The automated half runs in CI-able tests; the manual half is the
checklist below, which must be re-walked whenever a screen changes shape.

## Automated checks

`apps/web/src/accessibility.test.tsx` renders every key screen against the fake API and runs
axe-core over the result with the `wcag2a`, `wcag2aa`, `wcag21a`, and `wcag21aa` rule sets:

```bash
npm test --workspace @onboarding-diary/web -- accessibility
```

Screens covered: login, signup, the app shell, the recruit dashboard, the task/issue/feedback/
note logs, the report builder, the profile form, the manager team list, and the admin user list.

Two rules cannot be evaluated in jsdom and are therefore manual:

- `color-contrast` — jsdom computes no colours, so the rule is disabled in the helper.
- Anything layout-dependent (overlap, reflow, target size) — jsdom has no layout engine.

Keyboard behaviour that is asserted in the component tests rather than by axe:
`ConfirmDialog` moves focus to the confirm button on open, keeps Tab inside the dialog, and
closes on Escape; `TagInput` adds a tag on Enter or comma and removes the last tag on
Backspace.

## Built-in affordances

- Skip link — the shell's first focusable element jumps to `#main`, which is the `<main>`
  landmark (`AppLayout`).
- Focus styling — every control uses the shared recipes in `components/ui/styles.ts`
  (`focus:ring-2 focus:ring-sky-200` on fields, `focus-visible:ring-2` on buttons); focus rings
  are never suppressed without a replacement.
- Labels and errors — `Field` owns the `label`/`aria-describedby`/`aria-invalid` wiring, so a
  control cannot ship without a programmatic label, and 422 field errors are announced through
  the same association.
- Status messaging — error states, per-row admin failures, and the error boundary use
  `role="alert"`; the progress tiles use `role="progressbar"` with `aria-valuenow`.
- Nav semantics — `<nav aria-label="Main">` with a list of links; the active link is marked by
  `NavLink`'s `aria-current`.

## Manual review — 360 px, 768 px, 1280 px

Reviewed on 2026-07-26 against the seeded API, driving Chrome through CDP with
`Emulation.setDeviceMetricsOverride`. Routes checked at each width: `/`, `/tasks`, `/issues`,
`/reports`, `/team`, `/admin/users`.

| Check                                                    | 360 px | 768 px | 1280 px |
| -------------------------------------------------------- | ------ | ------ | ------- |
| No horizontal document overflow (`scrollWidth <= width`) | pass   | pass   | pass    |
| No element extends past the viewport's right edge        | pass   | pass   | pass    |
| Header, nav, and main landmarks all reachable            | pass   | pass   | pass    |
| Filter bars stack instead of truncating                  | pass   | pass   | pass    |
| Tables readable (secondary columns hidden below `sm`)    | pass   | pass   | pass    |
| Admin user rows keep role/manager/action controls usable | pass   | pass   | pass    |
| Dialogs fit the viewport with the confirm button visible | pass   | pass   | pass    |

Notes from the review:

- The nav strip scrolls horizontally at 360 px rather than wrapping, so an admin's eight
  destinations stay one row; the scroll container is keyboard reachable through its links.
- Wide tables scroll inside their own `overflow-x-auto` container, so the page itself never
  scrolls sideways.
- Admin user rows collapse from three columns to one below `sm`, keeping the role select, the
  manager select, and the activate/deactivate button full width.

## Re-running the review

1. Start the stack (`docker compose up`, or `npm run dev` per workspace) and seed it.
2. Open Chrome DevTools, toggle the device toolbar, and set the width to 360, then 768, then
   1280 with the height at 900.
3. Visit each route above and, in the console, confirm nothing overflows:
   ```js
   document.documentElement.scrollWidth <= window.innerWidth &&
     [...document.querySelectorAll('main *')].every(
       (el) => el.getBoundingClientRect().right <= window.innerWidth + 1,
     );
   ```
4. Tab through each screen: the skip link comes first, focus rings stay visible, and the tab
   order follows the visual order.

Any new screen must be added to `accessibility.test.tsx` and to the table above.
