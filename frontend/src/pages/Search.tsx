import { useState, useEffect } from 'react'
import { Input, Card, Tag, Empty, Spin, Typography, Space } from 'antd'
import {
  CheckSquareOutlined, WarningOutlined, MessageOutlined, FileTextOutlined, SearchOutlined,
} from '@ant-design/icons'
import { searchApi, type SearchResult } from '../api/search'
import { useRecruit } from '../context/RecruitContext'
import { useSearchParams } from 'react-router-dom'

const { Title, Text, Paragraph } = Typography
const { Search: SearchInput } = Input

const typeConfig: Record<string, { color: string; icon: React.ReactNode; label: string; path: string }> = {
  TASK: { color: 'blue', icon: <CheckSquareOutlined />, label: 'Task', path: '/tasks' },
  ISSUE: { color: 'red', icon: <WarningOutlined />, label: 'Issue', path: '/issues' },
  FEEDBACK: { color: 'green', icon: <MessageOutlined />, label: 'Feedback', path: '/feedback' },
  NOTE: { color: 'orange', icon: <FileTextOutlined />, label: 'Note', path: '/notes' },
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const { selectedRecruitId, isManagerView } = useRecruit()

  const query = searchParams.get('q') || ''

  useEffect(() => {
    if (!query) {
      setResults([])
      setTotalResults(0)
      return
    }
    setLoading(true)
    const promise = isManagerView && selectedRecruitId
      ? searchApi.searchForUser(selectedRecruitId, query)
      : searchApi.search(query)
    promise
      .then((res) => {
        setResults(res.data.results)
        setTotalResults(res.data.totalResults)
      })
      .catch(() => {
        setResults([])
        setTotalResults(0)
      })
      .finally(() => setLoading(false))
  }, [query, selectedRecruitId, isManagerView])

  const handleSearch = (value: string) => {
    const trimmed = value.trim()
    if (trimmed) {
      setSearchParams({ q: trimmed })
    }
  }

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    if (!acc[result.type]) acc[result.type] = []
    acc[result.type].push(result)
    return acc
  }, {})

  return (
    <div>
      <Title level={3}>Search</Title>
      <SearchInput
        placeholder="Search across tasks, issues, feedback, and notes..."
        allowClear
        enterButton={<><SearchOutlined /> Search</>}
        size="large"
        defaultValue={query}
        onSearch={handleSearch}
        style={{ marginBottom: 24 }}
      />

      {loading && <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />}

      {!loading && query && (
        <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
          {totalResults} result{totalResults !== 1 ? 's' : ''} for &quot;{query}&quot;
        </Text>
      )}

      {!loading && query && results.length === 0 && (
        <Empty description={`No results found for "${query}"`} />
      )}

      {!loading && Object.entries(grouped).map(([type, items]) => {
        const config = typeConfig[type]
        return (
          <div key={type} style={{ marginBottom: 24 }}>
            <Space style={{ marginBottom: 8 }}>
              {config.icon}
              <Title level={5} style={{ margin: 0 }}>
                {config.label}s ({items.length})
              </Title>
            </Space>
            {items.map((item) => (
              <Card key={item.id} size="small" style={{ marginBottom: 8 }} hoverable>
                <Space>
                  <Tag color={config.color}>{config.label}</Tag>
                  <Tag>{item.date}</Tag>
                </Space>
                <Title level={5} style={{ margin: '8px 0 4px' }}>{item.title}</Title>
                {item.highlight && (
                  <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                    {item.highlight}
                  </Paragraph>
                )}
              </Card>
            ))}
          </div>
        )
      })}
    </div>
  )
}
