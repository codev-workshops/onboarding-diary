import { useEffect, useState, useCallback } from 'react'
import { Table, Button, Space, Tag, Modal, message, DatePicker, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { notesApi } from '../../api/notes'
import { useRecruit } from '../../context/RecruitContext'
import type { Note } from '../../types'
import NoteForm from './NoteForm'

const { Title } = Typography
const { RangePicker } = DatePicker

export default function NoteList() {
  const [notes, setNotes] = useState<Note[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [filters, setFilters] = useState<Record<string, string | undefined>>({})
  const { selectedRecruitId, isManagerView, loading: recruitLoading } = useRecruit()

  const fetch = useCallback(async () => {
    if (recruitLoading) return
    setLoading(true)
    try {
      const params = { page, size: 20, ...filters }
      const res = isManagerView && selectedRecruitId
        ? await notesApi.listForUser(selectedRecruitId, params)
        : await notesApi.list(params)
      setNotes(res.data.content)
      setTotal(res.data.totalElements)
    } catch { message.error('Failed to load notes') }
    setLoading(false)
  }, [page, filters, selectedRecruitId, isManagerView, recruitLoading])

  useEffect(() => { fetch() }, [fetch])

  const handleDelete = (id: string) => {
    Modal.confirm({ title: 'Delete this note?', onOk: async () => { await notesApi.delete(id); message.success('Deleted'); fetch() } })
  }

  const handleSave = () => { setModalOpen(false); setEditing(null); fetch() }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Notes</Title>
{!isManagerView && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true) }}>New Note</Button>}
      </div>
      <Space wrap style={{ marginBottom: 16 }}>
        <RangePicker onChange={(dates) => {
          if (dates?.[0] && dates?.[1]) setFilters(f => ({ ...f, dateFrom: dates[0]!.format('YYYY-MM-DD'), dateTo: dates[1]!.format('YYYY-MM-DD') }))
          else setFilters(f => ({ ...f, dateFrom: undefined, dateTo: undefined }))
        }} />
      </Space>
      <Table dataSource={notes} rowKey="id" loading={loading}
        pagination={{ current: page + 1, total, pageSize: 20, onChange: (p) => setPage(p - 1) }}
        columns={[
          { title: 'Date', dataIndex: 'date', width: 110 },
          { title: 'Title', dataIndex: 'title' },
          { title: 'Tags', dataIndex: 'tags', render: (tags: string[]) => tags.map(t => <Tag key={t}>{t}</Tag>) },
          ...(!isManagerView ? [{
            title: 'Actions', width: 120,
            render: (_: unknown, r: Note) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(r); setModalOpen(true) }} />
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
              </Space>
            ),
          }] : []),
        ]}
      />
      <Modal title={editing ? 'Edit Note' : 'New Note'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null) }} footer={null} destroyOnHidden>
        <NoteForm note={editing} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null) }} />
      </Modal>
    </div>
  )
}
