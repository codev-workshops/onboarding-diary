import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Layout, Typography } from 'antd'

const { Header, Content, Footer } = Layout
const { Title } = Typography

const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: 24 }}>
    <Title level={3}>{name}</Title>
    <p>This page is under construction.</p>
  </div>
)

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <BrowserRouter>
        <Layout style={{ minHeight: '100vh' }}>
          <Header
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#001529',
            }}
          >
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              Onboarding Diary
            </Title>
          </Header>

          <Content style={{ padding: '24px 48px', flex: 1 }}>
            <Routes>
              <Route path="/login" element={<Placeholder name="Login" />} />
              <Route path="/register" element={<Placeholder name="Register" />} />
              <Route path="/dashboard" element={<Placeholder name="Dashboard" />} />
              <Route path="/tasks" element={<Placeholder name="Tasks" />} />
              <Route path="/issues" element={<Placeholder name="Issues" />} />
              <Route path="/feedback" element={<Placeholder name="Feedback" />} />
              <Route path="/notes" element={<Placeholder name="Notes" />} />
              <Route path="/reports" element={<Placeholder name="Reports" />} />
              <Route path="/profile" element={<Placeholder name="Profile" />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </Content>

          <Footer style={{ textAlign: 'center' }}>
            Onboarding Diary &copy; {new Date().getFullYear()}
          </Footer>
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
