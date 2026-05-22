import { useEffect, useState } from 'react'
import { Card, Col, Row, Spin, Statistic, Typography } from 'antd'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, LineChart, Line, ResponsiveContainer,
} from 'recharts'
import { analyticsApi, type AnalyticsData } from '../api/analytics'
import { useRecruit } from '../context/RecruitContext'

const { Title } = Typography

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2']

function mapToChartData(data: Record<string, number>) {
  return Object.entries(data).map(([name, value]) => ({ name, value }))
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const { selectedRecruitId, isManagerView, loading: recruitLoading } = useRecruit()

  useEffect(() => {
    if (recruitLoading) return
    setLoading(true)
    const promise = isManagerView && selectedRecruitId
      ? analyticsApi.getForUser(selectedRecruitId)
      : analyticsApi.get()
    promise.then((res) => setData(res.data)).catch(() => {}).finally(() => setLoading(false))
  }, [selectedRecruitId, isManagerView, recruitLoading])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
  if (!data) return <div>Failed to load analytics</div>

  const taskStatusData = mapToChartData(data.tasksByStatus)
  const taskCategoryData = mapToChartData(data.tasksByCategory)
  const issueSeverityData = mapToChartData(data.issuesBySeverity)
  const feedbackTypeData = mapToChartData(data.feedbackByType)

  return (
    <div>
      <Title level={3}>Analytics</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8}>
          <Card><Statistic title="Total Entries" value={data.totalEntries} /></Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card><Statistic title="Task Completion" value={Math.round(data.taskCompletionRate)} suffix="%" /></Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card><Statistic title="Weekly Activity" value={data.weeklyActivity.length} suffix="weeks" /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Tasks by Status">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {taskStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Tasks by Category">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taskCategoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#1677ff" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Issues by Severity">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={issueSeverityData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {issueSeverityData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Feedback by Type">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={feedbackTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#52c41a" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {data.weeklyActivity.length > 0 && (
        <Card title="Weekly Activity Trend" style={{ marginTop: 16 }}>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="tasks" stroke="#1677ff" strokeWidth={2} name="Tasks" />
              <Line type="monotone" dataKey="issues" stroke="#f5222d" strokeWidth={2} name="Issues" />
              <Line type="monotone" dataKey="feedback" stroke="#52c41a" strokeWidth={2} name="Feedback" />
              <Line type="monotone" dataKey="notes" stroke="#faad14" strokeWidth={2} name="Notes" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}
