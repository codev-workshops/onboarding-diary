import {
  Alert,
  Box,
  Breadcrumbs,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, Navigate, useParams } from 'react-router-dom';
import {
  FEEDBACK_TYPES,
  ISSUE_STATUSES,
  TASK_STATUSES,
  type Feedback,
  type Issue,
  type Note,
  type Task,
} from '../../api/diaryTypes';
import { getErrorMessage } from '../../api/errors';
import { fetchRecruit, recruitDashboardSource } from '../../api/manager';
import { DashboardView } from '../../components/dashboard/DashboardView';
import type { Column } from '../../components/diary/EntryList';
import { EnumChip } from '../../components/diary/EnumChip';
import { enumLabel, formatDate } from '../../utils/labels';
import { RecruitLog } from './RecruitLog';
import { RecruitStatusChip } from './RecruitStatusChip';

const TABS = ['overview', 'tasks', 'issues', 'feedback', 'notes'] as const;
type TabKey = (typeof TABS)[number];
const TAB_LABELS: Record<TabKey, string> = {
  overview: 'Overview',
  tasks: 'Tasks',
  issues: 'Issues',
  feedback: 'Feedback',
  notes: 'Shared notes',
};

const date = { header: 'Date', width: 120 };

const TASK_COLUMNS: Column<Task>[] = [
  { ...date, render: (t) => formatDate(t.entryDate) },
  { header: 'Title', render: (t) => t.title },
  { header: 'Category', render: (t) => enumLabel(t.category), width: 140 },
  { header: 'Status', render: (t) => <EnumChip value={t.status} />, width: 130 },
  {
    header: 'Priority',
    render: (t) => <EnumChip value={t.priority} variant="outlined" />,
    width: 110,
  },
];

const ISSUE_COLUMNS: Column<Issue>[] = [
  { ...date, render: (i) => formatDate(i.entryDate) },
  {
    header: 'Title',
    render: (i) => (
      <Box>
        <Typography variant="body2">{i.title}</Typography>
        {i.resolutionNotes && (
          <Typography variant="caption" color="text.secondary">
            Resolution: {i.resolutionNotes}
          </Typography>
        )}
      </Box>
    ),
  },
  { header: 'Severity', render: (i) => <EnumChip value={i.severity} />, width: 120 },
  { header: 'Status', render: (i) => <EnumChip value={i.status} />, width: 130 },
];

const FEEDBACK_COLUMNS: Column<Feedback>[] = [
  { ...date, render: (f) => formatDate(f.entryDate) },
  {
    header: 'Subject',
    render: (f) => (
      <Box>
        <Typography variant="body2">{f.subject}</Typography>
        <Typography variant="caption" color="text.secondary">
          {f.details}
        </Typography>
      </Box>
    ),
  },
  { header: 'Type', render: (f) => <EnumChip value={f.type} />, width: 130 },
];

const NOTE_COLUMNS: Column<Note>[] = [
  { ...date, render: (n) => formatDate(n.entryDate) },
  {
    header: 'Note',
    render: (n) => (
      <Box>
        <Typography variant="body2" fontWeight={500}>
          {n.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
          {n.content}
        </Typography>
      </Box>
    ),
  },
  {
    header: 'Tags',
    render: (n) => (
      <Stack direction="row" gap={0.5} flexWrap="wrap">
        {n.tags.map((tag) => (
          <Chip key={tag} size="small" label={tag} />
        ))}
      </Stack>
    ),
    width: 200,
  },
];

function card(title: string, subtitle: string, chips: string[]) {
  return (
    <Stack spacing={0.75}>
      <Typography fontWeight={600}>{title}</Typography>
      <Typography variant="caption" color="text.secondary">
        {subtitle}
      </Typography>
      {chips.length > 0 && (
        <Stack direction="row" spacing={1}>
          {chips.map((chip) => (
            <EnumChip key={chip} value={chip} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function RecruitDetailPage() {
  const params = useParams();
  const recruitId = Number(params.recruitId);
  const tab = (params.tab ?? 'overview') as TabKey;
  const recruit = useQuery({
    queryKey: ['recruit', recruitId, 'summary'],
    queryFn: () => fetchRecruit(recruitId),
    enabled: Number.isInteger(recruitId),
  });

  if (!TABS.includes(tab) || !Number.isInteger(recruitId)) {
    return <Navigate to="/team" replace />;
  }
  if (recruit.isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }
  if (recruit.error || !recruit.data) {
    return (
      <Alert severity="error">
        {getErrorMessage(recruit.error, 'Could not load this recruit')}
      </Alert>
    );
  }

  const r = recruit.data;
  const base = `/team/${recruitId}`;
  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link component={RouterLink} to="/team">
          Team
        </Link>
        <Typography color="text.primary">{r.fullName}</Typography>
      </Breadcrumbs>
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
        <Typography variant="h5" component="h1" fontWeight={600}>
          {r.fullName}
        </Typography>
        <RecruitStatusChip recruit={r} />
      </Stack>
      <Typography color="text.secondary" mb={2}>
        {[r.jobTitle, r.department, r.email, `Started ${formatDate(r.startDate)}`]
          .filter(Boolean)
          .join(' · ')}
      </Typography>
      <Tabs value={tab} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2 }}>
        {TABS.map((key) => (
          <Tab
            key={key}
            value={key}
            label={TAB_LABELS[key]}
            component={RouterLink}
            to={key === 'overview' ? base : `${base}/${key}`}
          />
        ))}
      </Tabs>
      {tab === 'overview' && (
        <DashboardView
          source={recruitDashboardSource(recruitId)}
          cacheKey={['recruit', recruitId]}
          linkBase={base}
          notesLabel="Shared notes"
        />
      )}
      {tab === 'tasks' && (
        <RecruitLog<Task>
          key="tasks"
          recruitId={recruitId}
          resource="tasks"
          columns={TASK_COLUMNS}
          renderCard={(t) =>
            card(t.title, `${formatDate(t.entryDate)} · ${enumLabel(t.category)}`, [t.status])
          }
          filter={{ key: 'status', label: 'Status', options: TASK_STATUSES }}
          emptyMessage="No tasks logged yet."
        />
      )}
      {tab === 'issues' && (
        <RecruitLog<Issue>
          key="issues"
          recruitId={recruitId}
          resource="issues"
          columns={ISSUE_COLUMNS}
          renderCard={(i) => card(i.title, formatDate(i.entryDate), [i.severity, i.status])}
          filter={{ key: 'status', label: 'Status', options: ISSUE_STATUSES }}
          emptyMessage="No issues logged."
        />
      )}
      {tab === 'feedback' && (
        <RecruitLog<Feedback>
          key="feedback"
          recruitId={recruitId}
          resource="feedback"
          columns={FEEDBACK_COLUMNS}
          renderCard={(f) => card(f.subject, formatDate(f.entryDate), [f.type])}
          filter={{ key: 'type', label: 'Type', options: FEEDBACK_TYPES }}
          emptyMessage="No feedback submitted."
        />
      )}
      {tab === 'notes' && (
        <RecruitLog<Note>
          key="notes"
          recruitId={recruitId}
          resource="notes"
          columns={NOTE_COLUMNS}
          renderCard={(n) => card(n.title, formatDate(n.entryDate), [])}
          emptyMessage="No notes have been shared with you."
          note="Only notes the recruit chose to share are shown."
        />
      )}
    </Box>
  );
}
