import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '../test-utils';
import { Pagination } from '@/components/ui/Pagination';
import type { PaginationMeta } from '@onboarding-diary/shared';

const baseMeta: PaginationMeta = {
  page: 1,
  limit: 20,
  total_count: 50,
  total_pages: 3,
  has_next: true,
  has_prev: false,
};

describe('Pagination', () => {
  it('renders page info', () => {
    render(<Pagination meta={baseMeta} onPageChange={vi.fn()} />);
    expect(screen.getByText('Page 1 of 3 (50 total)')).toBeInTheDocument();
  });

  it('disables prev button on first page', () => {
    render(<Pagination meta={baseMeta} onPageChange={vi.fn()} />);
    const prevBtn = screen.getByRole('button', { name: /prev/i });
    expect(prevBtn).toBeDisabled();
  });

  it('enables next button when has_next', () => {
    render(<Pagination meta={baseMeta} onPageChange={vi.fn()} />);
    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(nextBtn).not.toBeDisabled();
  });

  it('calls onPageChange with next page', async () => {
    const onPageChange = vi.fn();
    render(<Pagination meta={baseMeta} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with prev page', async () => {
    const onPageChange = vi.fn();
    const meta = { ...baseMeta, page: 2, has_prev: true };
    render(<Pagination meta={meta} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole('button', { name: /prev/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('renders nothing for single page', () => {
    const meta = { ...baseMeta, total_pages: 1, has_next: false };
    const { container } = render(<Pagination meta={meta} onPageChange={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});
