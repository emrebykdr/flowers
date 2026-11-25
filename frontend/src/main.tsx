import '@fontsource-variable/fraunces'
import '@fontsource-variable/manrope'
import './styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Link, RouterProvider } from 'react-router'
import { RequireAuth } from './app/session'
import { FeedbackProvider } from './components/feedback'
import { Button } from './components/ui'
import LoginPage from './features/auth/LoginPage'
import MyBouquetsPage from './features/bouquets/MyBouquetsPage'
import HomePage from './features/home/HomePage'
import MemoriesPage from './features/memories/MemoriesPage'
import MessagesPage from './features/messages/MessagesPage'
import SettingsPage from './features/settings/SettingsPage'
import { ApiError, onUnauthorized } from './lib/api'

// 3D kullanan sayfalar ayrı parçada; giriş ve ana sayfa hızlı açılır.
const StudioPage = lazy(() => import('./features/studio/StudioPage'))
const BouquetDetailPage = lazy(() => import('./features/bouquets/BouquetDetailPage'))
// Yalnızca geliştirmede: 3D modelleri hızlıca görmek için /lab
const LabPage = import.meta.env.DEV ? lazy(() => import('./dev/LabPage')) : null

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
  },
})

onUnauthorized(() => {
  queryClient.setQueryData(['session'], null)
})

function NotFound() {
  return (
    <div className="flex h-[70dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-3xl">Bu sayfa bahçede yok.</p>
      <Link to="/">
        <Button variant="secondary">Ana sayfaya dön</Button>
      </Link>
    </div>
  )
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  ...(LabPage ? [{ path: '/lab', element: <LabPage /> }] : []),
  {
    element: <RequireAuth />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'studio/:id?', element: <StudioPage /> },
      { path: 'bouquets', element: <MyBouquetsPage /> },
      { path: 'bouquets/:id', element: <BouquetDetailPage /> },
      { path: 'memories', element: <MemoriesPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>
        <RouterProvider router={router} />
      </FeedbackProvider>
    </QueryClientProvider>
  </StrictMode>,
)
