import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BookOpen, CalendarDays, Feather, ImageIcon, Plus, Send } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useMe } from '../../app/session'
import { useFeedback } from '../../components/feedback'
import { Button, Card, Skeleton, TextArea, TextInput } from '../../components/ui'
import { describeFlowers } from '../../domain/catalog'
import type { HomeData, MemoryItem, Session } from '../../domain/types'
import { Api, ApiError } from '../../lib/api'
import { daysSince, describeDuration, formatDate, formatDateTime, formatToday, greeting, todayISO, withSuffix } from '../../lib/format'
import { BouquetImage, OwnerTag } from '../bouquets/shared'

function TogetherCard({ session }: { session: Session }) {
  const qc = useQueryClient()
  const { toast } = useFeedback()
  const [date, setDate] = useState('')
  const since = session.space.togetherSince
  const save = useMutation({
    mutationFn: () => Api.updateSpace({ name: session.space.name, togetherSince: date }),
    onSuccess: (space) => {
      qc.setQueryData<Session | null>(['session'], (s) => (s ? { ...s, space } : s))
      toast('Başlangıç tarihi kaydedildi.')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Kaydedilemedi.', 'error'),
  })

  if (!since) {
    return (
      <Card className="flex h-full flex-col p-6">
        <p className="text-sm font-semibold text-muted">Birlikte geçen günler</p>
        <p className="mt-3 font-display text-2xl leading-snug text-ink">Hangi günden beri saymaya başlayalım?</p>
        <form
          className="mt-auto flex gap-2 pt-6"
          onSubmit={(e) => {
            e.preventDefault()
            if (date) save.mutate()
          }}
        >
          <TextInput type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Başlangıç tarihi" />
          <Button type="submit" disabled={!date} loading={save.isPending}>
            Kaydet
          </Button>
        </form>
      </Card>
    )
  }

  const days = daysSince(since)
  return (
    <Card className="paper-grain relative flex h-full flex-col overflow-hidden p-6">
      <p className="text-sm font-semibold text-muted">Birlikte geçen günler</p>
      <div className="mt-4 flex items-baseline gap-3">
        <span className="font-display text-[4.2rem] leading-none tracking-[-0.03em] text-ink tabular-nums">
          {days.toLocaleString('tr-TR')}
        </span>
        <span className="font-display text-2xl italic text-blush-700">gün</span>
      </div>
      <p className="mt-auto pt-6 text-[15px] text-ink-soft">
        {formatDate(since)} tarihinden beri · <span className="text-muted">{describeDuration(since)}</span>
      </p>
    </Card>
  )
}

function StudioCta({ session }: { session: Session }) {
  const partner = session.partner?.displayName
  return (
    <Link
      to="/studio"
      className="group relative flex h-full min-h-44 flex-col justify-between overflow-hidden rounded-[var(--radius-card)] bg-[#efd9d3] p-6 text-ink shadow-soft transition hover:shadow-lift"
    >
      <svg viewBox="0 0 200 200" className="pointer-events-none absolute -right-10 -top-8 size-56 opacity-60 transition duration-700 group-hover:rotate-12" aria-hidden>
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <ellipse key={a} cx="100" cy="58" rx="26" ry="44" transform={`rotate(${a} 100 100)`} fill="#f6e2de" stroke="#c4817b" strokeWidth="1.2" />
        ))}
        <circle cx="100" cy="100" r="16" fill="#cbd7c1" stroke="#6b8160" strokeWidth="1.2" />
      </svg>
      <p className="relative text-sm font-semibold text-blush-700">Çiçek Stüdyosu</p>
      <div className="relative">
        <p className="max-w-[16rem] font-display text-[1.75rem] leading-tight">
          {partner ? `${withSuffix(partner, 'dat')} bir buket hazırla.` : 'Yeni bir buket hazırla.'}
        </p>
        <span className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-semibold text-cream">
          <Plus className="size-4" /> Tasarlamaya başla
        </span>
      </div>
    </Link>
  )
}

function LatestBouquet({ data }: { data: HomeData }) {
  const b = data.latestBouquet
  if (!b) {
    return (
      <Card className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="font-display text-2xl">Henüz buket yok.</p>
        <p className="mt-2 max-w-xs text-muted">İlk buketi sen tasarla; burada ikiniz de görürsünüz.</p>
        <Link to="/studio" className="mt-5">
          <Button>İlk buketi tasarla</Button>
        </Link>
      </Card>
    )
  }
  return (
    <Card className="overflow-hidden">
      <Link to={`/bouquets/${b.id}`} className="group grid sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <div className="overflow-hidden bg-ivory">
          <BouquetImage summary={b} eager className="aspect-[4/5] h-full w-full transition duration-700 group-hover:scale-[1.02]" />
        </div>
        <div className="flex flex-col p-6 sm:p-7">
          <p className="text-sm font-semibold text-muted">Son buket</p>
          <h2 className="mt-2 font-display text-[2rem] leading-tight tracking-[-0.02em]">{b.name}</h2>
          <p className="mt-1 text-[15px] text-ink-soft">{formatDate(b.memoryDate)}</p>
          {b.note && (
            <blockquote className="mt-5 border-l-2 border-blush-300 pl-4 font-display text-lg italic leading-relaxed text-ink-soft">
              {b.note}
            </blockquote>
          )}
          <p className="mt-5 text-sm text-muted">{describeFlowers(b.flowers)}</p>
          <div className="mt-auto flex items-center justify-between pt-6 text-sm text-muted">
            <OwnerTag summary={b} />
            <span className="inline-flex items-center gap-1 font-semibold text-ink transition group-hover:gap-2">
              3D incele <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </Link>
    </Card>
  )
}

