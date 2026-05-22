import { useEffect, useState, useCallback } from 'react'
import { Table, Button, Space, Tag, Modal, message, Select, DatePicker, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { tasksApi } from '../../api/tasks'
import { useRecruit } from '../../context/RecruitContext'
import type { Task, TaskStatus, TaskCategory, TaskPriority } from '../../types'
import TaskForm from './TaskForm'

const { Title } = Typography
const { RangePicker } = DatePicker

const statusColors: Record<TaskStatus, string> = {
  NOT_STARTED: 'default', IN_PROGRESS: 'processing', COMPLETED: 'success', ON_HOLD: 'warning',
}
const priorityColors: Record<TaskPriority, string> = {
  LOW: 'green', MEDIUM: 'blue', HIGH: 'orange', CRITICAL: 'red',
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [filters, setFilters] = useState<Record<string, string | undefined>>({})
  const { selectedRecruitId, isManagerView } = useRecruit()

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number | undefined> = { page, size: 20, ...filters }
      const res = isManagerView && selectedRecruitId
        ? await tasksApi.listForUser(selectedRecruitId, params)
        : await tasksApi.list(params)
      setTasks(res.data.content)
      setTotal(res.data.totalElements)
    } catch { message.error('Failed to load tasks') }
    setLoading(false)
  }, [page, filters, selectedRecruitId, isManagerView])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete this task?',
      onOk: async () => {
        await tasksApi.delete(id)
        message.success('Task deleted')
        fetchTasks()
      },
    })
  }

  const handleSave = () => {
    setModalOpen(false)
    setEditing(null)
    fetchTasks()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Tasks</Title>
        {!isManagerView && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true) }}>
            New Task
          </Button>
        )}
      </div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select placeholder="Category" allowClear style={{ width: 150 }}
          onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
          options={['TRAINING','DOCUMENTATION','MEETING','SETUP','DEVELOPMENT','OTHER'].map(v => ({ label: v, value: v }))} />
        <Select placeholder="Status" allowClear style={{ width: 150 }}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          options={['NOT_STARTED','IN_PROGRESS','COMPLETED','ON_HOLD'].map(v => ({ label: v, value: v }))} />
        <RangePicker onChange={(dates) => {
          if (dates && dates[0] && dates[1]) {
            setFilters((f) => ({ ...f, dateFrom: dates[0]!.format('YYYY-MM-DD'), dateTo: dates[1]!.format('YYYY-MM-DD') }))
          } else {
            setFilters((f) => ({ ...f, dateFrom: undefined, dateTo: undefined }))
          }
        }} />
      </Space>
      <Table
        dataSource={tasks}
        rowKey="id"
        loading={loading}
        pagination={{ current: page + 1, total, pageSize: 20, onChange: (p) => setPage(p - 1) }}
        columns={[
          { title: 'Date', dataIndex: 'date', width: 110 },
          { title: 'Title', dataIndex: 'title' },
          { title: 'Category', dataIndex: 'category', render: (v: TaskCategory) => <Tag>{v}</Tag> },
          { title: 'Status', dataIndex: 'status', render: (v: TaskStatus) => <Tag color={statusColors[v]}>{v}</Tag> },
          { title: 'Priority', dataIndex: 'priority', render: (v: TaskPriority) => <Tag color={priorityColors[v]}>{v}</Tag> },
          ...(!isManagerView ? [{
            title: 'Actions', width: 120,
            render: (_: unknown, record: Task) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(record); setModalOpen(true) }} />
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
              </Space>
            ),
          }] : []),
        ]}
      />
      <Modal title={editing ? 'Edit Task' : 'New Task'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null) }} footer={null} destroyOnHidden>
        <TaskForm task={editing} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null) }} />
      </Modal>
    </div>
  )
}
