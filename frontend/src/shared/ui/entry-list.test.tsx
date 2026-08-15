import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/test-utils';
import { EntryList, type EntryColumn } from './entry-list';

interface Row {
  id: number;
  title: string;
}

const columns: EntryColumn<Row>[] = [{ key: 'title', label: 'Title', primary: true, render: (row) => row.title }];

describe('EntryList', () => {
  it('renders rows and raises edit and delete callbacks', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    renderWithProviders(
      <EntryList
        rows={[{ id: 7, title: 'Set up laptop' }]}
        columns={columns}
        total={1}
        page={1}
        pageSize={10}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText('Set up laptop')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Edit entry 7'));
    await user.click(screen.getByLabelText('Delete entry 7'));

    expect(onEdit).toHaveBeenCalledWith({ id: 7, title: 'Set up laptop' });
    expect(onDelete).toHaveBeenCalledWith({ id: 7, title: 'Set up laptop' });
  });

  it('hides row actions when no handlers are supplied', () => {
    renderWithProviders(
      <EntryList
        rows={[{ id: 7, title: 'Read only entry' }]}
        columns={columns}
        total={1}
        page={1}
        pageSize={10}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Edit entry 7')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete entry 7')).not.toBeInTheDocument();
  });
});
