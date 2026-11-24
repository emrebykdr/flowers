import { useQuery } from '@tanstack/react-query'
import { createContext, useContext } from 'react'
import { Navigate, useLocation } from 'react-router'
import { LogoMark } from '../components/brand'
import { Button } from '../components/ui'
import type { Session } from '../domain/types'
import { Api, ApiError } from '../lib/api'
import { AppLayout } from './AppLayout'

export const SessionContext = createContext<Session | null>(null)

export function useMe(): Session {
  const session = useContext(SessionContext)
  if (!session) throw new Error('Oturum yok')
  return session
}

export function useSessionQuery() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return await Api.me()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null
        throw err
      }
    },
    staleTime: 5 * 60_000,
  })
}

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream">
      <LogoMark className="size-12 animate-pulse" />
    </div>
  )
}

export function RequireAuth() {
  const { data, isPending, isError, refetch } = useSessionQuery()
  const location = useLocation()

  if (isPending) return <Splash />
  if (isError)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
        <LogoMark className="size-12" />
        <p className="max-w-xs text-ink-soft">Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Tekrar dene
        </Button>
      </div>
    )
  if (!data) {
    const next = location.pathname + location.search
    return <Navigate to={next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`} replace />
  }
  return (
    <SessionContext.Provider value={data}>
      <AppLayout />
    </SessionContext.Provider>
  )
}
