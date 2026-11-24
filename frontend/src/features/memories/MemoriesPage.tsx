import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, ImagePlus, Pencil, Plus, Search, Trash, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useMe } from '../../app/session'
import { Sheet, useFeedback } from '../../components/feedback'
import { Avatar, Button, Card, EmptyState, Field, PageHeader, Segmented, Skeleton, TextArea, TextInput } from '../../components/ui'
import type { BouquetSummary, MemoryItem } from '../../domain/types'
import { Api, ApiError } from '../../lib/api'
import { formatDate, formatMonth, todayISO, withSuffix } from '../../lib/format'
import { cn, resizeImage } from '../../lib/image'
import { BouquetCard, BouquetImage } from '../bouquets/shared'

type Entry =
  | { kind: 'bouquet'; id: string; date: string; createdAt: string; mine: boolean; item: BouquetSummary }
  | { kind: 'memory'; id: string; date: string; createdAt: string; mine: boolean; item: MemoryItem }

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return v
}

function MemoryCard({ m, onOpen, tone }: { m: MemoryItem; onOpen: () => void; tone: number }) {
  return (
    <button type="button" onClick={onOpen} className="group block w-full rounded-[1.4rem] text-left outline-offset-4">
      {m.photoUrl ? (
        <div className="overflow-hidden rounded-[1.4rem] bg-ivory shadow-soft ring-1 ring-line/60">
          <img src={m.photoUrl} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
        </div>
      ) : (
        <div
          className={cn(
            'paper-grain flex aspect-[4/5] flex-col justify-between rounded-[1.4rem] p-5 shadow-soft ring-1 ring-line/60 transition group-hover:shadow-lift',
            tone % 2 === 0 ? 'bg-blush-50' : 'bg-sage-50',
          )}
        >
          <BookOpen className="size-5 text-ink-soft/60" strokeWidth={1.6} />
          <p className="line-clamp-6 font-display text-[1.05rem] italic leading-relaxed text-ink-soft">{m.body || m.title}</p>
        </div>
      )}
      <div className="mt-3 px-1">
        <h3 className="truncate font-display text-[1.15rem] leading-snug text-ink">{m.title}</h3>
        <div className="mt-1 flex items-center justify-between gap-2 text-[13px] text-muted">
          <span className="truncate">{formatDate(m.date)}</span>
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={m.author.displayName} index={m.isMine ? 0 : 1} size="sm" />
            {m.isMine ? 'Sen' : m.author.displayName}
          </span>
        </div>
      </div>
    </button>
  )
}

