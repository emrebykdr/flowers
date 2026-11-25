import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCheck, Feather, Send, Trash } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMe, useTone } from '../../app/session'
import { useFeedback } from '../../components/feedback'
import { Avatar, Button, Card, EmptyState, PageHeader, Skeleton, TextArea } from '../../components/ui'
import type { MessageItem } from '../../domain/types'
import { Api, ApiError } from '../../lib/api'
import { formatDateTime, withSuffix } from '../../lib/format'
import { cn } from '../../lib/image'

const MAX = 500

function NoteCard({ m, fresh, onDelete }: { m: MessageItem; fresh: boolean; onDelete: () => void }) {
  const tone = useTone()
  return (
    <article className={cn('flex animate-rise', m.isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'group relative w-full max-w-[34rem] rounded-[1.5rem] px-5 pb-4 pt-4 shadow-soft ring-1',
          m.isMine ? 'bg-blush-50 ring-blush-100' : 'bg-paper ring-line/70',
        )}
      >
        <header className="flex items-center gap-2 text-sm">
          <Avatar name={m.sender.displayName} index={tone(m.sender.username)} size="sm" />
          <span className="font-semibold text-ink">{m.isMine ? 'Sen' : m.sender.displayName}</span>
          <span className="text-muted">· {formatDateTime(m.createdAt)}</span>
          {fresh && <span className="ml-1 rounded-full bg-blush-500 px-2 py-0.5 text-[11px] font-bold text-paper">yeni</span>}
          {m.isMine && (
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto inline-flex size-9 items-center justify-center rounded-full text-muted opacity-70 transition hover:bg-blush-100 hover:text-blush-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
              aria-label="Notu sil"
            >
              <Trash className="size-4" />
            </button>
          )}
        </header>
        <p className="mt-2.5 whitespace-pre-line font-display text-[1.18rem] leading-relaxed text-ink">{m.body}</p>
        {m.isMine && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
            {m.readAt ? (
              <>
                <CheckCheck className="size-3.5 text-sage-600" /> Okundu · {formatDateTime(m.readAt)}
              </>
            ) : (
              <>
                <Check className="size-3.5" /> İletildi
              </>
            )}
          </p>
        )}
      </div>
    </article>
  )
}

export default function MessagesPage() {
  const { partner } = useMe()
  const qc = useQueryClient()
  const { toast, confirm } = useFeedback()
  const [text, setText] = useState('')
  const [freshIds, setFreshIds] = useState<Set<string> | null>(null)

  const query = useInfiniteQuery({
    queryKey: ['messages'],
    queryFn: ({ pageParam }) => Api.messages(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.items[last.items.length - 1]?.createdAt : undefined),
    refetchInterval: 30_000,
  })

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data])

  // İlk yüklemede okunmamış olanları "yeni" diye işaretle, sonra okundu bilgisini gönder
  useEffect(() => {
    if (!query.data) return
    const unread = items.filter((m) => !m.isMine && !m.readAt)
    if (unread.length) setFreshIds((prev) => new Set([...(prev ?? []), ...unread.map((m) => m.id)]))
    if (unread.length) {
      Api.markMessagesRead()
        .then(() => {
          qc.invalidateQueries({ queryKey: ['unread'] })
          qc.invalidateQueries({ queryKey: ['home'] })
        })
        .catch(() => undefined)
    }
  }, [query.data, items, qc])

  const send = useMutation({
    mutationFn: () => Api.sendMessage(text),
    onSuccess: () => {
      setText('')
      qc.invalidateQueries({ queryKey: ['messages'] })
      qc.invalidateQueries({ queryKey: ['home'] })
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Gönderilemedi.', 'error'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => Api.deleteMessage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] })
      toast('Not silindi.')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Silinemedi.', 'error'),
  })

  const partnerName = partner?.displayName ?? 'O'

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-12">
      <PageHeader title="Notlar" subtitle={`Birbirinize bıraktığınız kısa satırlar.`} />

      <Card className="mb-10 p-4 sm:p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim() && !send.isPending) send.mutate()
          }}
        >
          <label htmlFor="note" className="mb-2 block text-sm font-semibold text-ink-soft">
            {withSuffix(partnerName, 'dat')} bir not bırak
          </label>
          <TextArea
            id="note"
            rows={3}
            maxLength={MAX}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) send.mutate()
            }}
            placeholder="Kısa tut; uzun konuşmalar yüz yüze daha güzel."
          />
          <div className="mt-3 flex items-center justify-between">
            <span className={cn('text-xs tabular-nums', text.length > MAX - 40 ? 'text-blush-700' : 'text-muted')}>
              {text.length}/{MAX}
            </span>
            <Button type="submit" icon={<Send className="size-4" />} loading={send.isPending} disabled={!text.trim()}>
              Bırak
            </Button>
          </div>
        </form>
      </Card>

      {query.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="ml-auto h-24 w-4/5" />
          <Skeleton className="h-28" />
        </div>
      ) : query.isError ? (
        <Card className="p-8 text-center">
          <p className="text-ink-soft">Notlar yüklenemedi.</p>
          <Button variant="secondary" className="mt-4" onClick={() => query.refetch()}>
            Tekrar dene
          </Button>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={<Feather className="size-10" strokeWidth={1.3} />} title="Henüz not yok." text="İlk notu sen bırak; açtığında okunduğunu görürsün." />
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((m) => (
            <NoteCard
              key={m.id}
              m={m}
              fresh={!!freshIds?.has(m.id)}
              onDelete={async () => {
                const ok = await confirm({ title: 'Not silinsin mi?', text: 'İkiniz için de kaybolur.', confirmLabel: 'Sil', danger: true })
                if (ok) remove.mutate(m.id)
              }}
            />
          ))}
          {query.hasNextPage && (
            <div className="pt-4 text-center">
              <Button variant="soft" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage}>
                Daha eski notlar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
