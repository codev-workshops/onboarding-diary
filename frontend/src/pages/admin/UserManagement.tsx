import { useEffect, useState, useCallback } from 'react'
import { Table, Button, Tag, Modal, Form, Input, Select, message, Typography, Space, Switch, DatePicker } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { usersApi } from '../../api/users'
import type { User, Role } from '../../types'

const { Title } = Typography

const roleColors: Record<Role, string> = { RECRUIT: 'blue', MANAGER: 'green', ADMIN: 'red' }

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [createModal, setCreateModal] = useState(false)
  const [form] = Form.useForm()
  const [createForm] = Form.useForm()

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await usersApi.list({ page, size: 20 })
      setUsers(res.data.content)
      setTotal(res.data.totalElements)
    } catch { message.error('Failed to load users') }
    setLoading(false)
  }, [page])

  useEffect(() => { fetch() }, [fetch])

  const handleEdit = (user: User) => {
    setEditing(user)
    form.setFieldsValue({ role: user.role, isActive: user.isActive, managerId: user.managerId })
    setModalOpen(true)
  }

  const handleUpdate = async (values: Record<string, unknown>) => {
    if (!editing) return
    try {
      await usersApi.update(editing.id, values)
      message.success('User updated')
      setModalOpen(false)
      setEditing(null)
      fetch()
    } catch { message.error('Failed to update user') }
  }

  const handleCreate = async (values: Record<string, unknown>) => {
    try {
      const payload = {
        ...values,
        startDate: values.startDate
          ? (values.startDate as { format: (f: string) => string }).format('YYYY-MM-DD')
          : undefined,
      }
      await usersApi.create(payload)
      message.success('User created')
      setCreateModal(false)
      createForm.resetFields()
      fetch()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      message.error(error.response?.data?.message || 'Failed to create user')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>User Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>Create User</Button>
      </div>
      <Table dataSource={users} rowKey="id" loading={loading}
        pagination={{ current: page + 1, total, pageSize: 20, onChange: (p) => setPage(p - 1) }}
        columns={[
          { title: 'Name', dataIndex: 'fullName' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Role', dataIndex: 'role', render: (v: Role) => <Tag color={roleColors[v]}>{v}</Tag> },
          { title: 'Department', dataIndex: 'department', render: (v: string | null) => v || '—' },
          { title: 'Active', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
          {
            title: 'Actions',
            render: (_: unknown, r: User) => (
              <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>Edit</Button>
            ),
          },
        ]}
      />

      <Modal title="Edit User" open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null) }} footer={null}>
        <Form form={form} onFinish={handleUpdate} layout="vertical">
          <Form.Item name="role" label="Role">
            <Select options={['RECRUIT','MANAGER','ADMIN'].map(v => ({ label: v, value: v }))} />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="managerId" label="Manager ID">
            <Input placeholder="UUID of manager (optional)" />
          </Form.Item>
          <Form.Item>
            <Space><Button type="primary" htmlType="submit">Update</Button><Button onClick={() => { setModalOpen(false); setEditing(null) }}>Cancel</Button></Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Create User" open={createModal} onCancel={() => setCreateModal(false)} footer={null}>
        <Form form={createForm} onFinish={handleCreate} layout="vertical">
          <Form.Item name="fullName" label="Full Name" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={['RECRUIT','MANAGER','ADMIN'].map(v => ({ label: v, value: v }))} />
          </Form.Item>
          <Form.Item name="department" label="Department"><Input /></Form.Item>
          <Form.Item name="startDate" label="Start Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item>
            <Space><Button type="primary" htmlType="submit">Create</Button><Button onClick={() => setCreateModal(false)}>Cancel</Button></Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
