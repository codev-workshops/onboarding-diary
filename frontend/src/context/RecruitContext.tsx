import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '../types'
import { usersApi } from '../api/users'
import { useAuth } from './AuthContext'

interface RecruitContextType {
  recruits: User[]
  selectedRecruitId: string | null
  setSelectedRecruitId: (id: string | null) => void
  isManagerView: boolean
}

const RecruitContext = createContext<RecruitContextType | undefined>(undefined)

export function RecruitProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [recruits, setRecruits] = useState<User[]>([])
  const [selectedRecruitId, setSelectedRecruitId] = useState<string | null>(null)

  const isManager = user?.role === 'MANAGER'

  useEffect(() => {
    if (isManager) {
      usersApi.getMyRecruits().then((res) => {
        setRecruits(res.data)
        if (res.data.length > 0 && !selectedRecruitId) {
          setSelectedRecruitId(res.data[0].id)
        }
      }).catch(() => setRecruits([]))
    } else {
      setRecruits([])
      setSelectedRecruitId(null)
    }
  }, [isManager])

  return (
    <RecruitContext.Provider value={{
      recruits,
      selectedRecruitId,
      setSelectedRecruitId,
      isManagerView: isManager && selectedRecruitId !== null,
    }}>
      {children}
    </RecruitContext.Provider>
  )
}

export function useRecruit() {
  const context = useContext(RecruitContext)
  if (!context) throw new Error('useRecruit must be used within RecruitProvider')
  return context
}
