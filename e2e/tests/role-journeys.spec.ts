import { test, expect } from '@playwright/test';
import { generateEmail } from './helpers';

/**
 * Per-role end-to-end journeys:
 * register → login → CRUD in all four categories → dashboard → report → logout
 *
 * These tests exercise the API directly (API-level E2E) since the frontend
 * may not be running in all CI environments.
 */

const API_BASE = process.env.API_BASE_URL || 'https://localhost:7030';
const ADMIN_EMAIL = 'admin@onboardingdiary.com';
const ADMIN_PASSWORD = 'Admin@123';

test.describe('Recruit Journey', () => {
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  test('Register and Login', async ({ request }) => {
    const email = generateEmail('journey_recruit');
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: { email, password: 'Str0ng!Pass1', name: 'Journey Recruit', department: 'Engineering', startDate: new Date().toISOString() },
      ignoreHTTPSErrors: true,
    });
    expect(regRes.status()).toBe(201);

    const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
      data: { email, password: 'Str0ng!Pass1' },
      ignoreHTTPSErrors: true,
    });
    expect(loginRes.status()).toBe(200);
    const body = await loginRes.json();
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
    userId = body.user.id;
  });

  test('CRUD Tasks', async ({ request }) => {
    const headers = { Authorization: `Bearer ${accessToken}` };

    const createRes = await request.post(`${API_BASE}/api/tasks`, {
      data: { date: new Date().toISOString(), title: 'Journey Task', description: 'Task desc', category: 'Training', status: 'NotStarted', priority: 'Medium' },
      headers, ignoreHTTPSErrors: true,
    });
    expect(createRes.status()).toBe(201);
    const { task } = await createRes.json();

    const getRes = await request.get(`${API_BASE}/api/tasks/${task.id}`, { headers, ignoreHTTPSErrors: true });
    expect(getRes.status()).toBe(200);

    const updateRes = await request.put(`${API_BASE}/api/tasks/${task.id}`, {
      data: { date: new Date().toISOString(), title: 'Journey Task Updated', description: 'Updated desc', category: 'Training', status: 'InProgress', priority: 'High' },
      headers, ignoreHTTPSErrors: true,
    });
    expect(updateRes.status()).toBe(200);

    const listRes = await request.get(`${API_BASE}/api/tasks`, { headers, ignoreHTTPSErrors: true });
    expect(listRes.status()).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.tasks.length).toBeGreaterThanOrEqual(1);

    const deleteRes = await request.delete(`${API_BASE}/api/tasks/${task.id}`, { headers, ignoreHTTPSErrors: true });
    expect(deleteRes.status()).toBe(204);
  });

  test('CRUD Issues', async ({ request }) => {
    const headers = { Authorization: `Bearer ${accessToken}` };

    const createRes = await request.post(`${API_BASE}/api/issues`, {
      data: { date: new Date().toISOString(), title: 'Journey Issue', description: 'A valid description long enough', severity: 'Medium', status: 'Open' },
      headers, ignoreHTTPSErrors: true,
    });
    expect(createRes.status()).toBe(201);
    const { issue } = await createRes.json();

    const getRes = await request.get(`${API_BASE}/api/issues/${issue.id}`, { headers, ignoreHTTPSErrors: true });
    expect(getRes.status()).toBe(200);

    const updateRes = await request.put(`${API_BASE}/api/issues/${issue.id}`, {
      data: { title: 'Journey Issue Updated', description: 'A valid description long enough', severity: 'Low', status: 'InProgress' },
      headers, ignoreHTTPSErrors: true,
    });
    expect(updateRes.status()).toBe(200);

    const deleteRes = await request.delete(`${API_BASE}/api/issues/${issue.id}`, { headers, ignoreHTTPSErrors: true });
    expect(deleteRes.status()).toBe(204);
  });

  test('CRUD Feedback', async ({ request }) => {
    const headers = { Authorization: `Bearer ${accessToken}` };

    const createRes = await request.post(`${API_BASE}/api/feedback`, {
      data: { date: new Date().toISOString(), subject: 'Journey Feedback', type: 'Positive', details: 'This feedback is detailed enough to pass the minimum character limit' },
      headers, ignoreHTTPSErrors: true,
    });
    expect(createRes.status()).toBe(201);
    const { feedback } = await createRes.json();

    const getRes = await request.get(`${API_BASE}/api/feedback/${feedback.id}`, { headers, ignoreHTTPSErrors: true });
    expect(getRes.status()).toBe(200);

    const updateRes = await request.put(`${API_BASE}/api/feedback/${feedback.id}`, {
      data: { subject: 'Journey FB Updated', type: 'Concern', details: 'Updated feedback details meeting the minimum chars' },
      headers, ignoreHTTPSErrors: true,
    });
    expect(updateRes.status()).toBe(200);

    const deleteRes = await request.delete(`${API_BASE}/api/feedback/${feedback.id}`, { headers, ignoreHTTPSErrors: true });
    expect(deleteRes.status()).toBe(204);
  });

  test('CRUD Notes', async ({ request }) => {
    const headers = { Authorization: `Bearer ${accessToken}` };

    const createRes = await request.post(`${API_BASE}/api/notes`, {
      data: { date: new Date().toISOString(), title: 'Journey Note', content: 'Note content', tags: ['onboarding'], isPinned: false },
      headers, ignoreHTTPSErrors: true,
    });
    expect(createRes.status()).toBe(201);
    const { note } = await createRes.json();

    const getRes = await request.get(`${API_BASE}/api/notes/${note.id}`, { headers, ignoreHTTPSErrors: true });
    expect(getRes.status()).toBe(200);

    const updateRes = await request.put(`${API_BASE}/api/notes/${note.id}`, {
      data: { title: 'Journey Note Updated', content: 'Updated content', tags: ['onboarding', 'updated'], isPinned: true },
      headers, ignoreHTTPSErrors: true,
    });
    expect(updateRes.status()).toBe(200);

    const deleteRes = await request.delete(`${API_BASE}/api/notes/${note.id}`, { headers, ignoreHTTPSErrors: true });
    expect(deleteRes.status()).toBe(204);
  });

  test('Dashboard and Stats', async ({ request }) => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const statsRes = await request.get(`${API_BASE}/api/tasks/stats`, { headers, ignoreHTTPSErrors: true });
    expect(statsRes.status()).toBe(200);
  });

  test('Generate and Download Report', async ({ request }) => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const genRes = await request.post(`${API_BASE}/api/reports/generate`, {
      data: { startDate: new Date(Date.now() - 30 * 86400000).toISOString(), endDate: new Date().toISOString(), categories: ['all'], format: 'Pdf' },
      headers, ignoreHTTPSErrors: true,
    });
    expect(genRes.status()).toBe(200);
    const { reportId, downloadUrl } = await genRes.json();
    expect(reportId).toBeTruthy();

    const dlRes = await request.get(`${API_BASE}${downloadUrl}`, { headers, ignoreHTTPSErrors: true });
    expect(dlRes.status()).toBe(200);
  });

  test('Logout', async ({ request }) => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const res = await request.post(`${API_BASE}/api/auth/logout`, {
      data: { refreshToken },
      headers, ignoreHTTPSErrors: true,
    });
    expect([200, 204]).toContain(res.status());
  });
});

