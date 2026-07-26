/** Shared Tailwind class recipes so the primitives stay visually consistent. */

export const FIELD_CLASS =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-100 aria-invalid:border-red-500';

export const BUTTON_VARIANTS = {
  primary: 'bg-sky-700 text-white hover:bg-sky-800 focus-visible:ring-sky-300',
  secondary:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 ' +
    'focus-visible:ring-slate-300',
  danger: 'bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-300',
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

export function cx(...classes: (string | false | undefined)[]): string {
  return classes.filter((value): value is string => typeof value === 'string').join(' ');
}
