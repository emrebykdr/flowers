import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { Splash, useSessionQuery } from '../../app/session'
import { LogoMark, Wordmark } from '../../components/brand'
import { Button, Field, PasswordInput, TextInput } from '../../components/ui'
import { Api, ApiError } from '../../lib/api'

/** İnce çizgili, sakin bir bitki çizimi. */
function BotanicalLines({ className }: { className?: string }) {
  const stroke = 'rgb(91 83 78 / 0.38)'
  const petal = (cx: number, cy: number, r: number, n: number, rot = 0) =>
    Array.from({ length: n }, (_, i) => (
      <ellipse
        key={i}
        cx={cx}
        cy={cy - r}
        rx={r * 0.48}
        ry={r * 0.95}
        transform={`rotate(${rot + (i * 360) / n} ${cx} ${cy})`}
        fill="none"
        stroke={stroke}
        strokeWidth="1.1"
      />
    ))
  return (
    <svg viewBox="0 0 320 420" className={className} aria-hidden>
      <path d="M150 420 C 148 350, 140 280, 118 200" fill="none" stroke={stroke} strokeWidth="1.2" />
      <path d="M162 420 C 166 340, 182 270, 214 170" fill="none" stroke={stroke} strokeWidth="1.2" />
      <path d="M156 420 C 157 360, 158 300, 160 250" fill="none" stroke={stroke} strokeWidth="1.2" />
      <path d="M145 330 q -34 -6 -50 -36 q 34 4 50 36 z" fill="rgb(155 176 140 / 0.18)" stroke={stroke} strokeWidth="1.1" />
      <path d="M170 300 q 30 -14 54 -6 q -26 20 -54 6 z" fill="rgb(155 176 140 / 0.18)" stroke={stroke} strokeWidth="1.1" />
      <path d="M158 360 q 26 -18 46 -14 q -20 22 -46 14 z" fill="rgb(155 176 140 / 0.14)" stroke={stroke} strokeWidth="1.1" />
      <g>{petal(118, 196, 22, 6, 10)}</g>
      <circle cx="118" cy="196" r="7" fill="rgb(226 175 167 / 0.35)" stroke={stroke} strokeWidth="1.1" />
      <g>{petal(214, 166, 26, 5, -8)}</g>
      <circle cx="214" cy="166" r="8" fill="rgb(155 176 140 / 0.3)" stroke={stroke} strokeWidth="1.1" />
      <path d="M146 250 C 140 222, 146 200, 160 190 C 174 200, 180 222, 174 250 C 168 262, 152 262, 146 250 z" fill="rgb(239 204 198 / 0.35)" stroke={stroke} strokeWidth="1.1" />
      <path d="M160 190 C 156 214, 158 236, 160 252" fill="none" stroke={stroke} strokeWidth="0.9" />
    </svg>
  )
}

export default function LoginPage() {
  const { data: session, isPending } = useSessionQuery()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)

  const next = params.get('next')
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'

  if (isPending) return <Splash />
  if (session) return <Navigate to={target} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Kullanıcı adını ve şifreni yaz.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const s = await Api.login(username, password)
      setPassword('')
      queryClient.setQueryData(['session'], s)
      navigate(target, { replace: true })
    } catch (err) {
      setPassword('')
      setError(err instanceof ApiError ? err.message : 'Giriş yapılamadı.')
      passwordRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-cream md:grid md:grid-cols-[1.05fr_1fr]">
      <section className="paper-grain relative hidden overflow-hidden bg-[#f4e9e2] md:flex md:flex-col md:justify-between md:p-12">
        <Wordmark />
        <BotanicalLines className="mx-auto h-[56vh] max-h-[520px] w-auto" />
        <p className="max-w-sm font-display text-2xl italic leading-snug text-ink-soft">
          Her buket bir tasarım, her tasarım ikimize ait bir anı.
        </p>
      </section>

      <section className="flex min-h-dvh flex-col justify-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 md:hidden">
            <LogoMark className="mb-5 size-12" />
          </div>
          <h1 className="font-display text-[2.4rem] leading-[1.08] tracking-[-0.02em] text-ink">Bahçemize hoş geldin.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Buketlerimiz, notlarımız ve birlikte biriktirdiklerimiz burada duruyor.
          </p>

          <form onSubmit={submit} className="mt-9 space-y-5" noValidate>
            <Field label="Kullanıcı adı" htmlFor="username">
              <TextInput
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                enterKeyHint="next"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && username.trim()) {
                    e.preventDefault()
                    passwordRef.current?.focus()
                  }
                }}
                invalid={!!error}
              />
            </Field>
            <Field label="Şifre" htmlFor="password">
              <PasswordInput
                ref={passwordRef}
                id="password"
                name="password"
                autoComplete="current-password"
                enterKeyHint="go"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                invalid={!!error}
              />
            </Field>

            {error && (
              <p className="rounded-2xl bg-blush-50 px-4 py-3 text-sm text-blush-700" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" block loading={loading} className="mt-2">
              Giriş yap
              {!loading && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <p className="mt-10 text-center text-sm text-muted">Bu bahçe yalnızca Emre ile Gözde için.</p>
        </div>
      </section>
    </div>
  )
}