test.describe('Manager Journey', () => {
  let managerToken: string;
  let managerId: string;
  let recruitToken: string;
  let recruitId: string;

  test('Setup: Create Manager and assigned Recruit', async ({ request }) => {
    // Create manager
    const mgrEmail = generateEmail('journey_mgr');
    const mgrRegRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: { email: mgrEmail, password: 'Str0ng!Pass1', name: 'Journey Manager', department: 'Engineering', startDate: new Date().toISOString() },
      ignoreHTTPSErrors: true,
    });
    expect(mgrRegRes.status()).toBe(201);

    // Login as admin to promote
    const adminLogin = await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      ignoreHTTPSErrors: true,
    });
    const adminBody = await adminLogin.json();
    const adminHeaders = { Authorization: `Bearer ${adminBody.accessToken}` };

    const mgrBody = await mgrRegRes.json();
    managerId = mgrBody.userId;
    await request.put(`${API_BASE}/api/users/${managerId}/role`, {
      data: { role: 'Manager' },
      headers: adminHeaders, ignoreHTTPSErrors: true,
    });

    // Create recruit assigned to manager
    const recEmail = generateEmail('journey_rec');
    const recRegRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: { email: recEmail, password: 'Str0ng!Pass1', name: 'Journey Recruit', department: 'Engineering', startDate: new Date().toISOString() },
      ignoreHTTPSErrors: true,
    });
    expect(recRegRes.status()).toBe(201);
    const recBody = await recRegRes.json();
    recruitId = recBody.userId;

    // Assign recruit to manager via test seed endpoint
    await request.post(`${API_BASE}/api/test/assign-manager`, {
      data: { recruitId, managerId },
      ignoreHTTPSErrors: true,
    });

    // Login as manager
    const mgrLoginRes = await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: mgrEmail, password: 'Str0ng!Pass1' },
      ignoreHTTPSErrors: true,
    });
    const mgrLoginBody = await mgrLoginRes.json();
    managerToken = mgrLoginBody.accessToken;

    // Login as recruit
    const recLoginRes = await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: recEmail, password: 'Str0ng!Pass1' },
      ignoreHTTPSErrors: true,
    });
    const recLoginBody = await recLoginRes.json();
    recruitToken = recLoginBody.accessToken;
  });

  test('Manager can view assigned recruit tasks (read-only)', async ({ request }) => {
    const recHeaders = { Authorization: `Bearer ${recruitToken}` };
    const mgrHeaders = { Authorization: `Bearer ${managerToken}` };

    // Recruit creates a task
    await request.post(`${API_BASE}/api/tasks`, {
      data: { date: new Date().toISOString(), title: 'Mgr View Task', description: 'Desc', category: 'Training', status: 'NotStarted', priority: 'Low' },
      headers: recHeaders, ignoreHTTPSErrors: true,
    });

    // Manager lists recruit's tasks
    const listRes = await request.get(`${API_BASE}/api/tasks?recruitId=${recruitId}`, {
      headers: mgrHeaders, ignoreHTTPSErrors: true,
    });
    expect(listRes.status()).toBe(200);
    const body = await listRes.json();
    expect(body.tasks.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Admin Journey', () => {
  let adminToken: string;

  test('Admin login', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      ignoreHTTPSErrors: true,
    });
    expect(loginRes.status()).toBe(200);
    const body = await loginRes.json();
    adminToken = body.accessToken;
  });

  test('Admin views aggregated feedback', async ({ request }) => {
    const headers = { Authorization: `Bearer ${adminToken}` };
    const res = await request.get(`${API_BASE}/api/feedback?limit=100`, { headers, ignoreHTTPSErrors: true });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.feedback).toBeDefined();
  });

  test('Admin lists all users', async ({ request }) => {
    const headers = { Authorization: `Bearer ${adminToken}` };
    const res = await request.get(`${API_BASE}/api/users?limit=20`, { headers, ignoreHTTPSErrors: true });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.users.length).toBeGreaterThanOrEqual(1);
  });

  test('Admin generates org-wide report', async ({ request }) => {
    const headers = { Authorization: `Bearer ${adminToken}` };
    const res = await request.post(`${API_BASE}/api/reports/generate`, {
      data: { startDate: new Date(Date.now() - 30 * 86400000).toISOString(), endDate: new Date().toISOString(), categories: ['all'], format: 'Csv' },
      headers, ignoreHTTPSErrors: true,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.reportId).toBeTruthy();
  });
});
