import { Form, Input, Select, DatePicker, Button, Space, message } from 'antd'
import dayjs from 'dayjs'
import { notesApi } from '../../api/notes'
import type { Note } from '../../types'

interface Props { note: Note | null; onSave: () => void; onCancel: () => void }

export default function NoteForm({ note, onSave, onCancel }: Props) {
  const [form] = Form.useForm()
  const onFinish = async (values: Record<string, unknown>) => {
    const payload = { ...values, date: (values.date as { format: (f: string) => string }).format('YYYY-MM-DD') }
    try {
      if (note) { await notesApi.update(note.id, payload); message.success('Updated') }
      else { await notesApi.create(payload); message.success('Created') }
      onSave()
    } catch { message.error('Failed to save') }
  }

  return (
    <Form form={form} onFinish={onFinish} layout="vertical"
      initialValues={note ? { ...note, date: dayjs(note.date) } : {}}>
      <Form.Item name="date" label="Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="title" label="Title" rules={[{ required: true, min: 3, max: 200 }]}><Input /></Form.Item>
      <Form.Item name="content" label="Content" rules={[{ required: true, min: 1 }]}><Input.TextArea rows={5} /></Form.Item>
      <Form.Item name="tags" label="Tags">
        <Select mode="tags" placeholder="Add tags" tokenSeparators={[',']} />
      </Form.Item>
      <Form.Item><Space><Button type="primary" htmlType="submit">{note ? 'Update' : 'Create'}</Button><Button onClick={onCancel}>Cancel</Button></Space></Form.Item>
    </Form>
  )
}
