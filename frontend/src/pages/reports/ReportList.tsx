import { useEffect, useState, useCallback } from 'react'
import { Table, Button, Card, Form, DatePicker, Select, message, Typography, Space } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { reportsApi } from '../../api/reports'
import { useRecruit } from '../../context/RecruitContext'
import type { ReportItem } from '../../types'

const { Title } = Typography
const { RangePicker } = DatePicker

export default function ReportList() {
  const [reports, setReports] = useState<ReportItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [form] = Form.useForm()
  const { selectedRecruitId, isManagerView } = useRecruit()

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await reportsApi.list({ page, size: 20 })
      setReports(res.data.content)
      setTotal(res.data.totalElements)
    } catch { message.error('Failed to load reports') }
    setLoading(false)
  }, [page])

  useEffect(() => { fetch() }, [fetch])

  const generate = async (values: Record<string, unknown>) => {
    setGenerating(true)
    try {
      const dates = values.dateRange as [{ format: (f: string) => string }, { format: (f: string) => string }]
      await reportsApi.generate({
        dateFrom: dates[0].format('YYYY-MM-DD'),
        dateTo: dates[1].format('YYYY-MM-DD'),
        reportType: values.reportType,
        format: values.format,
        ...(isManagerView && selectedRecruitId ? { userId: selectedRecruitId } : {}),
      })
      message.success('Report generated')
      fetch()
    } catch { message.error('Failed to generate report') }
    setGenerating(false)
  }

  const download = async (report: ReportItem) => {
    try {
      const res = await reportsApi.download(report.id)
      const blob = res.data as Blob
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report.${report.format.toLowerCase()}`
      a.click()
      URL.revokeObjectURL(url)
    } catch { message.error('Download failed') }
  }

  return (
    <div>
      <Title level={3}>Reports</Title>
      <Card title="Generate Report" style={{ marginBottom: 24 }}>
        <Form form={form} onFinish={generate} layout="inline">
          <Form.Item name="dateRange" rules={[{ required: true, message: 'Select dates' }]}>
            <RangePicker />
          </Form.Item>
          <Form.Item name="reportType" rules={[{ required: true }]}>
            <Select placeholder="Type" style={{ width: 130 }}
              options={['TASKS','ISSUES','FEEDBACK','COMBINED'].map(v => ({ label: v, value: v }))} />
          </Form.Item>
          <Form.Item name="format" rules={[{ required: true }]}>
            <Select placeholder="Format" style={{ width: 100 }}
              options={['PDF','CSV'].map(v => ({ label: v, value: v }))} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={generating}>Generate</Button>
          </Form.Item>
        </Form>
      </Card>
      <Table dataSource={reports} rowKey="id" loading={loading}
        pagination={{ current: page + 1, total, pageSize: 20, onChange: (p) => setPage(p - 1) }}
        columns={[
          { title: 'Created', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
          { title: 'Type', dataIndex: 'reportType' },
          { title: 'Format', dataIndex: 'format' },
          { title: 'Period', render: (_: unknown, r: ReportItem) => `${r.dateFrom} - ${r.dateTo}` },
          {
            title: 'Action',
            render: (_: unknown, r: ReportItem) => (
              <Space>
                <Button icon={<DownloadOutlined />} onClick={() => download(r)}>Download</Button>
              </Space>
            ),
          },
        ]}
      />
    </div>
  )
}
