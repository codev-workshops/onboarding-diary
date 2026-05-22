import { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Progress, Table, Tabs, Typography, Spin } from 'antd'
import {
  CheckSquareOutlined,
  WarningOutlined,
  MessageOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { dashboardApi } from '../api/dashboard'
import { useRecruit } from '../context/RecruitContext'
import type { DashboardData } from '../types'

const { Title } = Typography

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { selectedRecruitId, isManagerView } = useRecruit()

  useEffect(() => {
    setLoading(true)
    const promise = isManagerView && selectedRecruitId
      ? dashboardApi.getForUser(selectedRecruitId)
      : dashboardApi.get()
    promise.then((res) => {
      setData(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [selectedRecruitId, isManagerView])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
  if (!data) return <div>Failed to load dashboard</div>

  const { summary } = data

  return (
    <div>
      <Title level={3}>Dashboard</Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={4}>
          <Card><Statistic title="Total Tasks" value={summary.totalTasks} prefix={<CheckSquareOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card><Statistic title="Completed" value={summary.completedTasks} valueStyle={{ color: '#3f8600' }} /></Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card><Statistic title="Open Issues" value={summary.openIssues} prefix={<WarningOutlined />} valueStyle={{ color: '#cf1322' }} /></Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card><Statistic title="Feedback" value={summary.totalFeedback} prefix={<MessageOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card><Statistic title="Notes" value={summary.totalNotes} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 8 }}>Task Progress</div>
              <Progress type="circle" percent={Math.round(data.taskCompletionRate)} size={80} />
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="tasks" style={{ marginTop: 24 }} items={[
        {
          key: 'tasks',
          label: 'Recent Tasks',
          children: (
            <Table
              dataSource={data.recentTasks}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: 'Date', dataIndex: 'date', width: 110 },
                { title: 'Title', dataIndex: 'title' },
                { title: 'Status', dataIndex: 'status' },
                { title: 'Priority', dataIndex: 'priority' },
              ]}
            />
          ),
        },
        {
          key: 'issues',
          label: 'Recent Issues',
          children: (
            <Table
              dataSource={data.recentIssues}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: 'Date', dataIndex: 'date', width: 110 },
                { title: 'Title', dataIndex: 'title' },
                { title: 'Severity', dataIndex: 'severity' },
                { title: 'Status', dataIndex: 'status' },
              ]}
            />
          ),
        },
        {
          key: 'feedback',
          label: 'Recent Feedback',
          children: (
            <Table
              dataSource={data.recentFeedback}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: 'Date', dataIndex: 'date', width: 110 },
                { title: 'Subject', dataIndex: 'subject' },
                { title: 'Type', dataIndex: 'type' },
              ]}
            />
          ),
        },
        {
          key: 'notes',
          label: 'Recent Notes',
          children: (
            <Table
              dataSource={data.recentNotes}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: 'Date', dataIndex: 'date', width: 110 },
                { title: 'Title', dataIndex: 'title' },
              ]}
            />
          ),
        },
      ]} />
    </div>
  )
}
