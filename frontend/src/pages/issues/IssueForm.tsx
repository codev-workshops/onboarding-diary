import { Form, Input, Select, DatePicker, Button, Space, message } from 'antd'
import dayjs from 'dayjs'
import { issuesApi } from '../../api/issues'
import type { Issue } from '../../types'

interface Props { issue: Issue | null; onSave: () => void; onCancel: () => void }

export default function IssueForm({ issue, onSave, onCancel }: Props) {
  const [form] = Form.useForm()

  const onFinish = async (values: Record<string, unknown>) => {
    const payload = { ...values, date: (values.date as { format: (f: string) => string }).format('YYYY-MM-DD') }
    try {
      if (issue) { await issuesApi.update(issue.id, payload); message.success('Issue updated') }
      else { await issuesApi.create(payload); message.success('Issue created') }
      onSave()
    } catch { message.error('Failed to save issue') }
  }

  return (
    <Form form={form} onFinish={onFinish} layout="vertical"
      initialValues={issue ? { ...issue, date: dayjs(issue.date) } : { status: 'OPEN' }}>
      <Form.Item name="date" label="Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="title" label="Title" rules={[{ required: true, min: 3, max: 200 }]}><Input /></Form.Item>
      <Form.Item name="description" label="Description" rules={[{ required: true, min: 10 }]}><Input.TextArea rows={3} /></Form.Item>
      <Form.Item name="severity" label="Severity" rules={[{ required: true }]}>
        <Select options={['LOW','MEDIUM','HIGH','CRITICAL'].map(v => ({ label: v, value: v }))} />
      </Form.Item>
      <Form.Item name="status" label="Status" rules={[{ required: true }]}>
        <Select options={['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(v => ({ label: v, value: v }))} />
      </Form.Item>
      <Form.Item name="resolutionNotes" label="Resolution Notes"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item><Space><Button type="primary" htmlType="submit">{issue ? 'Update' : 'Create'}</Button><Button onClick={onCancel}>Cancel</Button></Space></Form.Item>
    </Form>
  )
}
