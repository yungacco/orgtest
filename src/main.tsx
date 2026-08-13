import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { SetupPage } from './features/auth/SetupPage'
import { AuthProvider } from './providers/AuthProvider'
import { AspettoProvider } from './providers/AspettoProvider'
import { ToastProvider } from './components/ui/Toast'
import { persister, queryClient } from './lib/queryClient'
import { isSupabaseConfigured } from './lib/supabase'
import './index.css'

// Service worker: l'app resta apribile anche senza connessione e si aggiorna
// da sola quando pubblichi una nuova versione.
registerSW({ immediate: true })

const radice = createRoot(document.getElementById('root')!)

radice.render(
  <StrictMode>
    {isSupabaseConfigured ? (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24 * 7,
          buster: 'v1',
        }}
      >
        <AuthProvider>
          <AspettoProvider>
            <ToastProvider>
              <HashRouter>
                <App />
              </HashRouter>
            </ToastProvider>
          </AspettoProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    ) : (
      <SetupPage />
    )}
  </StrictMode>,
)
