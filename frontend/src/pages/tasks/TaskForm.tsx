import { Form, Input, Select, DatePicker, Button, Space, message } from 'antd'
import dayjs from 'dayjs'
import { tasksApi } from '../../api/tasks'
import type { Task } from '../../types'

interface Props {
  task: Task | null
  onSave: () => void
  onCancel: () => void
}

export default function TaskForm({ task, onSave, onCancel }: Props) {
  const [form] = Form.useForm()

  const onFinish = async (values: Record<string, unknown>) => {
    const payload = {
      ...values,
      date: (values.date as { format: (f: string) => string }).format('YYYY-MM-DD'),
    }
    try {
      if (task) {
        await tasksApi.update(task.id, payload)
        message.success('Task updated')
      } else {
        await tasksApi.create(payload)
        message.success('Task created')
      }
      onSave()
    } catch {
      message.error('Failed to save task')
    }
  }

  return (
    <Form form={form} onFinish={onFinish} layout="vertical"
      initialValues={task ? { ...task, date: dayjs(task.date) } : { status: 'NOT_STARTED', priority: 'MEDIUM' }}>
      <Form.Item name="date" label="Date" rules={[{ required: true }]}>
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="title" label="Title" rules={[{ required: true, min: 3, max: 200 }]}>
        <Input />
      </Form.Item>
      <Form.Item name="description" label="Description">
        <Input.TextArea rows={3} maxLength={5000} />
      </Form.Item>
      <Form.Item name="category" label="Category" rules={[{ required: true }]}>
        <Select options={['TRAINING','DOCUMENTATION','MEETING','SETUP','DEVELOPMENT','OTHER'].map(v => ({ label: v, value: v }))} />
      </Form.Item>
      <Form.Item name="status" label="Status" rules={[{ required: true }]}>
        <Select options={['NOT_STARTED','IN_PROGRESS','COMPLETED','ON_HOLD'].map(v => ({ label: v, value: v }))} />
      </Form.Item>
      <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
        <Select options={['LOW','MEDIUM','HIGH','CRITICAL'].map(v => ({ label: v, value: v }))} />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">{task ? 'Update' : 'Create'}</Button>
          <Button onClick={onCancel}>Cancel</Button>
        </Space>
      </Form.Item>
    </Form>
  )
}
