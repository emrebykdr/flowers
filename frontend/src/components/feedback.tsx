import { CircleCheck, Info, X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/image'
import { Button, IconButton } from './ui'

// ---------------------------------------------------------------------------
// Sheet: telefonda alttan açılan panel, masaüstünde ortada pencere
// ---------------------------------------------------------------------------

let openSheets = 0

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    openSheets++
    document.documentElement.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
        )
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panelRef.current
      target?.focus({ preventScroll: true })
    })
    return () => {
      document.removeEventListener('keydown', onKey)
      openSheets--
      if (openSheets <= 0) document.documentElement.style.overflow = ''
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 animate-fade bg-ink/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col bg-paper shadow-lift outline-none',
          'animate-sheet rounded-t-[1.75rem] md:animate-pop md:rounded-[1.75rem]',
          size === 'md' ? 'md:max-w-lg' : 'md:max-w-2xl',
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-sand md:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-4 md:pt-6">
          <div>
            <h2 id={titleId} className="font-display text-2xl leading-tight text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 text-[15px] text-muted">{description}</p>}
          </div>
          <IconButton label="Kapat" onClick={onClose} className="-mr-2 -mt-1">
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4 pt-2">{children}</div>
        {footer && (
          <div className="border-t border-line/70 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
        {!footer && <div className="pb-[env(safe-area-inset-bottom)]" />}
      </div>
    </div>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Bildirim ve onay
// ---------------------------------------------------------------------------

interface ToastItem {
  id: number
  message: string
  kind: 'success' | 'info' | 'error'
}

interface ConfirmOptions {
  title: string
  text?: string
  confirmLabel?: string
  danger?: boolean
}

interface FeedbackApi {
  toast: (message: string, kind?: ToastItem['kind']) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const FeedbackContext = createContext<FeedbackApi | null>(null)

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('FeedbackProvider eksik')
  return ctx
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const seq = useRef(0)

  const toast = useCallback((message: string, kind: ToastItem['kind'] = 'success') => {
    const id = ++seq.current
    setToasts((t) => [...t.slice(-2), { id, message, kind }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 5000 : 3200)
  }, [])

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setConfirmState({ ...options, resolve })),
    [],
  )

  const close = (value: boolean) => {
    confirmState?.resolve(value)
    setConfirmState(null)
  }

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:inset-x-auto md:bottom-6 md:right-6 md:top-auto md:items-end md:pt-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex max-w-sm animate-pop items-center gap-2.5 rounded-full py-2.5 pl-3.5 pr-5 text-[15px] shadow-lift',
              t.kind === 'error' ? 'bg-blush-700 text-paper' : 'bg-ink text-cream',
            )}
            role={t.kind === 'error' ? 'alert' : 'status'}
          >
            {t.kind === 'error' ? <Info className="size-4 shrink-0" /> : <CircleCheck className="size-4 shrink-0 text-sage-200" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      <Sheet
        open={!!confirmState}
        onClose={() => close(false)}
        title={confirmState?.title ?? ''}
        description={confirmState?.text}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="soft" onClick={() => close(false)}>
              Vazgeç
            </Button>
            <Button variant={confirmState?.danger ? 'danger' : 'primary'} onClick={() => close(true)} data-autofocus>
              {confirmState?.confirmLabel ?? 'Tamam'}
            </Button>
          </div>
        }
      >
        <span />
      </Sheet>
    </FeedbackContext.Provider>
  )
}
