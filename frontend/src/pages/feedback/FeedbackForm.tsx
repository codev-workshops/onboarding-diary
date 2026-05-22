import { Form, Input, Select, DatePicker, Button, Space, message } from 'antd'
import dayjs from 'dayjs'
import { feedbackApi } from '../../api/feedback'
import type { Feedback } from '../../types'

interface Props { feedback: Feedback | null; onSave: () => void; onCancel: () => void }

export default function FeedbackForm({ feedback, onSave, onCancel }: Props) {
  const [form] = Form.useForm()
  const onFinish = async (values: Record<string, unknown>) => {
    const payload = { ...values, date: (values.date as { format: (f: string) => string }).format('YYYY-MM-DD') }
    try {
      if (feedback) { await feedbackApi.update(feedback.id, payload); message.success('Updated') }
      else { await feedbackApi.create(payload); message.success('Created') }
      onSave()
    } catch { message.error('Failed to save') }
  }

  return (
    <Form form={form} onFinish={onFinish} layout="vertical"
      initialValues={feedback ? { ...feedback, date: dayjs(feedback.date) } : {}}>
      <Form.Item name="date" label="Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="subject" label="Subject" rules={[{ required: true, min: 3, max: 200 }]}><Input /></Form.Item>
      <Form.Item name="type" label="Type" rules={[{ required: true }]}>
        <Select options={['POSITIVE','SUGGESTION','CONCERN'].map(v => ({ label: v, value: v }))} />
      </Form.Item>
      <Form.Item name="details" label="Details" rules={[{ required: true, min: 10 }]}><Input.TextArea rows={4} /></Form.Item>
      <Form.Item><Space><Button type="primary" htmlType="submit">{feedback ? 'Update' : 'Create'}</Button><Button onClick={onCancel}>Cancel</Button></Space></Form.Item>
    </Form>
  )
}
