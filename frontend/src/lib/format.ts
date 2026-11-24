const longDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
const shortDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' })
const shortDateYear = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
const monthYear = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' })
const time = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' })
const weekdayDate = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })

/** "2026-11-24" → yerel gece yarısı (saat dilimi kayması olmadan). */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function toDateOnly(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const todayISO = () => toDateOnly(new Date())

export const formatDate = (value: string) => longDate.format(parseDateOnly(value))
export const formatMonth = (value: string) => monthYear.format(parseDateOnly(value))
export const formatToday = () => weekdayDate.format(new Date())

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Mesaj zamanı: "Bugün 21:40", "Dün 09:12", "12 Kas 18:03". */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(d, now)) return `Bugün ${time.format(d)}`
  if (sameDay(d, yesterday)) return `Dün ${time.format(d)}`
  const fmt = d.getFullYear() === now.getFullYear() ? shortDate : shortDateYear
  return `${fmt.format(d)} ${time.format(d)}`
}

export function formatTime(iso: string) {
  return time.format(new Date(iso))
}

/** İki takvim günü arasındaki tam gün sayısı. */
export function daysSince(fromISO: string, to = new Date()): number {
  const a = parseDateOnly(fromISO)
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const ub = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.floor((ub - ua) / 86_400_000)
}

export function durationParts(fromISO: string, to = new Date()) {
  const a = parseDateOnly(fromISO)
  let years = to.getFullYear() - a.getFullYear()
  let months = to.getMonth() - a.getMonth()
  let days = to.getDate() - a.getDate()
  if (days < 0) {
    months -= 1
    days += new Date(to.getFullYear(), to.getMonth(), 0).getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) }
}

export function describeDuration(fromISO: string): string {
  const { years, months, days } = durationParts(fromISO)
  const parts: string[] = []
  if (years) parts.push(`${years} yıl`)
  if (months) parts.push(`${months} ay`)
  if (days || parts.length === 0) parts.push(`${days} gün`)
  return parts.join(', ')
}

export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h >= 5 && h < 11) return 'Günaydın'
  if (h >= 11 && h < 17) return 'İyi günler'
  if (h >= 17 && h < 22) return 'İyi akşamlar'
  return 'İyi geceler'
}

// ---------------------------------------------------------------------------
// Türkçe ek: "Gözde'nin", "Emre'ye", "Gözde'den"
// ---------------------------------------------------------------------------

const FRONT = 'eiöü'
const BACK = 'aıou'
const ROUND = 'oöuü'
const VOICELESS = 'çfhkpsşt'

function lastVowel(word: string): string {
  const w = word.toLocaleLowerCase('tr-TR')
  for (let i = w.length - 1; i >= 0; i--) if (FRONT.includes(w[i]) || BACK.includes(w[i])) return w[i]
  return 'e'
}

export function withSuffix(name: string, kind: 'gen' | 'dat' | 'abl'): string {
  const w = name.trim()
  if (!w) return w
  const lower = w.toLocaleLowerCase('tr-TR')
  const last = lower[lower.length - 1]
  const endsVowel = FRONT.includes(last) || BACK.includes(last)
  const v = lastVowel(w)
  const front = FRONT.includes(v)
  const round = ROUND.includes(v)
  if (kind === 'gen') {
    const vowel = front ? (round ? 'ü' : 'i') : round ? 'u' : 'ı'
    return `${w}'${endsVowel ? 'n' : ''}${vowel}n`
  }
  if (kind === 'dat') {
    const vowel = front ? 'e' : 'a'
    return `${w}'${endsVowel ? 'y' : ''}${vowel}`
  }
  const vowel = front ? 'e' : 'a'
  const d = !endsVowel && VOICELESS.includes(last) ? 't' : 'd'
  return `${w}'${d}${vowel}n`
}
