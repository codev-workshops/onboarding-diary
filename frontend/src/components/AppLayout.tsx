import { Layout, Menu, Typography, Button, Space, Tag } from 'antd'
import {
  DashboardOutlined,
  CheckSquareOutlined,
  WarningOutlined,
  MessageOutlined,
  FileTextOutlined,
  BarChartOutlined,
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const roleColors: Record<string, string> = {
  RECRUIT: 'blue',
  MANAGER: 'green',
  ADMIN: 'red',
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/tasks', icon: <CheckSquareOutlined />, label: 'Tasks' },
    { key: '/issues', icon: <WarningOutlined />, label: 'Issues' },
    { key: '/feedback', icon: <MessageOutlined />, label: 'Feedback' },
    { key: '/notes', icon: <FileTextOutlined />, label: 'Notes' },
    { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
    { key: '/profile', icon: <UserOutlined />, label: 'Profile' },
    ...(user?.role === 'ADMIN'
      ? [{ key: '/admin/users', icon: <TeamOutlined />, label: 'User Management' }]
      : []),
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth={0}>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            Onboarding Diary
          </Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Space>
            <span>{user?.fullName}</span>
            <Tag color={roleColors[user?.role || 'RECRUIT']}>{user?.role}</Tag>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
              Logout
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: '24px', padding: '24px', background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
