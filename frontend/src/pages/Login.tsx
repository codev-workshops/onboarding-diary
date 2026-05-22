import { Form, Input, Button, Card, Typography, message, Space } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/auth'

const { Title } = Typography

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form] = Form.useForm()

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      const res = await authApi.login(values)
      login(res.data.accessToken, res.data.user)
      message.success('Welcome back!')
      navigate('/dashboard')
    } catch {
      message.error('Invalid email or password')
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }}>
        <Title level={2} style={{ textAlign: 'center' }}>Onboarding Diary</Title>
        <Title level={4} style={{ textAlign: 'center', fontWeight: 'normal' }}>Sign In</Title>
        <Form form={form} onFinish={onFinish} layout="vertical" size="large">
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Password required' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>Sign In</Button>
          </Form.Item>
          <Space style={{ width: '100%', justifyContent: 'center' }}>
            <span>Don't have an account?</span>
            <Link to="/register">Sign Up</Link>
          </Space>
        </Form>
      </Card>
    </div>
  )
}
