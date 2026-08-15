import dayjs from 'dayjs';

export const formatDate = (value: string): string => dayjs(value).format('DD MMM YYYY');

export const toIsoDate = (value: string): string => dayjs(value).format('YYYY-MM-DD');

export const todayIso = (): string => dayjs().format('YYYY-MM-DD');

/** Turns PascalCase enum values into readable labels, e.g. "NotStarted" -> "Not started". */
export const humanize = (value: string): string => {
  const spaced = value.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
};