function NoteCard({ data }: { data: HomeData }) {
  const qc = useQueryClient()
  const { toast } = useFeedback()
  const [text, setText] = useState('')
  const partner = data.session.partner
  const note = data.latestFromPartner
  const send = useMutation({
    mutationFn: () => Api.sendMessage(text),
    onSuccess: () => {
      setText('')
      qc.invalidateQueries({ queryKey: ['messages'] })
      toast(partner ? `Notun ${withSuffix(partner.displayName, 'dat')} bırakıldı.` : 'Not bırakıldı.')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Gönderilemedi.', 'error'),
  })

  return (
    <Card className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
          <Feather className="size-4" /> Notlar
        </p>
        <Link to="/messages" className="text-sm font-semibold text-ink-soft hover:text-ink">
          Tümü{data.unreadCount > 0 ? ` · ${data.unreadCount} yeni` : ''}
        </Link>
      </div>
      {note ? (
        <div className="mt-4">
          <p className="font-display text-[1.3rem] italic leading-relaxed text-ink">“{note.body}”</p>
          <p className="mt-2 text-sm text-muted">
            {partner ? withSuffix(partner.displayName, 'abl') : ''} · {formatDateTime(note.createdAt)}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-[15px] text-muted">
          {partner ? `${withSuffix(partner.displayName, 'abl')} henüz not yok.` : 'Henüz not yok.'}
        </p>
      )}
      <form
        className="mt-auto pt-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) send.mutate()
        }}
      >
        <div className="relative">
          <TextArea
            rows={2}
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={partner ? `${withSuffix(partner.displayName, 'dat')} kısa bir not bırak` : 'Kısa bir not bırak'}
            className="min-h-0 pr-14"
            aria-label="Kısa not"
          />
          <button
            type="submit"
            disabled={!text.trim() || send.isPending}
            className="absolute bottom-2.5 right-2.5 inline-flex size-9 items-center justify-center rounded-full bg-ink text-cream transition disabled:opacity-30"
            aria-label="Notu gönder"
          >
            <Send className="size-4" />
          </button>
        </div>
      </form>
    </Card>
  )
}

function MemoryRow({ m }: { m: MemoryItem }) {
  const thumb = m.photoUrl ?? m.bouquet?.previewUrl
  return (
    <Link to={`/memories?open=${m.id}`} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-ivory">
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ivory">
        {thumb ? (
          <img src={thumb} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <ImageIcon className="size-5 text-muted" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{m.title}</p>
        <p className="truncate text-sm text-muted">
          {formatDate(m.date)} · {m.isMine ? 'Sen' : m.author.displayName}
        </p>
      </div>
    </Link>
  )
}

function RecentMemories({ data }: { data: HomeData }) {
  return (
    <Card className="h-full p-4 sm:p-5">
      <div className="flex items-center justify-between px-2 pt-1">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
          <BookOpen className="size-4" /> Son anılar
        </p>
        <Link to="/memories" className="text-sm font-semibold text-ink-soft hover:text-ink">
          Arşiv
        </Link>
      </div>
      {data.recentMemories.length === 0 ? (
        <div className="px-2 py-6">
          <p className="text-[15px] text-muted">Henüz anı eklenmedi. Bir fotoğraf ya da birkaç satırla başlayabilirsin.</p>
          <Link to="/memories?new=1" className="mt-4 inline-block">
            <Button variant="secondary" size="sm" icon={<CalendarDays className="size-4" />}>
              Anı ekle
            </Button>
          </Link>
        </div>
      ) : (
        <div className="mt-2 space-y-1">
          {data.recentMemories.map((m) => (
            <MemoryRow key={m.id} m={m} />
          ))}
        </div>
      )}
    </Card>
  )
}

export default function HomePage() {
  const session = useMe()
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ['home'], queryFn: Api.home })

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-12">
      <header className="mb-7 lg:mb-10">
        <p className="text-sm font-semibold capitalize text-muted">{formatToday()}</p>
        <h1 className="mt-1 font-display text-[2.5rem] leading-[1.05] tracking-[-0.025em] text-ink md:text-[3.4rem]">
          {greeting()}, {session.user.displayName}.
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          <span className="font-display italic text-ink-soft">{session.space.name}</span>
          {data ? ` · ${data.bouquetCount} buket, ${data.memoryCount} anı` : ''}
        </p>
      </header>

      {isError ? (
        <Card className="p-8 text-center">
          <p className="text-ink-soft">Ana sayfa yüklenemedi.</p>
          <Button variant="secondary" className="mt-4" onClick={() => refetch()}>
            Tekrar dene
          </Button>
        </Card>
      ) : isPending ? (
        <div className="grid gap-5 lg:grid-cols-12">
          <Skeleton className="h-52 lg:col-span-5" />
          <Skeleton className="h-52 lg:col-span-7" />
          <Skeleton className="h-96 lg:col-span-7" />
          <Skeleton className="h-96 lg:col-span-5" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <TogetherCard session={session} />
          </div>
          <div className="lg:col-span-7">
            <StudioCta session={session} />
          </div>
          <div className="lg:col-span-7">
            <LatestBouquet data={data} />
          </div>
          <div className="flex flex-col gap-5 lg:col-span-5">
            <NoteCard data={data} />
            <RecentMemories data={data} />
          </div>
        </div>
      )}
    </div>
  )
}
