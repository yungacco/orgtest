import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Logo } from '@/components/layout/Logo'
import { Spinner } from '@/components/ui/Feedback'
import { LoginPage } from '@/features/auth/LoginPage'
import { NuovaPasswordPage } from '@/features/auth/NuovaPasswordPage'
import { useAuth } from '@/providers/AuthProvider'

const HomePage = lazy(() =>
  import('@/features/dashboard/HomePage').then((m) => ({ default: m.HomePage })),
)
const PesoPage = lazy(() =>
  import('@/features/weight/PesoPage').then((m) => ({ default: m.PesoPage })),
)
const AllenamentiPage = lazy(() =>
  import('@/features/workouts/AllenamentiPage').then((m) => ({
    default: m.AllenamentiPage,
  })),
)
const RicettePage = lazy(() =>
  import('@/features/recipes/RicettePage').then((m) => ({ default: m.RicettePage })),
)
const RicettaFormPage = lazy(() =>
  import('@/features/recipes/RicettaFormPage').then((m) => ({ default: m.RicettaFormPage })),
)
const RicettaDettaglioPage = lazy(() =>
  import('@/features/recipes/RicettaDettaglioPage').then((m) => ({
    default: m.RicettaDettaglioPage,
  })),
)

const PianoPage = lazy(() =>
  import('@/features/mealplan/PianoPage').then((m) => ({ default: m.PianoPage })),
)
const SpesaPage = lazy(() =>
  import('@/features/shopping/SpesaPage').then((m) => ({ default: m.SpesaPage })),
)

const TaskPage = lazy(() =>
  import('@/features/tasks/TaskPage').then((m) => ({ default: m.TaskPage })),
)
const ArchivioPage = lazy(() =>
  import('@/features/tasks/ArchivioPage').then((m) => ({ default: m.ArchivioPage })),
)

const DiarioPage = lazy(() =>
  import('@/features/journal/DiarioPage').then((m) => ({ default: m.DiarioPage })),
)

const ImpostazioniPage = lazy(() =>
  import('@/features/settings/ImpostazioniPage').then((m) => ({
    default: m.ImpostazioniPage,
  })),
)

/** Schermata mostrata mentre controlliamo se sei gia' collegato. */
function Avvio() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg">
      <Logo className="h-14 w-14 animate-pulse" />
      <Spinner />
      <span className="sr-only">Caricamento in corso</span>
    </div>
  )
}

export function App() {
  const { session, caricamento, recuperoPassword } = useAuth()

  if (caricamento) return <Avvio />
  if (recuperoPassword) return <NuovaPasswordPage />
  if (!session) return <LoginPage />

  return (
    <>
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-card focus:px-4 focus:py-2 focus:shadow-lift"
      >
        Salta al contenuto
      </a>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/peso" element={<PesoPage />} />
          <Route path="/allenamenti" element={<AllenamentiPage />} />
          <Route path="/ricette" element={<RicettePage />} />
          <Route path="/ricette/nuova" element={<RicettaFormPage />} />
          <Route path="/ricette/:id" element={<RicettaDettaglioPage />} />
          <Route path="/ricette/:id/modifica" element={<RicettaFormPage />} />
          <Route path="/piano" element={<PianoPage />} />
          <Route path="/spesa" element={<SpesaPage />} />
          <Route path="/task" element={<TaskPage />} />
          <Route path="/archivio" element={<ArchivioPage />} />
          <Route path="/diario" element={<DiarioPage />} />
          <Route path="/impostazioni" element={<ImpostazioniPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  )
}
