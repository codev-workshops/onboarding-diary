'use client';

import React, { useState, useId } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import DatePicker from '@/components/ui/DatePicker';
import Button from '@/components/ui/Button';
import { issueApi } from '@/services/api';
import { IssueEntry, IssueStatus, IssueSeverity, CreateIssueRequest, UpdateIssueRequest } from '@/types';
import { getTodayString, formatDateForInput } from '@/utils/formatters';

interface IssueFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  issue: IssueEntry | null;
}

const severityOptions = [
  { value: IssueSeverity.Low, label: 'Low' },
  { value: IssueSeverity.Medium, label: 'Medium' },
  { value: IssueSeverity.High, label: 'High' },
  { value: IssueSeverity.Critical, label: 'Critical' },
];

const statusOptions = [
  { value: IssueStatus.Open, label: 'Open' },
  { value: IssueStatus.InProgress, label: 'In Progress' },
  { value: IssueStatus.Resolved, label: 'Resolved' },
  { value: IssueStatus.Closed, label: 'Closed' },
];

export default function IssueFormModal({ isOpen, onClose, onSuccess, issue }: IssueFormModalProps) {
  if (!isOpen) return null;

  return (
    <IssueFormModalInner
      onClose={onClose}
      onSuccess={onSuccess}
      issue={issue}
    />
  );
}

function IssueFormModalInner({
  onClose,
  onSuccess,
  issue,
}: {
  onClose: () => void;
  onSuccess: (message: string) => void;
  issue: IssueEntry | null;
}) {
  const isEditing = !!issue;
  const formId = useId();

  const [date, setDate] = useState(() => issue ? formatDateForInput(issue.date) : getTodayString());
  const [title, setTitle] = useState(() => issue?.title ?? '');
  const [description, setDescription] = useState(() => issue?.description ?? '');
  const [severity, setSeverity] = useState<IssueSeverity>(() => (issue?.severity as IssueSeverity) ?? IssueSeverity.Medium);
  const [status, setStatus] = useState<IssueStatus>(() => (issue?.status as IssueStatus) ?? IssueStatus.Open);
  const [resolutionNotes, setResolutionNotes] = useState(() => issue?.resolutionNotes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const requiresResolutionNotes = status === IssueStatus.Resolved || status === IssueStatus.Closed;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!date) {
      newErrors.date = 'Date is required.';
    } else if (new Date(date) > new Date(getTodayString())) {
      newErrors.date = 'Date cannot be in the future.';
    }

    if (!title.trim()) {
      newErrors.title = 'Title is required.';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters.';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Title must not exceed 200 characters.';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required.';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters.';
    } else if (description.trim().length > 5000) {
      newErrors.description = 'Description must not exceed 5000 characters.';
    }

    if (requiresResolutionNotes) {
      if (!resolutionNotes.trim()) {
        newErrors.resolutionNotes = 'Resolution notes are required when status is Resolved or Closed.';
      } else if (resolutionNotes.trim().length < 10) {
        newErrors.resolutionNotes = 'Resolution notes must be at least 10 characters.';
      } else if (resolutionNotes.trim().length > 5000) {
        newErrors.resolutionNotes = 'Resolution notes must not exceed 5000 characters.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      if (isEditing && issue) {
        const updateData: UpdateIssueRequest = {
          date,
          title: title.trim(),
          description: description.trim(),
          severity,
          status,
          resolutionNotes: requiresResolutionNotes ? resolutionNotes.trim() : null,
        };
        await issueApi.updateIssue(issue.id, updateData);
        onSuccess('Issue updated successfully.');
      } else {
        const createData: CreateIssueRequest = {
          date,
          title: title.trim(),
          description: description.trim(),
          severity,
          status,
          resolutionNotes: requiresResolutionNotes ? resolutionNotes.trim() : null,
        };
        await issueApi.createIssue(createData);
        onSuccess('Issue created successfully.');
      }
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'An error occurred.'
          : 'An error occurred.';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Edit Issue' : 'New Issue'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DatePicker
            label="Date"
            value={date}
            max={getTodayString()}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
            required
          />
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            placeholder="Issue title"
            required
          />
        </div>

        <div>
          <label htmlFor={`${formId}-description`} className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id={`${formId}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              errors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
            }`}
            placeholder="Describe the issue in detail..."
            required
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Severity"
            options={severityOptions}
            value={severity}
            onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
            error={errors.severity}
            required
          />
          <Select
            label="Status"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as IssueStatus)}
            error={errors.status}
            required
          />
        </div>

        {requiresResolutionNotes && (
          <div>
            <label htmlFor={`${formId}-resolution-notes`} className="block text-sm font-medium text-gray-700 mb-1">
              Resolution Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              id={`${formId}-resolution-notes`}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={3}
              className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                errors.resolutionNotes ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe how the issue was resolved..."
              required
            />
            {errors.resolutionNotes && <p className="mt-1 text-sm text-red-600">{errors.resolutionNotes}</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Update Issue' : 'Create Issue'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
