import { render, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import type { TrendDay } from '../../api/tasks';
import { EntriesPerDayChart } from './EntriesPerDayChart';
import { IssueTrendChart } from './IssueTrendChart';
import { TaskCompletionChart } from './TaskCompletionChart';

function day(date: string, values: Partial<TrendDay> = {}): TrendDay {
  return {
    date,
    tasksLogged: 0,
    tasksCompleted: 0,
    issuesOpened: 0,
    issuesResolved: 0,
    feedbackCount: 0,
    noteCount: 0,
    ...values,
  };
}

test('entries chart draws one bar per day and repeats the totals in a table', () => {
  render(
    <EntriesPerDayChart
      days={[
        day('2026-01-01', { tasksLogged: 2, noteCount: 1 }),
        day('2026-01-02', { issuesOpened: 1, feedbackCount: 1 }),
      ]}
    />
  );

  const chart = screen.getByRole('img', { name: /Entries logged per day/ });
  expect(chart.querySelectorAll('rect')).toHaveLength(2);

  const table = screen.getByRole('table', { name: 'Entries logged per day' });
  expect(within(table).getByRole('row', { name: '2026-01-01 3' })).toBeTruthy();
  expect(within(table).getByRole('row', { name: '2026-01-02 2' })).toBeTruthy();
});

test('issue chart names both series and lists opened and resolved counts', () => {
  render(
    <IssueTrendChart
      days={[
        day('2026-01-01', { issuesOpened: 2 }),
        day('2026-01-02', { issuesOpened: 1, issuesResolved: 2 }),
      ]}
    />
  );

  expect(screen.getByRole('img', { name: /Issues opened and resolved per day/ })).toBeTruthy();

  const table = screen.getByRole('table', { name: 'Issues opened and resolved per day' });
  expect(within(table).getByRole('columnheader', { name: 'Opened' })).toBeTruthy();
  expect(within(table).getByRole('columnheader', { name: 'Resolved' })).toBeTruthy();
  expect(within(table).getByRole('row', { name: '2026-01-02 1 2' })).toBeTruthy();
});

test('task completion chart states both counts as text', () => {
  render(<TaskCompletionChart total={4} done={3} open={1} />);

  expect(
    screen.getByRole('img', { name: 'Task completion status, 3 done and 1 open of 4 tasks' })
  ).toBeTruthy();

  const table = screen.getByRole('table', { name: 'Task completion status' });
  expect(within(table).getByRole('row', { name: 'Done 3' })).toBeTruthy();
  expect(within(table).getByRole('row', { name: 'Open 1' })).toBeTruthy();
});

test('charts fall back to a message when there is nothing to draw', () => {
  const empty = [day('2026-01-01'), day('2026-01-02')];

  render(
    <>
      <EntriesPerDayChart days={empty} />
      <IssueTrendChart days={empty} />
      <TaskCompletionChart total={0} done={0} open={0} />
    </>
  );

  expect(screen.getAllByText('Nothing to chart yet.')).toHaveLength(3);
  expect(screen.queryAllByRole('img')).toHaveLength(0);
  expect(screen.queryAllByRole('table')).toHaveLength(0);
});
