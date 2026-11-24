import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock, LogOut } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMe } from '../../app/session'
import { useFeedback } from '../../components/feedback'
import { Button, Card, Field, PageHeader, PasswordInput, TextInput } from '../../components/ui'
import type { Session } from '../../domain/types'
import { Api, ApiError } from '../../lib/api'
import { todayISO } from '../../lib/format'

function Section({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <Card as="section" className="p-5 sm:p-7">
      <div className="mb-5">
        <h2 className="font-display text-xl text-ink">{title}</h2>
        {text && <p className="mt-1 text-[15px] text-muted">{text}</p>}
      </div>
      {children}
    </Card>
  )
}

function ProfileSection() {
  const { user } = useMe()
  const qc = useQueryClient()
  const { toast } = useFeedback()
  const [name, setName] = useState(user.displayName)
  useEffect(() => setName(user.displayName), [user.displayName])
  const save = useMutation({
    mutationFn: () => Api.updateProfile(name.trim()),
    onSuccess: (u) => {
      qc.setQueryData<Session | null>(['session'], (s) => (s ? { ...s, user: u } : s))
      qc.invalidateQueries({ queryKey: ['home'] })
      toast('Görünen adın güncellendi.')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Kaydedilemedi.', 'error'),
  })
  return (
    <Section title="Profil" text={`Kullanıcı adın: ${user.username}`}>
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim() && name.trim() !== user.displayName) save.mutate()
        }}
      >
        <div className="flex-1">
          <Field label="Görünen ad" htmlFor="display-name">
            <TextInput id="display-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
          </Field>
        </div>
        <Button type="submit" variant="secondary" loading={save.isPending} disabled={!name.trim() || name.trim() === user.displayName}>
          Kaydet
        </Button>
      </form>
    </Section>
  )
}

function SpaceSection() {
  const { space, partner } = useMe()
  const qc = useQueryClient()
  const { toast } = useFeedback()
  const [name, setName] = useState(space.name)
  const [since, setSince] = useState(space.togetherSince ?? '')
  const save = useMutation({
    mutationFn: () => Api.updateSpace({ name: name.trim(), togetherSince: since || null }),
    onSuccess: (s) => {
      qc.setQueryData<Session | null>(['session'], (old) => (old ? { ...old, space: s } : old))
      qc.invalidateQueries({ queryKey: ['home'] })
      toast('Ortak alan güncellendi.')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Kaydedilemedi.', 'error'),
  })
  const changed = name.trim() !== space.name || (since || null) !== space.togetherSince
  return (
    <Section title="Ortak alan" text={partner ? `${partner.displayName} ile paylaştığın alan. Burada yaptığın değişikliği o da görür.` : undefined}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (changed && name.trim()) save.mutate()
        }}
      >
        <Field label="Alanın adı" htmlFor="space-name">
          <TextInput id="space-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Birlikte olduğunuz gün" htmlFor="since" hint="Ana sayfadaki gün sayacı bu tarihten başlar.">
          <TextInput id="since" type="date" max={todayISO()} value={since} onChange={(e) => setSince(e.target.value)} />
        </Field>
        <Button type="submit" variant="secondary" loading={save.isPending} disabled={!changed || !name.trim()}>
          Kaydet
        </Button>
      </form>
    </Section>
  )
}

function PasswordSection() {
  const { user } = useMe()
  const { toast } = useFeedback()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!current) errs.currentPassword = 'Mevcut şifreni gir.'
    if (next.length < 8) errs.newPassword = 'Yeni şifre en az 8 karakter olmalı.'
    if (next !== confirm) errs.confirmPassword = 'Yeni şifreler birbiriyle eşleşmiyor.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setLoading(true)
    try {
      await Api.changePassword({ currentPassword: current, newPassword: next, confirmPassword: confirm })
      setCurrent('')
      setNext('')
      setConfirm('')
      toast('Şifren değişti. Diğer cihazlardaki oturumlar kapatıldı.')
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])))
      } else {
        toast(err instanceof ApiError ? err.message : 'Şifre değiştirilemedi.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const strength = next.length === 0 ? 0 : next.length < 8 ? 1 : /[^A-Za-z0-9]/.test(next) || (next.length >= 12 && /\d/.test(next)) ? 3 : 2

  return (
    <Section title="Şifre" text="Değiştirdiğinde diğer cihazlardaki oturumlar kapanır, bu cihazda devam edersin.">
      <form className="space-y-5" onSubmit={submit} noValidate>
        <input type="text" name="username" autoComplete="username" value={user.username} readOnly hidden />
        <Field label="Mevcut şifre" htmlFor="current" error={errors.currentPassword}>
          <PasswordInput id="current" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} invalid={!!errors.currentPassword} />
        </Field>
        <Field label="Yeni şifre" htmlFor="new" error={errors.newPassword} hint="En az 8 karakter. Harf, rakam ve işaret karışık olursa daha iyi.">
          <PasswordInput id="new" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} invalid={!!errors.newPassword} />
        </Field>
        {next.length > 0 && (
          <div className="flex items-center gap-2" aria-hidden>
            {[1, 2, 3].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${strength >= i ? (strength === 1 ? 'bg-blush-300' : strength === 2 ? 'bg-sage-400' : 'bg-sage-600') : 'bg-sand'}`} />
            ))}
            <span className="w-14 text-right text-xs text-muted">{strength === 1 ? 'kısa' : strength === 2 ? 'iyi' : 'güçlü'}</span>
          </div>
        )}
        <Field label="Yeni şifre (tekrar)" htmlFor="confirm" error={errors.confirmPassword}>
          <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={!!errors.confirmPassword} />
        </Field>
        <Button type="submit" icon={<Lock className="size-4" />} loading={loading}>
          Şifreyi değiştir
        </Button>
      </form>
    </Section>
  )
}

export default function SettingsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const [leaving, setLeaving] = useState(false)

  const logout = async () => {
    setLeaving(true)
    try {
      await Api.logout()
    } catch {
      // oturum zaten kapanmış olabilir
    }
    qc.clear()
    qc.setQueryData(['session'], null)
    toast('Çıkış yapıldı.', 'info')
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-12">
      <PageHeader title="Ayarlar" />
      <div className="space-y-5">
        <ProfileSection />
        <SpaceSection />
        <PasswordSection />
        <Section title="Oturum">
          <Button variant="danger" icon={<LogOut className="size-4" />} onClick={logout} loading={leaving}>
            Çıkış yap
          </Button>
        </Section>
        <p className="px-2 pb-4 text-center text-sm text-muted">OurBloom · yalnızca ikimiz için</p>
      </div>
    </div>
  )
}
