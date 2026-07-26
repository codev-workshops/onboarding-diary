import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Pagination, pageCount } from './Pagination.js';

describe('pageCount', () => {
  it('rounds up and never drops below one page', () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(41, 20)).toBe(3);
  });
});

describe('Pagination', () => {
  it('describes the visible range and disables Previous on the first page', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageSize={20} total={45} onPageChange={onPageChange} />);

    expect(screen.getByRole('status')).toHaveTextContent('1–20 of 45');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('disables Next on the last page and clamps the visible range', () => {
    render(<Pagination page={3} pageSize={20} total={45} onPageChange={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('41–45 of 45');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('reports the requested page and says so when there are no results', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination page={2} pageSize={20} total={45} onPageChange={onPageChange} />,
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange.mock.calls).toEqual([[3], [1]]);

    rerender(<Pagination page={1} pageSize={20} total={0} onPageChange={onPageChange} />);
    expect(screen.getByRole('status')).toHaveTextContent('No results');
  });
});
