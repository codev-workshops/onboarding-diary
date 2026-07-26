import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createTaskBody } from '@onboarding-diary/shared';

import { ApiError } from './apiClient.js';
import { applyServerErrors, useZodForm } from './forms.js';

const KNOWN_FIELDS = ['title', 'entryDate'] as const;

function TaskForm({ submitError }: { submitError?: unknown }) {
  const form = useZodForm(createTaskBody, {
    defaultValues: { title: '', entryDate: '2026-07-01' },
  });

  const onSubmit = form.handleSubmit(() => {
    if (submitError !== undefined) applyServerErrors(submitError, form.setError, KNOWN_FIELDS);
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor="title">Title</label>
      <input id="title" {...form.register('title')} />
      <p role="alert">{form.formState.errors.title?.message}</p>
      <p data-testid="root-error">{form.formState.errors.root?.message}</p>
      <button type="submit">Save</button>
    </form>
  );
}

describe('useZodForm', () => {
  it('validates with the shared schema before submitting', async () => {
    const user = userEvent.setup();
    render(<TaskForm />);

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('required');
  });
});

describe('applyServerErrors', () => {
  it('renders a 422 detail inline on the named field', async () => {
    const user = userEvent.setup();
    render(
      <TaskForm
        submitError={
          new ApiError({
            status: 422,
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: [{ field: 'title', message: 'Title is already used today' }],
          })
        }
      />,
    );

    await user.type(screen.getByLabelText('Title'), 'Complete VPN setup');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Title is already used today');
    expect(screen.getByTestId('root-error')).toBeEmptyDOMElement();
  });

  it('falls back to a form-level error for a detail-free failure or an unknown field', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <TaskForm
        submitError={
          new ApiError({ status: 409, code: 'CONFLICT', message: 'That conflicts with something' })
        }
      />,
    );

    await user.type(screen.getByLabelText('Title'), 'Complete VPN setup');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByTestId('root-error')).toHaveTextContent('That conflicts with something');
    unmount();

    render(
      <TaskForm
        submitError={
          new ApiError({
            status: 422,
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: [{ field: 'ownerId', message: 'Unknown owner' }],
          })
        }
      />,
    );
    await user.type(screen.getByLabelText('Title'), 'Complete VPN setup');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByTestId('root-error')).toHaveTextContent('Unknown owner');
  });

  it('ignores a non-API error so unexpected failures bubble up', () => {
    expect(applyServerErrors(new Error('boom'), () => undefined, KNOWN_FIELDS)).toBe(false);
  });
});
