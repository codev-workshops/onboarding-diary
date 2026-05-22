import { Form, Input, DatePicker, Button, Card, Typography, message, Descriptions, Tag } from 'antd'
import dayjs from 'dayjs'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/auth'

const { Title } = Typography

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [form] = Form.useForm()

  const onFinish = async (values: Record<string, unknown>) => {
    try {
      const payload = {
        fullName: values.fullName as string,
        department: values.department as string,
        startDate: values.startDate
          ? (values.startDate as { format: (f: string) => string }).format('YYYY-MM-DD')
          : undefined,
      }
      const res = await authApi.updateProfile(payload)
      updateUser(res.data)
      message.success('Profile updated')
    } catch { message.error('Failed to update profile') }
  }

  return (
    <div>
      <Title level={3}>Profile</Title>
      <Card style={{ marginBottom: 24 }}>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Role"><Tag>{user?.role}</Tag></Descriptions.Item>
          <Descriptions.Item label="Member Since">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="Edit Profile">
        <Form form={form} onFinish={onFinish} layout="vertical"
          initialValues={{
            fullName: user?.fullName,
            department: user?.department,
            startDate: user?.startDate ? dayjs(user.startDate) : undefined,
          }}>
          <Form.Item name="fullName" label="Full Name" rules={[{ required: true, min: 2, max: 150 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="department" label="Department">
            <Input />
          </Form.Item>
          <Form.Item name="startDate" label="Start Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Save Changes</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
