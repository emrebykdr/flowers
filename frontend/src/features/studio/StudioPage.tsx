import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronLeft,
  Flower2,
  Layers,
  Redo2,
  Rotate3d,
  RotateCcw,
  Save,
  Shapes,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { useFeedback } from '../../components/feedback'
import { Button, IconButton, Spinner } from '../../components/ui'
import { SHAPES, starterDesign, stemCount } from '../../domain/catalog'
import { Api, ApiError } from '../../lib/api'
import { todayISO, withSuffix } from '../../lib/format'
import { cn } from '../../lib/image'
import { BouquetViewer, type ViewerHandle } from '../../three/BouquetViewer'
import { invalidateBouquetQueries } from '../bouquets/shared'
import { FlowersPanel } from './FlowersPanel'
import { SaveSheet } from './SaveSheet'
import { ShapePanel, WrapPanel } from './ShapeWrapPanels'
import { clearDraft, readDraft, useStudio } from './store'

type Tab = 'flowers' | 'shape' | 'wrap'

const TABS: { id: Tab; label: string; icon: typeof Flower2 }[] = [
  { id: 'flowers', label: 'Çiçekler', icon: Flower2 },
  { id: 'shape', label: 'Şekil', icon: Shapes },
  { id: 'wrap', label: 'Ambalaj', icon: Layers },
]

function NotMine({ id, ownerName }: { id: string; ownerName: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast } = useFeedback()
  const copy = useMutation({
    mutationFn: () => Api.duplicateBouquet(id),
    onSuccess: ({ id: newId }) => {
      invalidateBouquetQueries(qc)
      toast('Kopya oluşturuldu, artık senin.')
      navigate(`/studio/${newId}`, { replace: true })
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Kopyalanamadı.', 'error'),
  })
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Flower2 className="size-10 text-blush-500" strokeWidth={1.4} />
      <h1 className="mt-4 font-display text-3xl">Bu buket {withSuffix(ownerName, 'gen')}.</h1>
      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
        Tasarım sahibine ait kalır. İstersen kopyalayıp kendi buketin olarak düzenleyebilirsin.
      </p>
      <div className="mt-7 flex flex-col gap-2 sm:flex-row">
        <Link to={`/bouquets/${id}`}>
          <Button variant="secondary" block>
            Buketi görüntüle
          </Button>
        </Link>
        <Button onClick={() => copy.mutate()} loading={copy.isPending}>
          Kopyala ve düzenle
        </Button>
      </div>
    </div>
  )
}

