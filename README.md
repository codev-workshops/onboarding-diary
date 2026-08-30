# onboarding-diary

Onboarding Diary Application - A web application for new recruits to document their onboarding journey

## Tech stack

- [React 19](https://react.dev/)
- [Vite](https://vite.dev/) dev server and build
- Theming via CSS custom properties (light + dark)

## Getting started

Requires Node.js 20.19+ (or 22.12+).

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # serve the production build
npm run lint     # eslint
```

## Theming

Colors live in one place: `src/styles/theme.css`.

- `:root` defines the light palette.
- `[data-theme="dark"]` overrides the same variables with dark values.

Available variables:

| Variable | Purpose |
| --- | --- |
| `--color-primary` / `--color-secondary` / `--color-accent` | brand colors |
| `--color-background` / `--color-surface` | page and card backgrounds |
| `--color-text` / `--color-text-muted` | body and secondary text |
| `--color-border` | borders and dividers |
| `--color-success` / `--color-warning` / `--color-error` | semantic states |

`ThemeProvider` (`src/context/ThemeContext.jsx`) sets the `data-theme` attribute on
`<html>` and persists the choice in `localStorage` under `onboarding-diary-theme`.
First-time visitors get the theme matching their OS `prefers-color-scheme`.
`ThemeToggle` (`src/components/ThemeToggle.jsx`) flips between light and dark, and any
component can read the current theme with the `useTheme()` hook.

### Customizing colors

Edit the values in `src/styles/theme.css` — nothing else needs to change, since components
reference the variables (e.g. `background-color: var(--color-surface)`). To add a new color,
declare it in both the `:root` and `[data-theme="dark"]` blocks so both themes stay complete.
