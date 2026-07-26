import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Badge } from './Badge.js';
import { Field } from './Field.js';
import { DateInput, Input, Textarea } from './Input.js';
import { Select } from './Select.js';
import { Table } from './Table.js';

describe('Field', () => {
  it('associates the label, hint, and error with the control it wraps', () => {
    render(
      <Field label="Title" hint="Keep it short" error="Title is required" required>
        {({ id, describedBy, invalid }) => (
          <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>,
    );

    const input = screen.getByLabelText('Title *');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Keep it short Title is required');
    expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
  });

  it('omits the hint and error nodes when there are none', () => {
    render(<Field label="Title">{({ id }) => <Input id={id} />}</Field>);
    expect(screen.getByLabelText('Title')).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('inputs', () => {
  it('renders a date input and a textarea that accept typing', async () => {
    const user = userEvent.setup();
    render(
      <>
        <DateInput aria-label="Entry date" />
        <Textarea aria-label="Description" />
      </>,
    );

    const date = screen.getByLabelText('Entry date');
    expect(date).toHaveAttribute('type', 'date');
    await user.type(date, '2026-07-01');
    expect(date).toHaveValue('2026-07-01');

    await user.type(screen.getByLabelText('Description'), 'Some notes');
    expect(screen.getByLabelText('Description')).toHaveValue('Some notes');
  });
});

describe('Select', () => {
  it('renders a placeholder plus its options and reports the chosen value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Status"
        placeholder="Any status"
        onChange={onChange}
        options={[
          { value: 'OPEN', label: 'Open' },
          { value: 'DONE', label: 'Done' },
        ]}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Status'), 'DONE');
    expect(screen.getByRole('option', { name: 'Any status' })).toHaveValue('');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Status')).toHaveValue('DONE');
  });
});

describe('Table', () => {
  it('renders a row per record and hides secondary columns on narrow viewports', () => {
    render(
      <Table
        caption="Tasks"
        rowKey={(row) => row.id}
        rows={[
          { id: '1', title: 'Setup laptop', category: 'SETUP' },
          { id: '2', title: 'Security training', category: 'TRAINING' },
        ]}
        columns={[
          { key: 'title', header: 'Title', render: (row) => row.title },
          {
            key: 'category',
            header: 'Category',
            secondary: true,
            render: (row) => <Badge tone="info">{row.category}</Badge>,
          },
        ]}
      />,
    );

    expect(screen.getByRole('table', { name: 'Tasks' })).toBeVisible();
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('SETUP')).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Category' }).className).toContain('hidden');
  });
});