function MemoryEditor({
  open,
  onClose,
  memory,
  initialBouquetId,
  bouquets,
}: {
  open: boolean
  onClose: () => void
  memory: MemoryItem | null
  initialBouquetId: string | null
  bouquets: BouquetSummary[]
}) {
  const qc = useQueryClient()
  const { toast } = useFeedback()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayISO())
  const [body, setBody] = useState('')
  const [bouquetId, setBouquetId] = useState<string>('')
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTitle(memory?.title ?? '')
    setDate(memory?.date ?? todayISO())
    setBody(memory?.body ?? '')
    setBouquetId(memory?.bouquet?.id ?? initialBouquetId ?? '')
    setPhoto(null)
    setRemovePhoto(false)
    setErrors({})
  }, [open, memory, initialBouquetId])

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url)
  }, [photo])

  const pick = async (file: File | undefined) => {
    if (!file) return
    try {
      const blob = await resizeImage(file)
      setPhoto({ blob, url: URL.createObjectURL(blob) })
      setRemovePhoto(false)
    } catch {
      toast('Bu fotoğraf açılamadı. Başka bir tane dene.', 'error')
    }
  }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Kısa bir başlık yaz.'
    if (!date) e.date = 'Bir tarih seç.'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const payload = { title: title.trim(), body: body.trim(), date, bouquetId: bouquetId || null }
      const id = memory ? (await Api.updateMemory(memory.id, payload), memory.id) : (await Api.createMemory(payload)).id
      if (photo) await Api.uploadMemoryPhoto(id, photo.blob)
      else if (removePhoto && memory?.photoUrl) await Api.deleteMemoryPhoto(id)
      qc.invalidateQueries({ queryKey: ['memories'] })
      qc.invalidateQueries({ queryKey: ['home'] })
      toast(memory ? 'Anı güncellendi.' : 'Anı eklendi.')
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])))
      } else toast(err instanceof ApiError ? err.message : 'Kaydedilemedi.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const currentPhoto = photo?.url ?? (!removePhoto ? memory?.photoUrl : null)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={memory ? 'Anıyı düzenle' : 'Yeni anı'}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="soft" onClick={onClose} disabled={saving}>
            Vazgeç
          </Button>
          <Button onClick={submit} loading={saving}>
            Kaydet
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Başlık" htmlFor="m-title" error={errors.title}>
          <TextInput id="m-title" data-autofocus value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} invalid={!!errors.title} />
        </Field>
        <Field label="Tarih" htmlFor="m-date" error={errors.date}>
          <TextInput id="m-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} invalid={!!errors.date} />
        </Field>
        <Field label="Ne oldu?" htmlFor="m-body" error={errors.body} aside={<span className="text-xs text-muted tabular-nums">{body.length}/1500</span>}>
          <TextArea id="m-body" rows={4} maxLength={1500} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink-soft">Fotoğraf</p>
          {currentPhoto ? (
            <div className="relative overflow-hidden rounded-2xl">
              <img src={currentPhoto} alt="Seçilen fotoğraf" className="max-h-72 w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null)
                  setRemovePhoto(true)
                }}
                className="absolute right-2 top-2 inline-flex size-10 items-center justify-center rounded-full bg-paper/90 text-ink shadow-soft"
                aria-label="Fotoğrafı kaldır"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/20 bg-cream text-sm font-semibold text-ink-soft transition hover:border-ink/40"
            >
              <ImagePlus className="size-6" strokeWidth={1.6} /> Fotoğraf ekle
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </div>

        {bouquets.length > 0 && (
          <Field label="Bağlı buket" htmlFor="m-bouquet" hint="İsteğe bağlı: bu anıya bir buket iliştir.">
            <select
              id="m-bouquet"
              value={bouquetId}
              onChange={(e) => setBouquetId(e.target.value)}
              className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base text-ink focus:border-ink/30 focus:outline-none focus:ring-4 focus:ring-blush-100/70"
            >
              <option value="">Buket yok</option>
              {bouquets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {formatDate(b.memoryDate)}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </Sheet>
  )
}

function MemoryDetail({ memory, onClose, onEdit }: { memory: MemoryItem | null; onClose: () => void; onEdit: () => void }) {
  const qc = useQueryClient()
  const { toast, confirm } = useFeedback()
  const [deleting, setDeleting] = useState(false)
  return (
    <Sheet open={!!memory} onClose={onClose} title={memory?.title ?? ''} description={memory ? formatDate(memory.date) : undefined} size="lg">
      {memory && (
        <div className="space-y-5 pb-2">
          {memory.photoUrl && <img src={memory.photoUrl} alt="" className="max-h-[50dvh] w-full rounded-2xl object-cover" />}
          {memory.body && <p className="whitespace-pre-line font-display text-[1.15rem] leading-relaxed text-ink">{memory.body}</p>}
          <p className="inline-flex items-center gap-2 text-sm text-muted">
            <Avatar name={memory.author.displayName} index={memory.isMine ? 0 : 1} size="sm" />
            {memory.isMine ? 'Sen yazdın' : `${withSuffix(memory.author.displayName, 'abl')}`}
          </p>
          {memory.bouquet && (
            <Link to={`/bouquets/${memory.bouquet.id}`} className="flex items-center gap-3 rounded-2xl border border-line/70 p-2 pr-4 hover:bg-cream">
              <div className="size-16 overflow-hidden rounded-xl bg-ivory">
                <BouquetImage summary={{ id: memory.bouquet.id, name: memory.bouquet.name, previewUrl: memory.bouquet.previewUrl, flowers: [] }} className="size-full" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted">Bağlı buket</p>
                <p className="font-display text-lg text-ink">{memory.bouquet.name}</p>
              </div>
            </Link>
          )}
          {memory.isMine && (
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={onEdit}>
                Düzenle
              </Button>
              <Button
                variant="danger"
                icon={<Trash className="size-4" />}
                loading={deleting}
                onClick={async () => {
                  const ok = await confirm({ title: 'Anı silinsin mi?', text: 'Fotoğrafıyla birlikte kalıcı olarak silinir.', confirmLabel: 'Sil', danger: true })
                  if (!ok) return
                  setDeleting(true)
                  try {
                    await Api.deleteMemory(memory.id)
                    qc.invalidateQueries({ queryKey: ['memories'] })
                    qc.invalidateQueries({ queryKey: ['home'] })
                    toast('Anı silindi.')
                    onClose()
                  } catch (err) {
                    toast(err instanceof ApiError ? err.message : 'Silinemedi.', 'error')
                  } finally {
                    setDeleting(false)
                  }
                }}
              >
                Sil
              </Button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}

export default function MemoriesPage() {
  const { partner } = useMe()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const query = useDebounced(q.trim())
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [kind, setKind] = useState<'all' | 'bouquet' | 'memory'>('all')
  const [who, setWho] = useState<'all' | 'me' | 'partner'>('all')

  const bouquets = useQuery({ queryKey: ['bouquets', { owner: 'all', q: query, sort }], queryFn: () => Api.bouquets({ owner: 'all', q: query, sort }) })
  const memories = useQuery({ queryKey: ['memories', { q: query, sort }], queryFn: () => Api.memories({ q: query, sort }) })
  const allBouquets = useQuery({ queryKey: ['bouquets', { owner: 'all', sort: 'newest' }], queryFn: () => Api.bouquets({ owner: 'all', sort: 'newest' }) })

  const openId = params.get('open')
  const editorOpen = params.get('new') === '1' || !!params.get('edit')
  const opened = useMemo(() => memories.data?.find((m) => m.id === openId) ?? null, [memories.data, openId])
  const editId = params.get('edit')
  const editing = useMemo(() => memories.data?.find((m) => m.id === editId) ?? null, [memories.data, editId])

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = []
    if (kind !== 'memory')
      for (const b of bouquets.data ?? []) list.push({ kind: 'bouquet', id: b.id, date: b.memoryDate, createdAt: b.createdAt, mine: b.isMine, item: b })
    if (kind !== 'bouquet')
      for (const m of memories.data ?? []) list.push({ kind: 'memory', id: m.id, date: m.date, createdAt: m.createdAt, mine: m.isMine, item: m })
    const filtered = list.filter((e) => (who === 'all' ? true : who === 'me' ? e.mine : !e.mine))
    filtered.sort((a, b) => {
      const c = a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
      return sort === 'newest' ? -c : c
    })
    return filtered
  }, [bouquets.data, memories.data, kind, who, sort])

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>()
    for (const e of entries) {
      const key = e.date.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return [...map.entries()]
  }, [entries])

  const loading = bouquets.isPending || memories.isPending
  const failed = bouquets.isError || memories.isError

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-12">
      <PageHeader
        title="Anılarımız"
        subtitle="Bütün buketler ve birlikte biriktirdiklerimiz, tarih sırasıyla."
        action={
          <Button icon={<Plus className="size-4" />} onClick={() => setParam({ new: '1', edit: null })}>
            <span className="hidden sm:inline">Anı ekle</span>
            <span className="sm:hidden">Ekle</span>
          </Button>
        }
      />

      <div className="mb-8 space-y-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <TextInput
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buket ya da anı adıyla ara"
            className="pl-12"
            aria-label="Ara"
            enterKeyHint="search"
          />
        </label>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Segmented
            label="Tür"
            size="sm"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'all', label: 'Tümü' },
              { value: 'bouquet', label: 'Buketler' },
              { value: 'memory', label: 'Anlar' },
            ]}
          />
          <Segmented
            label="Kişi"
            size="sm"
            value={who}
            onChange={setWho}
            options={[
              { value: 'all', label: 'İkimiz' },
              { value: 'me', label: 'Ben' },
              { value: 'partner', label: partner?.displayName ?? 'O' },
            ]}
          />
          <Segmented
            label="Sıralama"
            size="sm"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'newest', label: 'Yeniden eskiye' },
              { value: 'oldest', label: 'Eskiden yeniye' },
            ]}
          />
        </div>
      </div>

      {failed ? (
        <Card className="p-8 text-center">
          <p className="text-ink-soft">Arşiv yüklenemedi.</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              bouquets.refetch()
              memories.refetch()
            }}
          >
            Tekrar dene
          </Button>
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5]" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen className="size-10" strokeWidth={1.3} />}
            title={query ? 'Bu aramaya uyan bir şey yok.' : 'Arşiv şimdilik boş.'}
            text={query ? 'Başka bir kelime dene ya da filtreleri temizle.' : 'Kaydettiğiniz buketler ve eklediğiniz anılar burada toplanır.'}
            action={
              !query ? (
                <Button onClick={() => setParam({ new: '1' })} icon={<Plus className="size-4" />}>
                  İlk anıyı ekle
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-12">
          {groups.map(([month, list]) => (
            <section key={month}>
              <h2 className="mb-4 flex items-baseline gap-3 font-display text-2xl capitalize text-ink">
                {formatMonth(`${month}-01`)}
                <span className="font-sans text-sm font-semibold normal-case text-muted">{list.length}</span>
              </h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
                {list.map((e, i) =>
                  e.kind === 'bouquet' ? (
                    <BouquetCard key={`b-${e.id}`} summary={e.item} />
                  ) : (
                    <MemoryCard key={`m-${e.id}`} m={e.item} tone={i} onOpen={() => setParam({ open: e.id })} />
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <MemoryDetail
        memory={opened}
        onClose={() => setParam({ open: null })}
        onEdit={() => setParam({ open: null, edit: opened?.id ?? null })}
      />
      <MemoryEditor
        open={editorOpen}
        memory={editing}
        initialBouquetId={params.get('bouquet')}
        bouquets={allBouquets.data ?? []}
        onClose={() => setParam({ new: null, edit: null, bouquet: null })}
      />
    </div>
  )
}
