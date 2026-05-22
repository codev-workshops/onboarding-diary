import { useEffect, useState, useCallback } from 'react'
import { Table, Button, Space, Tag, Modal, message, Select, DatePicker, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { issuesApi } from '../../api/issues'
import { useRecruit } from '../../context/RecruitContext'
import type { Issue, IssueSeverity, IssueStatus } from '../../types'
import IssueForm from './IssueForm'

const { Title } = Typography
const { RangePicker } = DatePicker

const severityColors: Record<IssueSeverity, string> = { LOW: 'green', MEDIUM: 'gold', HIGH: 'orange', CRITICAL: 'red' }
const statusColors: Record<IssueStatus, string> = { OPEN: 'red', IN_PROGRESS: 'processing', RESOLVED: 'success', CLOSED: 'default' }

export default function IssueList() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Issue | null>(null)
  const [filters, setFilters] = useState<Record<string, string | undefined>>({})
  const { selectedRecruitId, isManagerView, loading: recruitLoading } = useRecruit()

  const fetch = useCallback(async () => {
    if (recruitLoading) return
    setLoading(true)
    try {
      const params = { page, size: 20, ...filters }
      const res = isManagerView && selectedRecruitId
        ? await issuesApi.listForUser(selectedRecruitId, params)
        : await issuesApi.list(params)
      setIssues(res.data.content)
      setTotal(res.data.totalElements)
    } catch { message.error('Failed to load issues') }
    setLoading(false)
  }, [page, filters, selectedRecruitId, isManagerView, recruitLoading])

  useEffect(() => { fetch() }, [fetch])

  const handleDelete = (id: string) => {
    Modal.confirm({ title: 'Delete this issue?', onOk: async () => { await issuesApi.delete(id); message.success('Deleted'); fetch() } })
  }

  const handleSave = () => { setModalOpen(false); setEditing(null); fetch() }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Issues</Title>
{!isManagerView && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true) }}>New Issue</Button>}
      </div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select placeholder="Severity" allowClear style={{ width: 130 }}
          onChange={(v) => setFilters(f => ({ ...f, severity: v }))}
          options={['LOW','MEDIUM','HIGH','CRITICAL'].map(v => ({ label: v, value: v }))} />
        <Select placeholder="Status" allowClear style={{ width: 130 }}
          onChange={(v) => setFilters(f => ({ ...f, status: v }))}
          options={['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(v => ({ label: v, value: v }))} />
        <RangePicker onChange={(dates) => {
          if (dates?.[0] && dates?.[1]) setFilters(f => ({ ...f, dateFrom: dates[0]!.format('YYYY-MM-DD'), dateTo: dates[1]!.format('YYYY-MM-DD') }))
          else setFilters(f => ({ ...f, dateFrom: undefined, dateTo: undefined }))
        }} />
      </Space>
      <Table dataSource={issues} rowKey="id" loading={loading}
        pagination={{ current: page + 1, total, pageSize: 20, onChange: (p) => setPage(p - 1) }}
        columns={[
          { title: 'Date', dataIndex: 'date', width: 110 },
          { title: 'Title', dataIndex: 'title' },
          { title: 'Severity', dataIndex: 'severity', render: (v: IssueSeverity) => <Tag color={severityColors[v]}>{v}</Tag> },
          { title: 'Status', dataIndex: 'status', render: (v: IssueStatus) => <Tag color={statusColors[v]}>{v}</Tag> },
          ...(!isManagerView ? [{
            title: 'Actions', width: 120,
            render: (_: unknown, r: Issue) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(r); setModalOpen(true) }} />
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
              </Space>
            ),
          }] : []),
        ]}
      />
      <Modal title={editing ? 'Edit Issue' : 'New Issue'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null) }} footer={null} destroyOnHidden>
        <IssueForm issue={editing} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null) }} />
      </Modal>
    </div>
  )
}
