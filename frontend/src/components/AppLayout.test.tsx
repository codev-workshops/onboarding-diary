import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test } from 'vitest';
import { AppLayout } from './AppLayout';

test('renders the primary navigation and the active route', () => {
  render(
    <MemoryRouter initialEntries={['/tasks']}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/tasks" element={<p>Task Log</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
  expect(screen.getByText('Task Log')).toBeInTheDocument();
});
