import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { BouquetPlaceholder } from '../../components/brand'
import { useTone } from '../../app/session'
import { Avatar } from '../../components/ui'
import type { BouquetSummary } from '../../domain/types'
import { Api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { cn } from '../../lib/image'

// ---------------------------------------------------------------------------
// Eksik önizlemeleri arka planda üret (ör. örnek içerik ya da yarım kalan kayıt)
// ---------------------------------------------------------------------------

const queue: string[] = []
const attempted = new Set<string>()
let running = false

export function invalidateBouquetQueries(qc: QueryClient, id?: string) {
  qc.invalidateQueries({ queryKey: ['bouquets'] })
  qc.invalidateQueries({ queryKey: ['home'] })
  qc.invalidateQueries({ queryKey: ['memories'] })
  if (id) qc.invalidateQueries({ queryKey: ['bouquet', id] })
}

async function drain(qc: QueryClient) {
  if (running) return
  running = true
  try {
    while (queue.length) {
      const id = queue.shift()!
      try {
        const detail = await Api.bouquet(id)
        if (detail.summary.previewUrl) continue
        const { renderBouquetPreview } = await import('../../three/snapshot')
        const blob = await renderBouquetPreview(detail.design)
        await Api.uploadPreview(id, blob)
        invalidateBouquetQueries(qc, id)
      } catch {
        // Önizleme şart değil; yer tutucu görünmeye devam eder.
      }
    }
  } finally {
    running = false
  }
}

export function requestPreviewRepair(id: string, qc: QueryClient) {
  if (attempted.has(id)) return
  attempted.add(id)
  queue.push(id)
  // Sayfa ilk çizilirken ağır işi biraz geciktir
  window.setTimeout(() => void drain(qc), 600)
}

export function BouquetImage({ summary, className, eager }: { summary: Pick<BouquetSummary, 'id' | 'previewUrl' | 'flowers' | 'name'>; className?: string; eager?: boolean }) {
  const qc = useQueryClient()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!summary.previewUrl) requestPreviewRepair(summary.id, qc)
  }, [summary.id, summary.previewUrl, qc])

  if (!summary.previewUrl || failed) return <BouquetPlaceholder flowers={summary.flowers} className={className} />
  return (
    <img
      src={summary.previewUrl}
      alt={`${summary.name} buketinin önizlemesi`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('bg-ivory object-cover', className)}
    />
  )
}

export function OwnerTag({ summary }: { summary: BouquetSummary }) {
  const tone = useTone()
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar name={summary.owner.displayName} index={tone(summary.owner.username)} size="sm" />
      <span>{summary.isMine ? 'Sen' : summary.owner.displayName}</span>
    </span>
  )
}

export function BouquetCard({ summary, className }: { summary: BouquetSummary; className?: string }) {
  return (
    <Link to={`/bouquets/${summary.id}`} className={cn('group block rounded-[1.4rem] outline-offset-4', className)}>
      <div className="overflow-hidden rounded-[1.4rem] bg-ivory shadow-soft ring-1 ring-line/60 transition duration-300 group-hover:shadow-lift">
        <BouquetImage summary={summary} className="aspect-[4/5] w-full transition duration-500 group-hover:scale-[1.025]" />
      </div>
      <div className="mt-3 px-1">
        <h3 className="truncate font-display text-[1.15rem] leading-snug text-ink">{summary.name}</h3>
        <div className="mt-1 flex items-center justify-between gap-2 text-[13px] text-muted">
          <span className="truncate">{formatDate(summary.memoryDate)}</span>
          <OwnerTag summary={summary} />
        </div>
      </div>
    </Link>
  )
}

export function BouquetGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="aspect-[4/5] animate-pulse rounded-[1.4rem] bg-ivory" />
          <div className="mt-3 h-5 w-2/3 animate-pulse rounded-full bg-ivory" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded-full bg-ivory" />
        </div>
      ))}
    </div>
  )
}
