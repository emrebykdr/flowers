import { CircleCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Sheet } from '../../components/feedback'
import { Button, Field, TextArea, TextInput } from '../../components/ui'
import { formatDate, todayISO } from '../../lib/format'
import { useStudio } from './store'

export function SaveSheet({
  open,
  onClose,
  onSave,
  saving,
  savedId,
  error,
}: {
  open: boolean
  onClose: () => void
  onSave: () => void
  saving: boolean
  savedId: string | null
  error: string | null
}) {
  const { name, note, memoryDate, setMeta, bouquetId } = useStudio()
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (open) setTouched(false)
  }, [open])
  const nameError = touched && !name.trim() ? 'Buketine bir isim ver.' : undefined

  if (savedId) {
    return (
      <Sheet open={open} onClose={onClose} title="Kaydedildi">
        <div className="flex flex-col items-center py-4 text-center">
          <CircleCheck className="size-12 text-sage-600" strokeWidth={1.5} />
          <p className="mt-4 font-display text-2xl text-ink">{name}</p>
          <p className="mt-1 text-muted">{formatDate(memoryDate)}</p>
          <p className="mt-4 max-w-xs text-[15px] text-ink-soft">Anılarınıza eklendi; ikiniz de görebilirsiniz.</p>
          <div className="mt-7 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="soft" onClick={onClose}>
              Tasarıma dön
            </Button>
            <Link to={`/bouquets/${savedId}`}>
              <Button block>Buketi görüntüle</Button>
            </Link>
          </div>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={bouquetId ? 'Değişiklikleri kaydet' : 'Buketi kaydet'}
      description="İsmi, tarihi ve notuyla bir anı olarak saklanır."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="soft" onClick={onClose} disabled={saving}>
            Vazgeç
          </Button>
          <Button
            loading={saving}
            onClick={() => {
              setTouched(true)
              if (name.trim()) onSave()
            }}
          >
            {saving ? 'Kaydediliyor' : 'Kaydet'}
          </Button>
        </div>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          setTouched(true)
          if (name.trim()) onSave()
        }}
      >
        <Field label="Buketin adı" htmlFor="b-name" error={nameError}>
          <TextInput
            id="b-name"
            data-autofocus
            value={name}
            maxLength={80}
            placeholder="İlk Baharım"
            onChange={(e) => setMeta({ name: e.target.value })}
            invalid={!!nameError}
            enterKeyHint="done"
          />
        </Field>
        <Field label="Tarih" htmlFor="b-date" hint="Bugün ya da hatırlamak istediğin gün.">
          <TextInput
            id="b-date"
            type="date"
            value={memoryDate}
            onChange={(e) => setMeta({ memoryDate: e.target.value || todayISO() })}
          />
        </Field>
        <Field label="Not" htmlFor="b-note" aside={<span className="text-xs text-muted tabular-nums">{note.length}/600</span>}>
          <TextArea
            id="b-note"
            value={note}
            maxLength={600}
            rows={3}
            placeholder="Sana aldığım ilk çiçekleri unutmadım."
            onChange={(e) => setMeta({ note: e.target.value })}
          />
        </Field>
        {error && (
          <p className="rounded-2xl bg-blush-50 px-4 py-3 text-sm text-blush-700" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}
