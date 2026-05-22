import { Form, Input, Button, Card, Typography, DatePicker, message, Space } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/auth'

const { Title } = Typography

export default function Register() {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const onFinish = async (values: Record<string, unknown>) => {
    try {
      const payload = {
        email: values.email as string,
        password: values.password as string,
        fullName: values.fullName as string,
        department: values.department as string | undefined,
        startDate: values.startDate
          ? (values.startDate as { format: (f: string) => string }).format('YYYY-MM-DD')
          : undefined,
      }
      await authApi.register(payload)
      message.success('Registration successful! Please sign in.')
      navigate('/login')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      message.error(error.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 450 }}>
        <Title level={2} style={{ textAlign: 'center' }}>Create Account</Title>
        <Form form={form} onFinish={onFinish} layout="vertical" size="large">
          <Form.Item name="fullName" label="Full Name" rules={[{ required: true, min: 2, max: 150 }]}>
            <Input placeholder="John Doe" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="john@example.com" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[
            { required: true, min: 8 },
            { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_+=])/, message: 'Must contain uppercase, lowercase, digit, and special character' }
          ]}>
            <Input.Password placeholder="Password" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="Confirm Password" dependencies={['password']} rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve()
                return Promise.reject(new Error('Passwords do not match'))
              },
            }),
          ]}>
            <Input.Password placeholder="Confirm password" />
          </Form.Item>
          <Form.Item name="department" label="Department">
            <Input placeholder="Engineering" />
          </Form.Item>
          <Form.Item name="startDate" label="Start Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>Sign Up</Button>
          </Form.Item>
          <Space style={{ width: '100%', justifyContent: 'center' }}>
            <span>Already have an account?</span>
            <Link to="/login">Sign In</Link>
          </Space>
        </Form>
      </Card>
    </div>
  )
}
