import { createCrudHooks } from '../../shared/api/crud';
import type { NoteEntry } from '../../shared/types';
import type { NoteFormValues } from './schema';

export const notesApi = createCrudHooks<NoteEntry, NoteFormValues>('notes');
