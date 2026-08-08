# Button

## API

```ts
type ButtonVariant =
  | 'primary'
  | 'primaryRounded'
  | 'secondary'
  | 'tertiary'
  | 'quaternary';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; // default: 'primary'
  size?: 'md' | 'sm';      // default: 'md' ('sm' is only supported for 'tertiary')
  icon?: React.ReactNode;  // leading icon; required for 'primaryRounded'
  fullWidth?: boolean;
}
```

Functional component, named export, hooks only — per the repository's code style.

## Visual spec

| Variant | Fill | Border | Label | Radius | Hover |
| --- | --- | --- | --- | --- | --- |
| `primary` | `--color-primary` | none | `--color-text-on-primary`, 16px semibold | `--radius-md` | `--color-primary-hover` + `--shadow-hover` |
| `primaryRounded` | `--color-primary` | none | `--color-text-on-primary`, 14px semibold | `--radius-pill` | `--color-primary-hover` + `--shadow-hover` |
| `secondary` | transparent | 1px `--color-primary-light` | `--color-text-on-primary`, 16px | `--radius-md` | border → `--color-surface` |
| `tertiary` | `--color-surface` | 1px `--color-border-special` | `--color-text-muted`, 16px | `--radius-md` | border and label → `--color-text-heading` |
| `quaternary` | `--color-danger` | none | `--color-text-on-primary`, 16px semibold | `--radius-md` | `--color-danger-hover` + `--shadow-danger` |

Sizing: `md` = 16px vertical / 24px horizontal padding. `sm` (tertiary only) = 8px / 16px at 14px type.

## States

- `:hover` — per the table above; transition `--motion-duration` `--motion-easing`.
- `:focus-visible` — 2px `--color-primary` outline, 2px offset. Applies to every variant.
- `:active` — no additional transform; keep the hover fill.
- `disabled` — `--color-surface` fill, 1px `--color-border-special` border,
  `--color-text-disabled` label, `cursor: not-allowed`, no hover or shadow.

## Do's

- One `primary` button per view or dialog.
- Use `primaryRounded` for compact, icon-led creation actions.
- Use `quaternary` only for destructive actions, and confirm before executing them.
- Give icon-only buttons an `aria-label`.

## Don'ts

- Don't use `secondary` on a light background — it is designed for primary-colored surfaces.
- Don't communicate the disabled state with opacity alone.
- Don't hardcode hex values; reference the tokens.
- Don't put more than three buttons in a single action group.
