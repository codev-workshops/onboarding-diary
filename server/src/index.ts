import cors from 'cors';
import express from 'express';
import { migrate } from './db.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { createEntriesRouter } from './routes/entries.js';
import { reportsRouter } from './routes/reports.js';
import { searchRouter } from './routes/search.js';
import { usersRouter } from './routes/users.js';

migrate();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/tasks', createEntriesRouter('tasks'));
app.use('/api/issues', createEntriesRouter('issues'));
app.use('/api/feedback', createEntriesRouter('feedback'));
app.use('/api/notes', createEntriesRouter('notes'));
app.use('/api/dashboard', dashboardRouter);
app.use('/api/search', searchRouter);
app.use('/api/reports', reportsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'That endpoint does not exist' });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Onboarding Diary API listening on http://localhost:${port}`);
});
