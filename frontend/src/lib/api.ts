import type {
  BouquetDesign,
  BouquetDetail,
  BouquetSummary,
  HomeData,
  MemoryItem,
  MessageItem,
  Session,
  SpaceInfo,
  UserInfo,
} from '../domain/types'

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.errors = errors
  }

  field(name: string): string | undefined {
    return this.errors?.[name]?.[0]
  }
}

let unauthorizedHandler: (() => void) | null = null

/** Oturum düşünce (ör. başka cihazda şifre değişti) çağrılır. */
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}

function defaultMessage(status: number) {
  if (status === 403) return 'Bu işlem için iznin yok.'
  if (status === 404) return 'Aradığın şey bulunamadı.'
  if (status === 413) return 'Dosya çok büyük.'
  if (status === 429) return 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.'
  if (status >= 500) return 'Sunucuda bir sorun oldu. Birazdan tekrar dene.'
  return 'Bir şeyler ters gitti.'
}

interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // Özel başlık: sunucu, durum değiştiren isteklerde bunu bekler (CSRF koruması).
  const headers: Record<string, string> = { 'X-OurBloom': '1', Accept: 'application/json' }
  let body: BodyInit | undefined
  if (options.body instanceof Blob) {
    headers['Content-Type'] = options.body.type || 'application/octet-stream'
    body = options.body
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  let res: Response
  try {
    res = await fetch(path, {
      method: options.method ?? 'GET',
      headers,
      body,
      credentials: 'same-origin',
      signal: options.signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new ApiError(0, 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.')
  }

  if (res.status === 401 && !path.startsWith('/api/auth/login')) {
    unauthorizedHandler?.()
    throw new ApiError(401, 'Oturumun kapanmış, tekrar giriş yap.')
  }

  if (!res.ok) {
    let data: { title?: string; errors?: Record<string, string[]> } | null = null
    try {
      data = await res.json()
    } catch {
      // gövde yok
    }
    const firstFieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
    const message = res.status === 400 && firstFieldError ? firstFieldError : (data?.title ?? defaultMessage(res.status))
    throw new ApiError(res.status, message, data?.errors)
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

const qs = (params: Record<string, string | undefined>) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v)
  const s = p.toString()
  return s ? `?${s}` : ''
}

export interface SaveBouquetBody {
  name: string
  note: string
  memoryDate: string
  design: BouquetDesign
}

export interface SaveMemoryBody {
  title: string
  body: string
  date: string
  bouquetId: string | null
}

export const Api = {
  me: () => api<Session>('/api/auth/me'),
  login: (username: string, password: string) =>
    api<Session>('/api/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => api<void>('/api/auth/logout', { method: 'POST' }),
  changePassword: (body: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api<void>('/api/account/password', { method: 'POST', body }),
  updateProfile: (displayName: string) => api<UserInfo>('/api/account/profile', { method: 'PUT', body: { displayName } }),
  updateSpace: (body: { name: string; togetherSince: string | null }) =>
    api<SpaceInfo>('/api/space', { method: 'PUT', body }),

  home: () => api<HomeData>('/api/home'),

  bouquets: (params: { owner?: 'me' | 'partner' | 'all'; q?: string; sort?: 'newest' | 'oldest' | 'updated' } = {}) =>
    api<BouquetSummary[]>(`/api/bouquets${qs({ owner: params.owner, q: params.q, sort: params.sort })}`),
  bouquet: (id: string) => api<BouquetDetail>(`/api/bouquets/${id}`),
  createBouquet: (body: SaveBouquetBody) => api<{ id: string }>('/api/bouquets', { method: 'POST', body }),
  updateBouquet: (id: string, body: SaveBouquetBody) => api<{ id: string }>(`/api/bouquets/${id}`, { method: 'PUT', body }),
  deleteBouquet: (id: string) => api<void>(`/api/bouquets/${id}`, { method: 'DELETE' }),
  duplicateBouquet: (id: string) => api<{ id: string }>(`/api/bouquets/${id}/duplicate`, { method: 'POST' }),
  uploadPreview: (id: string, image: Blob) =>
    api<{ previewUrl: string }>(`/api/bouquets/${id}/preview`, { method: 'PUT', body: image }),

  memories: (params: { q?: string; sort?: 'newest' | 'oldest' } = {}) =>
    api<MemoryItem[]>(`/api/memories${qs({ q: params.q, sort: params.sort })}`),
  createMemory: (body: SaveMemoryBody) => api<{ id: string }>('/api/memories', { method: 'POST', body }),
  updateMemory: (id: string, body: SaveMemoryBody) => api<{ id: string }>(`/api/memories/${id}`, { method: 'PUT', body }),
  deleteMemory: (id: string) => api<void>(`/api/memories/${id}`, { method: 'DELETE' }),
  uploadMemoryPhoto: (id: string, image: Blob) =>
    api<{ photoUrl: string }>(`/api/memories/${id}/photo`, { method: 'PUT', body: image }),
  deleteMemoryPhoto: (id: string) => api<void>(`/api/memories/${id}/photo`, { method: 'DELETE' }),

  messages: (before?: string) =>
    api<{ items: MessageItem[]; hasMore: boolean }>(`/api/messages${qs({ before, limit: '30' })}`),
  sendMessage: (body: string) => api<MessageItem>('/api/messages', { method: 'POST', body: { body } }),
  markMessagesRead: () => api<{ updated: number }>('/api/messages/read', { method: 'POST' }),
  unreadCount: () => api<{ count: number }>('/api/messages/unread-count'),
  deleteMessage: (id: string) => api<void>(`/api/messages/${id}`, { method: 'DELETE' }),
}
