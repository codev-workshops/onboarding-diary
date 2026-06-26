'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { feedbackApi } from '@/services/feedbackApi';
import { FeedbackType, CreateFeedbackRequest } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function NewFeedbackPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<CreateFeedbackRequest>({
    date: new Date().toISOString().split('T')[0],
    subject: '',
    type: FeedbackType.Positive,
    details: '',
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.date) {
      newErrors.date = 'Date is required.';
    } else if (new Date(form.date) > new Date()) {
      newErrors.date = 'Date cannot be in the future.';
    }

    if (!form.subject || form.subject.length < 3) {
      newErrors.subject = 'Subject must be at least 3 characters.';
    } else if (form.subject.length > 200) {
      newErrors.subject = 'Subject must be at most 200 characters.';
    }

    if (!form.details || form.details.length < 10) {
      newErrors.details = 'Details must be at least 10 characters.';
    } else if (form.details.length > 5000) {
      newErrors.details = 'Details must be at most 5000 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await feedbackApi.create(form);
      router.push('/feedback');
    } catch {
      setApiError('Failed to create feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Feedback</h1>

      {apiError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          error={errors.date}
          max={new Date().toISOString().split('T')[0]}
        />

        <Input
          label="Subject"
          type="text"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          error={errors.subject}
          placeholder="Enter feedback subject"
        />

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <div className="flex gap-4">
            {Object.values(FeedbackType).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={form.type === t}
                  onChange={() => setForm({ ...form, type: t })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
          <textarea
            value={form.details}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
            rows={6}
            className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              errors.details ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="Describe your feedback in detail..."
          />
          {errors.details && <p className="mt-1 text-sm text-red-600">{errors.details}</p>}
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" isLoading={isSubmitting}>
            Create Feedback
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push('/feedback')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
