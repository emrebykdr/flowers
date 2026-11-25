import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, ChevronLeft, Copy, Pencil, Rotate3d, RotateCcw, Trash, ZoomIn, ZoomOut } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useTone } from '../../app/session'
import { useFeedback } from '../../components/feedback'
import { Avatar, Button, IconButton, Spinner } from '../../components/ui'
import { FLOWER_MAP, RIBBONS, SHAPES, WRAP_MAP, WRAP_SHAPES } from '../../domain/catalog'
import type { BouquetDetail } from '../../domain/types'
import { Api, ApiError } from '../../lib/api'
import { formatDate, toDateOnly, withSuffix } from '../../lib/format'
import { cn } from '../../lib/image'
import { BouquetViewer, type ViewerHandle } from '../../three/BouquetViewer'
import { invalidateBouquetQueries } from './shared'

function Composition({ detail }: { detail: BouquetDetail }) {
  const { design } = detail
  const pk = design.packaging
  const wrap = WRAP_MAP[pk.wrapMaterial]
  const ribbon = RIBBONS.find((r) => r.id === pk.ribbonStyle)
  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted">Çiçekler</h3>
        <ul className="space-y-1.5">
          {design.flowers.map((f) => (
            <li key={f.id} className="flex items-center gap-3 text-[15px]">
              <span className="size-4 shrink-0 rounded-full border border-black/10" style={{ background: f.color }} />
              <span className="text-ink">
                {f.count} {FLOWER_MAP[f.type].plural}
              </span>
              <span className="ml-auto text-sm text-muted">{f.stemLength} cm</span>
            </li>
          ))}
        </ul>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-[15px]">
        <div className="rounded-2xl bg-ivory/70 p-3">
          <dt className="text-xs font-semibold text-muted">Şekil</dt>
          <dd className="mt-0.5 text-ink">{SHAPES.find((s) => s.id === design.shape)?.name}</dd>
        </div>
        <div className="rounded-2xl bg-ivory/70 p-3">
          <dt className="text-xs font-semibold text-muted">Ambalaj</dt>
          <dd className="mt-0.5 text-ink">
            {pk.wrapMaterial !== 'none' && <span className="mr-1.5 inline-block size-3 rounded-full border border-black/10 align-[-1px]" style={{ background: pk.wrapColor }} />}
            {wrap.name}
            {pk.wrapMaterial !== 'none' && <span className="block text-sm text-muted">{WRAP_SHAPES.find((s) => s.id === pk.wrapShape)?.name}</span>}
          </dd>
        </div>
        <div className="col-span-2 rounded-2xl bg-ivory/70 p-3">
          <dt className="text-xs font-semibold text-muted">Bağ</dt>
          <dd className="mt-0.5 flex items-center gap-2 text-ink">
            {pk.ribbonStyle !== 'none' && <span className="size-3.5 rounded-full border border-black/10" style={{ background: pk.ribbonColor }} />}
            {ribbon?.name}
            {pk.ribbonStyle !== 'none' && pk.bow ? ', fiyonklu' : ''}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export default function BouquetDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast, confirm } = useFeedback()
  const viewer = useRef<ViewerHandle>(null)
  const tone = useTone()
  const [rotate, setRotate] = useState(true)
  const { data, isPending, isError, error } = useQuery({ queryKey: ['bouquet', id], queryFn: () => Api.bouquet(id!), enabled: !!id })

  const duplicate = useMutation({
    mutationFn: () => Api.duplicateBouquet(id!),
    onSuccess: ({ id: newId }) => {
      invalidateBouquetQueries(qc)
      toast('Kopya oluşturuldu; stüdyoda düzenleyebilirsin.')
      navigate(`/studio/${newId}`)
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Kopyalanamadı.', 'error'),
  })
  const remove = useMutation({
    mutationFn: () => Api.deleteBouquet(id!),
    onSuccess: () => {
      invalidateBouquetQueries(qc)
      toast('Buket silindi.')
      navigate('/bouquets', { replace: true })
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Silinemedi.', 'error'),
  })

  if (isPending)
    return (
      <div className="flex h-[70dvh] items-center justify-center">
        <Spinner />
      </div>
    )
  if (isError || !data)
    return (
      <div className="flex h-[70dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-2xl">{error instanceof ApiError && error.status === 404 ? 'Bu buket bulunamadı.' : 'Buket yüklenemedi.'}</p>
        <Link to="/memories">
          <Button variant="secondary">Anılara dön</Button>
        </Link>
      </div>
    )

  const s = data.summary
  const created = toDateOnly(new Date(s.createdAt))

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-10 lg:pt-10">
      <button
        type="button"
        onClick={() => ((window.history.state as { idx?: number } | null)?.idx ? navigate(-1) : navigate('/memories'))}
        className="mb-3 inline-flex h-10 items-center gap-1 rounded-full pr-3 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Geri
      </button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10">
        <div className="stage-bg relative h-[62dvh] min-h-[380px] overflow-hidden rounded-[1.75rem] shadow-soft ring-1 ring-line/60 lg:sticky lg:top-8 lg:h-[78dvh]">
          <BouquetViewer ref={viewer} design={data.design} autoRotate={rotate} fitOnLayoutChange={false} className="absolute inset-0" />
          <div className="absolute bottom-3 right-3 flex flex-col gap-2">
            <IconButton variant="glass" label="Yakınlaştır" onClick={() => viewer.current?.zoom(0.75)}>
              <ZoomIn className="size-5" />
            </IconButton>
            <IconButton variant="glass" label="Uzaklaştır" onClick={() => viewer.current?.zoom(1.3)}>
              <ZoomOut className="size-5" />
            </IconButton>
            <IconButton variant="glass" label="Görünümü sıfırla" onClick={() => viewer.current?.resetView()}>
              <RotateCcw className="size-5" />
            </IconButton>
            <IconButton
              variant="glass"
              label={rotate ? 'Dönmeyi durdur' : 'Döndür'}
              aria-pressed={rotate}
              onClick={() => setRotate((v) => !v)}
              className={cn(rotate && 'bg-ink text-cream hover:bg-ink')}
            >
              <Rotate3d className="size-5" />
            </IconButton>
          </div>
          <p className="pointer-events-none absolute left-4 top-4 rounded-full bg-paper/80 px-3 py-1.5 text-xs font-semibold text-ink-soft backdrop-blur">
            Sürükle, yakınlaş, detaylara bak
          </p>
        </div>

        <article className="pb-6">
          <p className="inline-flex items-center gap-2 text-sm text-muted">
            <Avatar name={s.owner.displayName} index={tone(s.owner.username)} size="sm" />
            {s.isMine ? 'Senin buketin' : `${withSuffix(s.owner.displayName, 'gen')} buketi`}
          </p>
          <h1 className="mt-3 font-display text-[2.4rem] leading-[1.05] tracking-[-0.02em] text-ink md:text-[3rem]">{s.name}</h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            {formatDate(s.memoryDate)}
            {created !== s.memoryDate && <span className="text-muted"> · tasarlandı {formatDate(created)}</span>}
          </p>

          {s.note && (
            <blockquote className="mt-6 rounded-[1.4rem] bg-blush-50 px-6 py-5 font-display text-[1.3rem] italic leading-relaxed text-ink">
              {s.note}
            </blockquote>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {s.isMine ? (
              <Link to={`/studio/${s.id}`}>
                <Button icon={<Pencil className="size-4" />}>Düzenle</Button>
              </Link>
            ) : null}
            <Button variant="secondary" icon={<Copy className="size-4" />} loading={duplicate.isPending} onClick={() => duplicate.mutate()}>
              {s.isMine ? 'Kopyala' : 'Kopyala ve düzenle'}
            </Button>
            <Link to={`/memories?new=1&bouquet=${s.id}`}>
              <Button variant="soft" icon={<BookOpen className="size-4" />}>
                Anı ekle
              </Button>
            </Link>
          </div>

          <div className="mt-8 rounded-[1.4rem] border border-line/70 bg-paper p-5 shadow-soft">
            <Composition detail={data} />
          </div>

          {s.isMine && (
            <button
              type="button"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Buket silinsin mi?',
                  text: 'Bu buket ikinizin koleksiyonundan da kalkar. Geri alınamaz.',
                  confirmLabel: 'Sil',
                  danger: true,
                })
                if (ok) remove.mutate()
              }}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-blush-700 hover:bg-blush-50"
            >
              <Trash className="size-4" /> Buketi sil
            </button>
          )}
        </article>
      </div>
    </div>
  )
}
