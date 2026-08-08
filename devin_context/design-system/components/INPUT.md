# Input

## API

```ts
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;          // always required — placeholders are not labels
  error?: string;         // presence switches the field to the error state
  hint?: string;          // 12px helper text, hidden while `error` is present
}
```

Functional component, named export, hooks only — per the repository's code style.

## Visual spec

- Fill `--color-surface`, radius `--radius-md`, 1px border, 12px vertical / 16px horizontal padding.
- Value text: 16px regular `--color-text-body`.
- Placeholder: 16px regular `--color-text-muted`.
- Label: 14px semibold `--color-text-heading`, `--space-sm` above the field.
- Helper / error text: 12px regular, `--space-xs` below the field.

| State | Border | Helper text |
| --- | --- | --- |
| Default | `--border-color` | `hint` in `--color-text-muted` |
| Focus / active | `--border-color-focus` | unchanged |
| Error | `--border-color-error` | `error` in `--color-danger` |
| Disabled | `--border-color` | text `--color-text-disabled`, not focusable |

## Behaviour

- The `<label>` is associated with the input via `htmlFor` / `id`.
- Error state sets `aria-invalid="true"` and `aria-describedby` pointing at the message element.
- Validate on blur and on submit — never while the user is typing into an untouched field.
- Clearing the error restores the default border immediately.

## Do's

- Write error messages as the corrective action: "Please enter your email address".
- Keep one field per row on narrow viewports.
- Use `type` correctly (`email`, `password`, `date`) so mobile keyboards adapt.

## Don'ts

- Don't hide the label once the field has a value.
- Don't rely on border color alone to signal an error — always render the message.
- Don't use red text for anything that is not an error.
