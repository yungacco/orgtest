import { useMemo } from 'react'
import { usePesi } from '@/features/weight/hooks'
import { useAllenamenti } from '@/features/workouts/hooks'
import { useTaskArchiviate } from '@/features/tasks/hooks'
import { useAbitudini, useDiario } from '@/features/journal/hooks'
import { usePiano } from '@/features/mealplan/hooks'
import { sommaGiorni } from '@/lib/format'
import type { ISODate } from '@/types'
import {
  confronta,
  fraseDiSintesi,
  giornoPerGiorno,
  riepilogoSettimana,
  type DatiSettimana,
} from './statistiche'

/**
 * Tutto quello che serve al riepilogo di una settimana.
 *
 * Non c'e' nessuna tabella nuova: i dati sono gli stessi che alimentano le
 * altre pagine, quindi arrivano dalla cache gia' pronta (e funzionano anche
 * senza connessione). L'unica cosa che si chiede al server e' il piano
 * pasti delle due settimane, perche' quello si legge per intervallo.
 */
export function useRiepilogoSettimana(inizio: ISODate) {
  const precedente = sommaGiorni(inizio, -7)

  const { pesi, caricamento: cPesi } = usePesi()
  const { allenamenti, caricamento: cAllenamenti } = useAllenamenti()
  const { task: taskArchiviate, caricamento: cTask } = useTaskArchiviate()
  const { abitudini, log: logAbitudini, caricamento: cAbitudini } = useAbitudini()
  const { note, caricamento: cDiario } = useDiario()
  const { voci: pasti, caricamento: cPasti } = usePiano(precedente, sommaGiorni(inizio, 6))

  const dati: DatiSettimana = useMemo(
    () => ({ pesi, allenamenti, taskArchiviate, abitudini, logAbitudini, note, pasti }),
    [pesi, allenamenti, taskArchiviate, abitudini, logAbitudini, note, pasti],
  )

  const questa = useMemo(() => riepilogoSettimana(dati, inizio), [dati, inizio])
  const scorsa = useMemo(() => riepilogoSettimana(dati, precedente), [dati, precedente])
  const giorni = useMemo(() => giornoPerGiorno(dati, inizio), [dati, inizio])

  return {
    settimana: questa,
    scorsa,
    giorni,
    confronti: useMemo(() => confronta(questa, scorsa), [questa, scorsa]),
    frase: useMemo(() => fraseDiSintesi(questa, scorsa), [questa, scorsa]),
    caricamento: cPesi || cAllenamenti || cTask || cAbitudini || cDiario || cPasti,
  }
}
