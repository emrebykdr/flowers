import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import {
  forwardRef,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '../lib/image'

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-cream hover:bg-ink/90 shadow-[0_8px_20px_-10px_rgb(45_41_38/0.6)]',
  secondary: 'bg-paper text-ink border border-line hover:border-ink/25',
  soft: 'bg-ivory text-ink hover:bg-sand/70',
  ghost: 'bg-transparent text-ink hover:bg-ivory',
  danger: 'bg-paper text-blush-700 border border-blush-200 hover:bg-blush-50',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-13 px-6 text-base gap-2',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-full font-semibold tracking-[-0.01em] transition duration-200 ease-out active:scale-[0.98] disabled:opacity-55 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
})

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: 'ghost' | 'soft' | 'paper' | 'glass'
  size?: 'sm' | 'md'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full text-ink transition duration-200 active:scale-95 disabled:opacity-40',
        size === 'md' ? 'size-11' : 'size-9',
        variant === 'ghost' && 'hover:bg-ivory',
        variant === 'soft' && 'bg-ivory hover:bg-sand/70',
        variant === 'paper' && 'border border-line bg-paper shadow-soft hover:border-ink/20',
        variant === 'glass' && 'bg-paper/80 shadow-soft backdrop-blur-md hover:bg-paper',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  aside,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  htmlFor?: string
  aside?: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-ink-soft">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p className="text-sm text-blush-700" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

const inputBase =
  'w-full rounded-2xl border bg-paper px-4 text-base text-ink placeholder:text-muted/80 transition focus:outline-none focus:ring-4'

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function TextInput({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          inputBase,
          'h-12',
          invalid ? 'border-blush-300 focus:ring-blush-100' : 'border-line focus:border-ink/30 focus:ring-blush-100/70',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...rest}
      />
    )
  },
)

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function TextArea({ className, invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          inputBase,
          'min-h-28 resize-none py-3 leading-relaxed',
          invalid ? 'border-blush-300 focus:ring-blush-100' : 'border-line focus:border-ink/30 focus:ring-blush-100/70',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...rest}
      />
    )
  },
)

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function PasswordInput({ className, invalid, ...rest }, ref) {
    const [visible, setVisible] = useState(false)
    return (
      <div className="relative">
        <TextInput
          ref={ref}
          type={visible ? 'text' : 'password'}
          invalid={invalid}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={cn('pr-13', className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-1 my-auto inline-flex size-11 items-center justify-center rounded-full text-muted transition hover:text-ink"
          aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
    )
  },
)

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
  label,
}: {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className={cn('inline-flex rounded-full bg-ivory p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-full font-semibold transition duration-200',
              size === 'md' ? 'h-9 px-4 text-sm' : 'h-8 px-3 text-[13px]',
              active ? 'bg-paper text-ink shadow-soft' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
  onChangeStart,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (v: number) => void
  onChangeStart?: () => void
}) {
  const id = useId()
  const fill = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-semibold text-ink-soft">
          {label}
        </label>
        <span className="text-sm tabular-nums text-muted">{format ? format(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ['--fill' as string]: `${fill}%` }}
        onPointerDown={onChangeStart}
        onKeyDown={(e) => {
          if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End' || e.key.startsWith('Page')) onChangeStart?.()
        }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

const AVATAR_TONES = ['bg-sage-200 text-sage-800', 'bg-blush-200 text-blush-700']

export function Avatar({ name, index = 0, size = 'md' }: { name: string; index?: number; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-display font-medium',
        AVATAR_TONES[index % 2],
        size === 'sm' && 'size-7 text-xs',
        size === 'md' && 'size-9 text-sm',
        size === 'lg' && 'size-12 text-lg',
      )}
    >
      {name.trim().charAt(0).toLocaleUpperCase('tr-TR')}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-ivory', className)} />
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn('size-5 animate-spin text-muted', className)} aria-label="Yükleniyor" />
}

export function Card({ className, children, as: As = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article' }) {
  return <As className={cn('rounded-[var(--radius-card)] border border-line/70 bg-paper shadow-soft', className)}>{children}</As>
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 text-blush-500">{icon}</div>}
      <h3 className="font-display text-xl text-ink">{title}</h3>
      {text && <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4 md:mb-8">
      <div className="min-w-0">
        <h1 className="font-display text-[2rem] leading-tight tracking-[-0.02em] text-ink md:text-[2.6rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
