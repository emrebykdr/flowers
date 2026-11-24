import { useQuery } from '@tanstack/react-query'
import { Flower2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useMe } from '../../app/session'
import { Button, Card, EmptyState, PageHeader, Segmented } from '../../components/ui'
import { Api } from '../../lib/api'
import { withSuffix } from '../../lib/format'
import { BouquetCard, BouquetGridSkeleton } from './shared'

export default function MyBouquetsPage() {
  const { partner } = useMe()
  const [owner, setOwner] = useState<'me' | 'partner'>('me')
  const [sort, setSort] = useState<'newest' | 'updated'>('updated')
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['bouquets', { owner, sort }],
    queryFn: () => Api.bouquets({ owner, sort }),
  })

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-12">
      <PageHeader
        title="Buketlerim"
        subtitle={owner === 'me' ? 'Senin tasarladıkların.' : partner ? `${withSuffix(partner.displayName, 'gen')} tasarladıkları.` : ''}
        action={
          <Link to="/studio" className="hidden sm:block">
            <Button icon={<Plus className="size-4" />}>Yeni buket</Button>
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Kimin buketleri"
          value={owner}
          onChange={setOwner}
          options={[
            { value: 'me', label: 'Benimkiler' },
            { value: 'partner', label: partner ? withSuffix(partner.displayName, 'gen') + 'kiler' : 'Onunkiler' },
          ]}
        />
        <Segmented
          label="Sıralama"
          size="sm"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'updated', label: 'Son düzenlenen' },
            { value: 'newest', label: 'Tarihe göre' },
          ]}
        />
      </div>

      {isError ? (
        <Card className="p-8 text-center">
          <p className="text-ink-soft">Buketler yüklenemedi.</p>
          <Button variant="secondary" className="mt-4" onClick={() => refetch()}>
            Tekrar dene
          </Button>
        </Card>
      ) : isPending ? (
        <BouquetGridSkeleton />
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Flower2 className="size-10" strokeWidth={1.3} />}
            title={owner === 'me' ? 'Henüz buket tasarlamadın.' : 'Henüz buradan bir buket gelmedi.'}
            text={owner === 'me' ? 'Stüdyoda çiçekleri seç, renklerini ve ambalajını ayarla; kaydettiğinde burada durur.' : 'Tasarladığı buketler burada görünecek.'}
            action={
              owner === 'me' ? (
                <Link to="/studio">
                  <Button icon={<Plus className="size-4" />}>İlk buketi tasarla</Button>
                </Link>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
          {data.map((b) => (
            <BouquetCard key={b.id} summary={b} />
          ))}
        </div>
      )}
    </div>
  )
}
