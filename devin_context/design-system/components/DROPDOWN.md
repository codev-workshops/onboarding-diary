# Dropdown

## API

```ts
interface DropdownOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface DropdownProps<T extends string> {
  label: string;
  value: T | null;
  options: ReadonlyArray<DropdownOption<T>>;
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
}
```

Functional component, named export, hooks only — per the repository's code style.

## Visual spec

**Trigger** — matches the Input default state (white fill, 1px `--border-color`, `--radius-md`)
with a trailing chevron in `--color-text-muted`. When open, the border is `--border-color-focus`
and the chevron rotates 180°.

**Panel**

- Fill `--color-surface`, radius `--radius-md`, `--shadow-panel`, no border.
- Offset `--space-xs` from the trigger, matching the trigger width.
- Vertical padding `--space-sm`; max height ~240px then scrolls.

**Option**

- 14px regular `--color-text-body`, 8px vertical / 16px horizontal padding.
- Hover / keyboard-highlighted: `--color-surface-muted` background.
- Selected: semibold, `--color-text-link`.
- Disabled: `--color-text-disabled`, not selectable.

## Behaviour

- Trigger uses `role="combobox"` with `aria-expanded` and `aria-controls`; the panel uses
  `role="listbox"` and options use `role="option"` with `aria-selected`.
- Keyboard: `Enter`/`Space` opens, `ArrowUp`/`ArrowDown` moves the highlight, `Enter` selects,
  `Esc` closes and returns focus to the trigger, `Tab` closes.
- Closes on outside click and on scroll of the containing region.

## Do's

- Keep option labels short and parallel in structure.
- Show the current selection in the trigger, not just a placeholder.
- Use a dropdown for 5+ options; use radio buttons or segmented controls below that.

## Don'ts

- Don't nest dropdowns inside dropdowns.
- Don't mark selection with both a checkmark and bold weight — bold alone.
- Don't add a border to the panel; elevation is what separates it from the page.
