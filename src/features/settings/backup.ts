import { supabase, unwrap } from '@/lib/supabase'
import { PHOTO_BUCKET } from '@/lib/supabase'
import { toISO } from '@/lib/format'
import type { BackupFile } from '@/types'

/** Tabelle nell'ordine giusto per l'importazione (prima i "genitori"). */
const TABELLE = [
  'recipe_tags',
  'recipes',
  'meal_plan_entries',
  'shopping_items',
  'task_categories',
  'tasks',
  'weight_entries',
  'workouts',
  'journal_entries',
  'habits',
  'habit_logs',
] as const

type Tabella = (typeof TABELLE)[number]

/** Scarica tutti i dati dell'utente in un unico file JSON. */
export async function esportaDati(): Promise<BackupFile> {
  const [profilo, ...tabelle] = await Promise.all([
    supabase.from('profiles').select('*').maybeSingle(),
    ...TABELLE.map((t) => supabase.from(t).select('*')),
  ])

  const dati = Object.fromEntries(
    TABELLE.map((nome, indice) => [nome, unwrap(tabelle[indice]) ?? []]),
  ) as unknown as BackupFile['data']

  return {
    app: 'benessere',
    version: 1,
    exported_at: new Date().toISOString(),
    data: {
      ...dati,
      profile: (profilo.data as BackupFile['data']['profile']) ?? null,
    },
  }
}

export function scaricaBackup(backup: BackupFile) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `benessere-backup-${toISO(new Date())}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export interface EsitoImportazione {
  righeImportate: number
  tabelleSaltate: string[]
}

/**
 * Reimporta un backup.
 *
 * Le righe vengono riscritte con l'utente attualmente collegato (il campo
 * user_id del file viene ignorato), cosi' il backup si puo' ripristinare
 * anche su un account nuovo. Le righe con lo stesso identificativo vengono
 * sovrascritte.
 */
export async function importaDati(file: File): Promise<EsitoImportazione> {
  const testo = await file.text()
  let backup: BackupFile
  try {
    backup = JSON.parse(testo) as BackupFile
  } catch {
    throw new Error('Il file non è un backup valido (non è un JSON leggibile).')
  }
  if (backup.app !== 'benessere' || !backup.data) {
    throw new Error('Questo file non è un backup di Benessere.')
  }

  const { data: sessione } = await supabase.auth.getUser()
  const userId = sessione.user?.id
  if (!userId) throw new Error('Sessione scaduta: accedi di nuovo.')

  let righeImportate = 0
  const tabelleSaltate: string[] = []

  for (const tabella of TABELLE) {
    const righe = (backup.data[tabella as Tabella] ?? []) as unknown as Record<string, unknown>[]
    if (!Array.isArray(righe) || righe.length === 0) continue

    const preparate = righe.map((riga) => ({ ...riga, user_id: userId }))
    // a blocchi: certi backup possono avere migliaia di righe
    for (let i = 0; i < preparate.length; i += 200) {
      const blocco = preparate.slice(i, i + 200)
      const { error } = await supabase.from(tabella).upsert(blocco, { onConflict: 'id' })
      if (error) {
        tabelleSaltate.push(tabella)
        break
      }
      righeImportate += blocco.length
    }
  }

  if (backup.data.profile) {
    const { user_id: _ignorato, ...profilo } = backup.data.profile
    await supabase.from('profiles').update(profilo).eq('user_id', userId)
  }

  return { righeImportate, tabelleSaltate }
}

/** Cancella tutti i contenuti (non l'account) comprese le foto caricate. */
export async function eliminaTuttiIDati(userId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_all_my_data')
  if (error) throw error

  // le foto non sono nel database: vanno tolte dallo storage
  const { data: file } = await supabase.storage.from(PHOTO_BUCKET).list(userId, {
    limit: 1000,
  })
  if (file && file.length > 0) {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove(file.map((f) => `${userId}/${f.name}`))
  }
}
