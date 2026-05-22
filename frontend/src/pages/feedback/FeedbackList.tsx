import { useEffect, useState, useCallback } from 'react'
import { Table, Button, Space, Tag, Modal, message, Select, DatePicker, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { feedbackApi } from '../../api/feedback'
import type { Feedback, FeedbackType } from '../../types'
import FeedbackForm from './FeedbackForm'

const { Title } = Typography
const { RangePicker } = DatePicker

const typeColors: Record<FeedbackType, string> = { POSITIVE: 'green', SUGGESTION: 'blue', CONCERN: 'orange' }

export default function FeedbackList() {
  const [items, setItems] = useState<Feedback[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Feedback | null>(null)
  const [filters, setFilters] = useState<Record<string, string | undefined>>({})

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await feedbackApi.list({ page, size: 20, ...filters })
      setItems(res.data.content)
      setTotal(res.data.totalElements)
    } catch { message.error('Failed to load feedback') }
    setLoading(false)
  }, [page, filters])

  useEffect(() => { fetch() }, [fetch])

  const handleDelete = (id: string) => {
    Modal.confirm({ title: 'Delete this feedback?', onOk: async () => { await feedbackApi.delete(id); message.success('Deleted'); fetch() } })
  }

  const handleSave = () => { setModalOpen(false); setEditing(null); fetch() }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Feedback</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true) }}>New Feedback</Button>
      </div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select placeholder="Type" allowClear style={{ width: 150 }}
          onChange={(v) => setFilters(f => ({ ...f, type: v }))}
          options={['POSITIVE','SUGGESTION','CONCERN'].map(v => ({ label: v, value: v }))} />
        <RangePicker onChange={(dates) => {
          if (dates?.[0] && dates?.[1]) setFilters(f => ({ ...f, dateFrom: dates[0]!.format('YYYY-MM-DD'), dateTo: dates[1]!.format('YYYY-MM-DD') }))
          else setFilters(f => ({ ...f, dateFrom: undefined, dateTo: undefined }))
        }} />
      </Space>
      <Table dataSource={items} rowKey="id" loading={loading}
        pagination={{ current: page + 1, total, pageSize: 20, onChange: (p) => setPage(p - 1) }}
        columns={[
          { title: 'Date', dataIndex: 'date', width: 110 },
          { title: 'Subject', dataIndex: 'subject' },
          { title: 'Type', dataIndex: 'type', render: (v: FeedbackType) => <Tag color={typeColors[v]}>{v}</Tag> },
          {
            title: 'Actions', width: 120,
            render: (_: unknown, r: Feedback) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(r); setModalOpen(true) }} />
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
              </Space>
            ),
          },
        ]}
      />
      <Modal title={editing ? 'Edit Feedback' : 'New Feedback'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null) }} footer={null} destroyOnHidden>
        <FeedbackForm feedback={editing} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null) }} />
      </Modal>
    </div>
  )
}
