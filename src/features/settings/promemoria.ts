import { useEffect } from 'react'
import { queryClient, qk } from '@/lib/queryClient'
import { oggiISO } from '@/lib/format'
import { useAuth } from '@/providers/AuthProvider'
import { useProfilo } from './hooks'
import type { HabitLog, JournalEntry, Reminders, WeightEntry } from '@/types'

const CHIAVE_ULTIMO_AVVISO = 'benessere:ultimo-promemoria'

export type TipoPromemoria = keyof Reminders

const TESTI: Record<TipoPromemoria, { titolo: string; corpo: string }> = {
  weight: {
    titolo: 'Peso di oggi',
    corpo: 'Non hai ancora registrato il peso di oggi.',
  },
  journal: {
    titolo: 'Diario',
    corpo: 'Come è andata oggi? Scrivi due righe nel diario.',
  },
  habits: {
    titolo: 'Abitudini',
    corpo: 'Hai ancora abitudini da spuntare per oggi.',
  },
}

export function notificheSupportate(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function permessoNotifiche(): NotificationPermission | 'non-supportate' {
  return notificheSupportate() ? Notification.permission : 'non-supportate'
}

export async function richiediPermessoNotifiche(): Promise<NotificationPermission> {
  if (!notificheSupportate()) return 'denied'
  return Notification.requestPermission()
}

function leggiUltimiAvvisi(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(CHIAVE_ULTIMO_AVVISO) ?? '{}')
  } catch {
    return {}
  }
}

function segnaAvviso(chiave: string, giorno: string) {
  const attuali = leggiUltimiAvvisi()
  attuali[chiave] = giorno
  try {
    window.localStorage.setItem(CHIAVE_ULTIMO_AVVISO, JSON.stringify(attuali))
  } catch {
    /* niente da fare */
  }
}

/** true se per oggi quella cosa e' gia' stata fatta (guardando la cache). */
function giaFatto(tipo: TipoPromemoria, userId: string): boolean {
  const oggi = oggiISO()
  if (tipo === 'weight') {
    const pesi = queryClient.getQueryData<WeightEntry[]>(qk.pesi(userId))
    return Boolean(pesi?.some((p) => p.date === oggi))
  }
  if (tipo === 'journal') {
    const note = queryClient.getQueryData<JournalEntry[]>(qk.diario(userId))
    return Boolean(
      note?.some((n) => n.date === oggi && (n.content.trim() !== '' || n.mood !== null)),
    )
  }
  const abitudini = queryClient.getQueryData<{ id: string }[]>(qk.abitudini(userId)) ?? []
  if (abitudini.length === 0) return true
  const log = queryClient.getQueryData<HabitLog[]>(qk.logAbitudini(userId)) ?? []
  const fatteOggi = new Set(log.filter((l) => l.date === oggi).map((l) => l.habit_id))
  return abitudini.every((a) => fatteOggi.has(a.id))
}

/**
 * Promemoria locali.
 *
 * Sono notifiche del browser mostrate mentre l'app e' aperta (anche solo in
 * una scheda in secondo piano): non serve nessun server. Se chiudi del tutto
 * l'app il promemoria di quel giorno non parte — e' il limite delle
 * notifiche locali, spiegato anche nelle Impostazioni.
 */
export function usePromemoria() {
  const { profilo } = useProfilo()
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const promemoria = profilo.reminders

  useEffect(() => {
    if (!userId || !notificheSupportate() || Notification.permission !== 'granted') return

    const controlla = () => {
      const adesso = new Date()
      const oggi = oggiISO()
      const oraCorrente = `${String(adesso.getHours()).padStart(2, '0')}:${String(
        adesso.getMinutes(),
      ).padStart(2, '0')}`

      ;(Object.keys(TESTI) as TipoPromemoria[]).forEach((tipo) => {
        const impostazione = promemoria[tipo]
        if (!impostazione?.enabled) return
        if (oraCorrente < impostazione.time) return
        const chiave = `${userId}:${tipo}`
        if (leggiUltimiAvvisi()[chiave] === oggi) return
        if (giaFatto(tipo, userId)) return

        try {
          new Notification(TESTI[tipo].titolo, {
            body: TESTI[tipo].corpo,
            icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
            tag: `benessere-${tipo}`,
          })
          segnaAvviso(chiave, oggi)
        } catch {
          /* alcuni browser bloccano le notifiche create cosi': pazienza */
        }
      })
    }

    controlla()
    const timer = window.setInterval(controlla, 60_000)
    return () => window.clearInterval(timer)
  }, [userId, promemoria])
}
