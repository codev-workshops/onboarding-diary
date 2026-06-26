'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import { getNoteById, deleteNote } from '@/services/notes';
import { NoteResponse } from '@/types';
import { formatDate, formatDateTime } from '@/utils/formatters';

export default function NoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const noteId = Number(params.id);
  const [note, setNote] = useState<NoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function fetchNote() {
      try {
        const data = await getNoteById(noteId);
        setNote(data);
      } catch {
        setToast({ message: 'Failed to load note.', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    }
    fetchNote();
  }, [noteId]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteNote(noteId);
      router.push('/notes');
    } catch {
      setToast({ message: 'Failed to delete note.', type: 'error' });
    } finally {
      setIsDeleting(false);
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

  if (!note) {
    return (
      <ProtectedRoute>
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">Note not found</p>
          <Button variant="secondary" className="mt-4" onClick={() => router.push('/notes')}>
            Back to Notes
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/notes')}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">{note.title}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push(`/notes/${note.id}/edit`)}>
              Edit
            </Button>
            <Button variant="danger" onClick={() => setShowDelete(true)}>
              Delete
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{formatDate(note.date)}</span>
            <span>Created: {formatDateTime(note.createdAt)}</span>
            <span>Updated: {formatDateTime(note.updatedAt)}</span>
          </div>

          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <Badge key={tag} variant="info">{tag}</Badge>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
          </div>
        </div>

        <ConfirmDialog
          isOpen={showDelete}
          onClose={() => setShowDelete(false)}
          onConfirm={handleDelete}
          title="Delete Note"
          message="Are you sure you want to delete this note? This action cannot be undone."
          confirmText="Delete"
          isLoading={isDeleting}
        />

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
