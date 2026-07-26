import type { ComponentPropsWithRef, ReactNode } from 'react';

import { BUTTON_VARIANTS, cx, type ButtonVariant } from './styles.js';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: ButtonVariant;
  isLoading?: boolean;
};

export function Button({
  variant = 'primary',
  isLoading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps): ReactNode {
  return (
    <button
      type={type}
      disabled={disabled === true || isLoading}
      aria-busy={isLoading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm ' +
          'font-medium transition focus-visible:ring-2 focus-visible:outline-none ' +
          'disabled:cursor-not-allowed disabled:opacity-60',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