export default function StudioPage() {
  const { id } = useParams()
  const key = id ?? 'new'
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast, confirm } = useFeedback()
  const studio = useStudio()
  const viewerRef = useRef<ViewerHandle>(null)

  const [tab, setTab] = useState<Tab>('flowers')
  const [panelOpen, setPanelOpen] = useState(true)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [autoRotate, setAutoRotate] = useState(false)
  const [hint, setHint] = useState(true)

  const needsLoad = !!id && studio.loadedKey !== id
  const detail = useQuery({ queryKey: ['bouquet', id], queryFn: () => Api.bouquet(id!), enabled: needsLoad })

  useEffect(() => {
    const s = useStudio.getState()
    if (s.loadedKey === key) return
    if (!id) {
      const draft = readDraft()
      if (draft && draft.design.flowers.length) {
        s.init({ key: 'new', bouquetId: null, design: draft.design, meta: { ...draft.meta, memoryDate: draft.meta.memoryDate || todayISO() }, restoredDraft: true })
      } else {
        s.init({ key: 'new', bouquetId: null, design: starterDesign(), meta: { name: '', note: '', memoryDate: todayISO() } })
      }
      return
    }
    const d = detail.data
    if (d && d.summary.isMine) {
      s.init({
        key: id,
        bouquetId: id,
        design: d.design,
        meta: { name: d.summary.name, note: d.summary.note ?? '', memoryDate: d.summary.memoryDate },
      })
    }
  }, [key, id, detail.data])

  useEffect(() => {
    const t = window.setTimeout(() => setHint(false), 7000)
    return () => window.clearTimeout(t)
  }, [])

  // Kayıtlı bir buketi düzenlerken kaydetmeden çıkma uyarısı (yeni tasarım zaten taslak olarak saklanıyor)
  const guard = studio.dirty && !!studio.bouquetId && !saving
  const blocker = useBlocker(({ currentLocation, nextLocation }) => guard && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    let active = true
    confirm({
      title: 'Değişiklikler kaydedilmedi',
      text: 'Çıkarsan son yaptığın değişiklikler kaybolacak.',
      confirmLabel: 'Kaydetmeden çık',
      danger: true,
    }).then((leave) => {
      if (!active) return
      if (leave) {
        useStudio.setState({ loadedKey: null, dirty: false })
        blocker.proceed?.()
      } else blocker.reset?.()
    })
    return () => {
      active = false
    }
  }, [blocker, confirm])

  useEffect(() => {
    if (!guard) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [guard])

  const openSave = useCallback(() => {
    setSavedId(null)
    setSaveError(null)
    setSaveOpen(true)
  }, [])

  // Masaüstü kısayolları
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, [contenteditable]')) return
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        useStudio.getState().undo()
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        useStudio.getState().redo()
      } else if (k === 's') {
        e.preventDefault()
        openSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openSave])

  const save = async () => {
    const state = useStudio.getState()
    if (!state.design.flowers.length) {
      setSaveError('Bukette en az bir çiçek olmalı.')
      return
    }
    setSaving(true)
    setSaveError(null)
    const body = {
      name: state.name.trim(),
      note: state.note.trim(),
      memoryDate: state.memoryDate || todayISO(),
      design: state.design,
    }
    try {
      let bid = state.bouquetId
      if (bid) await Api.updateBouquet(bid, body)
      else bid = (await Api.createBouquet(body)).id
      try {
        const { renderBouquetPreview } = await import('../../three/snapshot')
        const image = await renderBouquetPreview(state.design)
        await Api.uploadPreview(bid, image)
      } catch {
        toast('Önizleme görseli oluşturulamadı; buket yine de kaydedildi.', 'info')
      }
      useStudio.getState().markSaved(bid, bid)
      clearDraft()
      invalidateBouquetQueries(qc, bid)
      setSavedId(bid)
      if (id !== bid) navigate(`/studio/${bid}`, { replace: true })
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Kaydedilemedi. Bağlantını kontrol et.')
    } finally {
      setSaving(false)
    }
  }

  const startFresh = () => {
    clearDraft()
    useStudio.getState().init({ key: 'new', bouquetId: null, design: starterDesign(), meta: { name: '', note: '', memoryDate: todayISO() } })
  }

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/')
  }

  const selectFromViewer = useCallback((groupId: string) => {
    useStudio.getState().select(groupId)
    setTab('flowers')
    setPanelOpen(true)
  }, [])

  // ---- yükleme / yetki durumları ----
  if (needsLoad) {
    if (detail.isPending)
      return (
        <div className="flex min-h-dvh items-center justify-center">
          <Spinner />
        </div>
      )
    if (detail.isError)
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-display text-2xl">Bu buket bulunamadı.</p>
          <Link to="/studio">
            <Button>Yeni buket tasarla</Button>
          </Link>
        </div>
      )
    if (detail.data && !detail.data.summary.isMine) return <NotMine id={id!} ownerName={detail.data.summary.owner.displayName} />
  }
  if (studio.loadedKey !== key) return null

  const total = stemCount(studio.design)
  const shapeName = SHAPES.find((s) => s.id === studio.design.shape)?.name ?? ''

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-cream">
      <header className="z-10 shrink-0 border-b border-line/60 bg-cream/90 pt-safe backdrop-blur-xl">
        <div className="flex h-14 items-center gap-1 px-2 sm:px-3">
          <IconButton label="Geri" onClick={goBack}>
            <ChevronLeft className="size-5" />
          </IconButton>
          <div className="min-w-0 flex-1 px-1">
            <p className="truncate font-display text-[1.15rem] leading-tight text-ink">
              {studio.name.trim() || (studio.bouquetId ? 'Adsız buket' : 'Yeni buket')}
            </p>
            <p className="truncate text-xs text-muted">
              {total} dal · {shapeName}
              {studio.dirty ? ' · kaydedilmedi' : ' · kayıtlı'}
            </p>
          </div>
          <IconButton label="Geri al" disabled={!studio.past.length} onClick={studio.undo}>
            <Undo2 className="size-5" />
          </IconButton>
          <IconButton label="Yinele" disabled={!studio.future.length} onClick={studio.redo}>
            <Redo2 className="size-5" />
          </IconButton>
          <Button size="sm" className="ml-1 h-10 px-4" icon={<Save className="size-4" />} onClick={openSave}>
            Kaydet
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="stage-bg relative min-h-[34dvh] flex-1" aria-label="3D önizleme">
          <BouquetViewer
            ref={viewerRef}
            design={studio.design}
            selectedGroupId={studio.selectedId}
            onSelectGroup={selectFromViewer}
            autoRotate={autoRotate}
            className="absolute inset-0"
          />

          {studio.restoredDraft && (
            <div className="absolute inset-x-3 top-3 flex justify-center">
              <div className="flex animate-pop items-center gap-3 rounded-full bg-paper/90 py-1.5 pl-4 pr-1.5 text-sm shadow-soft backdrop-blur">
                <span className="text-ink-soft">Kaldığın yerden devam ediyorsun.</span>
                <button type="button" onClick={startFresh} className="h-8 rounded-full bg-ivory px-3 font-semibold text-ink hover:bg-sand/70">
                  Yeni başla
                </button>
              </div>
            </div>
          )}

          {total === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <p className="rounded-2xl bg-paper/85 px-5 py-3 text-center text-[15px] text-ink-soft shadow-soft backdrop-blur">
                Buket şimdilik boş. Çiçekler sekmesinden ekle.
              </p>
            </div>
          )}

          {hint && total > 0 && !studio.restoredDraft && (
            <p className="pointer-events-none absolute left-3 top-3 animate-fade rounded-full bg-paper/80 px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-soft backdrop-blur">
              Sürükle: döndür · Sıkıştır: yakınlaştır · Çiçeğe dokun: seç
            </p>
          )}

          <div className="absolute bottom-3 right-3 flex flex-col gap-2">
            <IconButton variant="glass" label="Yakınlaştır" onClick={() => viewerRef.current?.zoom(0.78)}>
              <ZoomIn className="size-5" />
            </IconButton>
            <IconButton variant="glass" label="Uzaklaştır" onClick={() => viewerRef.current?.zoom(1.28)}>
              <ZoomOut className="size-5" />
            </IconButton>
            <IconButton variant="glass" label="Görünümü sıfırla" onClick={() => viewerRef.current?.resetView()}>
              <RotateCcw className="size-5" />
            </IconButton>
            <IconButton
              variant="glass"
              label={autoRotate ? 'Dönmeyi durdur' : 'Kendi etrafında döndür'}
              aria-pressed={autoRotate}
              onClick={() => setAutoRotate((v) => !v)}
              className={cn(autoRotate && 'bg-ink text-cream hover:bg-ink')}
            >
              <Rotate3d className="size-5" />
            </IconButton>
          </div>
        </section>

        <section
          className={cn(
            'relative z-10 flex shrink-0 flex-col border-line/70 bg-paper shadow-[0_-12px_30px_-18px_rgb(45_41_38/0.25)] transition-[height] duration-300 lg:h-auto lg:w-[420px] lg:border-l lg:shadow-none',
            panelOpen ? 'h-[54dvh]' : 'h-auto',
            'rounded-t-[1.6rem] lg:rounded-none',
          )}
          aria-label="Tasarım paneli"
        >
          <div className="flex items-center gap-2 px-4 pb-2 pt-3">
            <div role="tablist" aria-label="Tasarım bölümleri" className="flex flex-1 rounded-full bg-ivory p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => {
                    setTab(t.id)
                    setPanelOpen(true)
                  }}
                  className={cn(
                    'inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition',
                    tab === t.id ? 'bg-paper text-ink shadow-soft' : 'text-muted hover:text-ink',
                  )}
                >
                  <t.icon className="size-4" strokeWidth={1.9} />
                  {t.label}
                </button>
              ))}
            </div>
            <IconButton
              label={panelOpen ? 'Paneli küçült' : 'Paneli aç'}
              variant="soft"
              size="sm"
              className="lg:hidden"
              onClick={() => setPanelOpen((v) => !v)}
            >
              <ChevronDown className={cn('size-4 transition', !panelOpen && 'rotate-180')} />
            </IconButton>
          </div>
          <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3', !panelOpen && 'hidden lg:block')}>
            {tab === 'flowers' && <FlowersPanel onFocusGroup={(gid) => viewerRef.current?.focusGroup(gid)} />}
            {tab === 'shape' && <ShapePanel />}
            {tab === 'wrap' && <WrapPanel />}
          </div>
        </section>
      </div>

      <SaveSheet open={saveOpen} onClose={() => setSaveOpen(false)} onSave={save} saving={saving} savedId={savedId} error={saveError} />
    </div>
  )
}
