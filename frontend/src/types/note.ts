export interface NoteEntry {
  id: string;
  userId: string;
  date: string;
  title: string;
  content: string;
  tags?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteRequest {
  date: string;
  title: string;
  content: string;
  tags?: string;
}

export interface UpdateNoteRequest extends CreateNoteRequest {}
