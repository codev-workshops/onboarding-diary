import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Pagination from '../Pagination';

const page = (pageIndex: number, totalPages: number) => ({
  content: [],
  page: pageIndex,
  size: 20,
  totalElements: totalPages * 20,
  totalPages,
});

test('offers a way back from a page past the end', async () => {
  const onChange = vi.fn();
  render(<Pagination page={page(2, 1)} onChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: 'Go to first page' }));
  expect(onChange).toHaveBeenCalledWith(0);
});

test('returns to the last valid page when several remain', async () => {
  const onChange = vi.fn();
  render(<Pagination page={page(5, 3)} onChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: 'Go to page 3' }));
  expect(onChange).toHaveBeenCalledWith(2);
});

test('renders nothing for a single in-range page', () => {
  const { container } = render(<Pagination page={page(0, 1)} onChange={vi.fn()} />);
  expect(container).toBeEmptyDOMElement();
});
