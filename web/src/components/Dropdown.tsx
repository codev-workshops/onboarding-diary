import { useEffect, useId, useRef, useState } from 'react';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps<T extends string> {
  label: string;
  value: T | null;
  options: ReadonlyArray<DropdownOption<T>>;
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export const Dropdown = <T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  error,
  disabled = false,
}: DropdownProps<T>) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const messageId = `${generatedId}-message`;
  const selected = options.find((option) => option.value === value) ?? null;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const commit = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) {
      return;
    }
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => {
        const next = (current + step + options.length) % options.length;
        return next;
      });
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(
          Math.max(
            0,
            options.findIndex((option) => option.value === value),
          ),
        );
        return;
      }
      commit(activeIndex);
    }
  };

  return (
    <div className="field">
      <span className="field__label" id={`${generatedId}-label`}>
        {label}
      </span>
      <div className="dropdown" ref={containerRef}>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-labelledby={`${generatedId}-label`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? messageId : undefined}
          disabled={disabled}
          className={['field__control', 'dropdown__trigger', error ? 'field__control--error' : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={onKeyDown}
        >
          <span
            className={['dropdown__value', selected ? '' : 'dropdown__value--placeholder']
              .filter(Boolean)
              .join(' ')}
          >
            {selected?.label ?? placeholder}
          </span>
          <span className={['dropdown__chevron', open ? 'dropdown__chevron--open' : ''].join(' ')}>
            &#9660;
          </span>
        </button>
        {open ? (
          <ul
            className="dropdown__panel"
            role="listbox"
            id={listboxId}
            aria-labelledby={`${generatedId}-label`}
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled}
                className={[
                  'dropdown__option',
                  index === activeIndex ? 'dropdown__option--active' : '',
                  option.value === value ? 'dropdown__option--selected' : '',
                  option.disabled ? 'dropdown__option--disabled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(index)}
              >
                {option.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error ? (
        <span className="field__error" id={messageId}>
          {error}
        </span>
      ) : null}
    </div>
  );
};
