import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { expect, test } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import { AppLayout } from './AppLayout';

test('renders the primary navigation and the active route', () => {
  renderWithProviders(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/tasks" element={<p>Task Log</p>} />
      </Route>
    </Routes>,
    { route: '/tasks' }
  );

  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
  expect(screen.getByText('Task Log')).toBeInTheDocument();
});
