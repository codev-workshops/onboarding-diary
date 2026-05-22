import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { AuthProvider } from './context/AuthContext'
import { RecruitProvider } from './context/RecruitContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import TaskList from './pages/tasks/TaskList'
import IssueList from './pages/issues/IssueList'
import FeedbackList from './pages/feedback/FeedbackList'
import NoteList from './pages/notes/NoteList'
import ReportList from './pages/reports/ReportList'
import Profile from './pages/Profile'
import UserManagement from './pages/admin/UserManagement'

function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
      <AuthProvider>
        <RecruitProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={<TaskList />} />
              <Route path="/issues" element={<IssueList />} />
              <Route path="/feedback" element={<FeedbackList />} />
              <Route path="/notes" element={<NoteList />} />
              <Route path="/reports" element={<ReportList />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin/users" element={
                <ProtectedRoute roles={['ADMIN']}><UserManagement /></ProtectedRoute>
              } />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
        </RecruitProvider>
      </AuthProvider>
    </ConfigProvider>
  )
}

export default App
