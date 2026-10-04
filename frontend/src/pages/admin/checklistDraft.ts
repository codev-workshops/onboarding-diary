import type { TemplateRequest } from '../../api/checklists';

export interface DraftItem {
  title: string;
  description: string;
  dueDayOffset: string;
}

export const EMPTY_ITEM: DraftItem = { title: '', description: '', dueDayOffset: '' };

/** Returns the request body, or an error message if the draft is invalid. */
export function toTemplateRequest(
  name: string,
  description: string,
  items: DraftItem[],
): TemplateRequest | string {
  if (!name.trim()) return 'Give the checklist a name';
  if (items.length === 0) return 'Add at least one item';
  if (items.some((item) => !item.title.trim())) return 'Every item needs a title';
  const offsets = items.map((item) => item.dueDayOffset.trim());
  if (offsets.some((o) => o !== '' && !(/^\d+$/.test(o) && Number(o) <= 365))) {
    return 'Due days must be whole numbers from 0 to 365';
  }
  return {
    name: name.trim(),
    description: description.trim() || null,
    items: items.map((item, index) => ({
      title: item.title.trim(),
      description: item.description.trim() || null,
      dueDayOffset: offsets[index] === '' ? null : Number(offsets[index]),
    })),
  };
}
