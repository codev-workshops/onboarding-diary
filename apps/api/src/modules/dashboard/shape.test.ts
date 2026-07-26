import { describe, expect, it } from 'vitest';

import { shapeOpenIssues, shapeTaskProgress } from './shape.js';

describe('shapeTaskProgress', () => {
  it('fills missing statuses with zero and rounds the completion percentage', () => {
    expect(
      shapeTaskProgress([
        { key: 'DONE', count: 4 },
        { key: 'IN_PROGRESS', count: 3 },
        { key: 'NOT_STARTED', count: 2 },
        { key: 'BLOCKED', count: 1 },
      ]),
    ).toEqual({
      byStatus: { NOT_STARTED: 2, IN_PROGRESS: 3, BLOCKED: 1, DONE: 4 },
      completed: 4,
      total: 10,
      completionPercent: 40,
    });
  });

  it('reports zero percent for an empty log', () => {
    expect(shapeTaskProgress([])).toMatchObject({ total: 0, completed: 0, completionPercent: 0 });
  });
});

describe('shapeOpenIssues', () => {
  it('counts only open statuses', () => {
    expect(
      shapeOpenIssues([
        { key: 'CRITICAL', status: 'OPEN', count: 1 },
        { key: 'MEDIUM', status: 'IN_PROGRESS', count: 1 },
        { key: 'HIGH', status: 'RESOLVED', count: 5 },
        { key: 'LOW', status: 'WONT_FIX', count: 2 },
      ]),
    ).toEqual({ total: 2, bySeverity: { LOW: 0, MEDIUM: 1, HIGH: 0, CRITICAL: 1 } });
  });
});
