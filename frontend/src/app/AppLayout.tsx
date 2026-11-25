import { useQuery } from '@tanstack/react-query'
import { BookOpen, Feather, Flower2, House, Plus, Settings2 } from 'lucide-react'
import { Suspense } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Wordmark } from '../components/brand'
import { Avatar, Spinner } from '../components/ui'
import { Api } from '../lib/api'
import { cn } from '../lib/image'
import { useMe, useTone } from './session'

function useUnreadCount() {
  const { data } = useQuery({
    queryKey: ['unread'],
    queryFn: Api.unreadCount,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
  return data?.count ?? 0
}

const NAV = [
  { to: '/', label: 'Ana sayfa', short: 'Ana sayfa', icon: House, end: true },
  { to: '/studio', label: 'Çiçek Stüdyosu', short: 'Tasarla', icon: Plus, end: false },
  { to: '/bouquets', label: 'Buketlerim', short: 'Buketler', icon: Flower2, end: false },
  { to: '/memories', label: 'Anılarımız', short: 'Anılar', icon: BookOpen, end: false },
  { to: '/messages', label: 'Notlar', short: 'Notlar', icon: Feather, end: false },
] as const

function UnreadDot({ count, className }: { count: number; className?: string }) {
  if (!count) return null
  return (
    <span
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full bg-blush-500 px-1.5 text-[11px] font-bold leading-5 text-paper',
        className,
      )}
      aria-label={`${count} okunmamış not`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

function Sidebar({ unread }: { unread: number }) {
  const { user, partner, space } = useMe()
  const tone = useTone()
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-line/60 bg-cream px-5 pb-6 pt-8 lg:flex">
      <Link to="/" className="rounded-xl px-2 py-1">
        <Wordmark />
      </Link>
      <p className="mt-1 truncate pl-11 text-sm text-muted">{space.name}</p>

      <nav className="mt-10 flex flex-col gap-1" aria-label="Ana menü">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'group flex h-11 items-center gap-3 rounded-2xl px-3 text-[15px] font-semibold transition',
                isActive ? 'bg-paper text-ink shadow-soft' : 'text-ink-soft hover:bg-ivory hover:text-ink',
              )
            }
          >
            <Icon className="size-[18px] shrink-0" strokeWidth={1.8} />
            <span className="flex-1">{label}</span>
            {to === '/messages' && <UnreadDot count={unread} />}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-line/70 bg-paper p-3">
          <div className="flex items-center -space-x-2">
            <Avatar name={user.displayName} index={tone(user.username)} />
            {partner && <Avatar name={partner.displayName} index={tone(partner.username)} />}
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            <span className="font-semibold text-ink">{user.displayName}</span> olarak giriş yaptın
          </p>
        </div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex h-11 items-center gap-3 rounded-2xl px-3 text-[15px] font-semibold transition',
              isActive ? 'bg-paper text-ink shadow-soft' : 'text-ink-soft hover:bg-ivory hover:text-ink',
            )
          }
        >
          <Settings2 className="size-[18px]" strokeWidth={1.8} />
          Ayarlar
        </NavLink>
      </div>
    </aside>
  )
}

function MobileTopBar() {
  const { user } = useMe()
  const tone = useTone()
  return (
    <div className="sticky top-0 z-20 border-b border-line/50 bg-cream/85 pt-safe backdrop-blur-xl lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link to="/" aria-label="Ana sayfa">
          <Wordmark className="scale-90 origin-left" />
        </Link>
        <Link
          to="/settings"
          className="flex h-11 items-center gap-2 rounded-full pl-1 pr-1 text-ink-soft"
          aria-label="Ayarlar"
        >
          <Avatar name={user.displayName} index={tone(user.username)} size="sm" />
          <Settings2 className="size-5" strokeWidth={1.8} />
        </Link>
      </div>
    </div>
  )
}

function BottomNav({ unread }: { unread: number }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-paper/92 pb-safe backdrop-blur-xl lg:hidden"
      aria-label="Ana menü"
    >
      <div className="mx-auto grid h-[66px] max-w-xl grid-cols-5 items-center px-1">
        {[NAV[0], NAV[2], NAV[1], NAV[3], NAV[4]].map(({ to, short, icon: Icon, end }) => {
          const studio = to === '/studio'
          return (
            <NavLink key={to} to={to} end={end} className="flex h-full flex-col items-center justify-center">
              {({ isActive }) =>
                studio ? (
                  <span className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        'flex h-9 w-14 items-center justify-center rounded-full transition',
                        isActive ? 'bg-blush-700 text-paper' : 'bg-ink text-cream',
                      )}
                    >
                      <Icon className="size-5" strokeWidth={2} />
                    </span>
                    <span className="text-[11px] font-semibold text-ink">{short}</span>
                  </span>
                ) : (
                  <span className={cn('relative flex flex-col items-center gap-1 transition', isActive ? 'text-ink' : 'text-muted')}>
                    <Icon className="size-[22px]" strokeWidth={isActive ? 2.1 : 1.7} />
                    <span className={cn('text-[11px]', isActive ? 'font-bold' : 'font-semibold')}>{short}</span>
                    {to === '/messages' && <UnreadDot count={unread} className="absolute -right-3 -top-1.5" />}
                  </span>
                )
              }
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export function AppLayout() {
  const location = useLocation()
  const unread = useUnreadCount()
  const immersive = location.pathname.startsWith('/studio')

  return (
    <div className="min-h-dvh lg:pl-[264px]">
      <Sidebar unread={unread} />
      {!immersive && <MobileTopBar />}
      <main
        key={immersive ? '/studio' : location.pathname}
        className={cn('animate-rise', !immersive && 'pb-[calc(84px+env(safe-area-inset-bottom))] lg:pb-10')}
      >
        <Suspense
          fallback={
            <div className="flex h-[60dvh] items-center justify-center">
              <Spinner />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      {!immersive && <BottomNav unread={unread} />}
    </div>
  )
}
