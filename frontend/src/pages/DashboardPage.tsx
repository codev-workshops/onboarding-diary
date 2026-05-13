import { useEffect, useState } from 'react';
import { Grid, Box, Typography, LinearProgress, Card, CardContent } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BugReportIcon from '@mui/icons-material/BugReport';
import FeedbackIcon from '@mui/icons-material/Feedback';
import NoteIcon from '@mui/icons-material/Note';
import SummaryCard from '@/components/dashboard/SummaryCard';
import CategoryPieChart from '@/components/dashboard/charts/CategoryPieChart';
import StatusBarChart from '@/components/dashboard/charts/StatusBarChart';
import SeverityChart from '@/components/dashboard/charts/SeverityChart';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { dashboardService } from '@/services/dashboardService';
import { DashboardResponse } from '@/types/common';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService
      .getDashboard()
      .then(setData)
      .catch(() => {
        setData({
          totalTasks: 0,
          completedTasks: 0,
          openIssues: 0,
          feedbackCount: 0,
          notesCount: 0,
          recentTasks: [],
          recentIssues: [],
          tasksByCategory: {},
          tasksByStatus: {},
          issuesBySeverity: {},
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const completionPct = data.totalTasks > 0 ? Math.round((data.completedTasks / data.totalTasks) * 100) : 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            icon={<AssignmentIcon sx={{ fontSize: 48 }} />}
            value={data.completedTasks}
            label={`of ${data.totalTasks} Tasks Completed`}
            gradient="linear-gradient(135deg, #2E7D32, #66BB6A)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            icon={<BugReportIcon sx={{ fontSize: 48 }} />}
            value={data.openIssues}
            label="Open Issues"
            gradient="linear-gradient(135deg, #F44336, #EF5350)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            icon={<FeedbackIcon sx={{ fontSize: 48 }} />}
            value={data.feedbackCount}
            label="Feedback Given"
            gradient="linear-gradient(135deg, #00897B, #4DB6AC)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            icon={<NoteIcon sx={{ fontSize: 48 }} />}
            value={data.notesCount}
            label="Notes Created"
            gradient="linear-gradient(135deg, #FF9800, #FFB74D)"
          />
        </Grid>
      </Grid>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6">Task Completion Progress</Typography>
            <Typography variant="h6" color="primary" fontWeight={700}>
              {completionPct}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={completionPct}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <CategoryPieChart data={data.tasksByCategory} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatusBarChart data={data.tasksByStatus} />
        </Grid>
        <Grid item xs={12} md={4}>
          <SeverityChart data={data.issuesBySeverity} />
        </Grid>
      </Grid>
    </Box>
  );
}
