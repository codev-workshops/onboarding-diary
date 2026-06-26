'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TagInput from '@/components/ui/TagInput';
import Toast from '@/components/ui/Toast';
import { getNoteById, updateNote } from '@/services/notes';
import { getTodayString, formatDateForInput } from '@/utils/formatters';

export default function EditNotePage() {
  const router = useRouter();
  const params = useParams();
  const noteId = Number(params.id);
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function fetchNote() {
      try {
        const note = await getNoteById(noteId);
        setDate(formatDateForInput(note.date));
        setTitle(note.title);
        setContent(note.content);
        setTags(note.tags);
      } catch {
        setToast({ message: 'Failed to load note.', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    }
    fetchNote();
  }, [noteId]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = 'Date is required.';
    else if (new Date(date) > new Date()) newErrors.date = 'Date cannot be in the future.';
    if (!title || title.length < 3) newErrors.title = 'Title must be at least 3 characters.';
    else if (title.length > 200) newErrors.title = 'Title cannot exceed 200 characters.';
    if (!content || content.length < 1) newErrors.content = 'Content is required.';
    else if (content.length > 10000) newErrors.content = 'Content cannot exceed 10000 characters.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await updateNote(noteId, { date, title, content, tags });
      router.push(`/notes/${noteId}`);
    } catch {
      setToast({ message: 'Failed to update note.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push(`/notes/${noteId}`)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Note</h1>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={getTodayString()}
            error={errors.date}
            required
          />

          <Input
            label="Title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter note title"
            error={errors.title}
            required
          />

          <div className="w-full">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              rows={8}
              className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                errors.content ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
              }`}
              required
            />
            <div className="flex justify-between mt-1">
              {errors.content && <p className="text-sm text-red-600">{errors.content}</p>}
              <span className="text-xs text-gray-400 ml-auto">{content.length}/10000</span>
            </div>
          </div>

          <TagInput
            label="Tags"
            tags={tags}
            onChange={setTags}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={() => router.push(`/notes/${noteId}`)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={!!toast}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
