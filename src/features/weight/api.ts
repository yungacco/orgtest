import { supabase, unwrap } from '@/lib/supabase'
import type { UUID, WeightEntry, WeightEntryInput } from '@/types'

/**
 * Tutte le misurazioni dell'utente, dalla piu' vecchia alla piu' recente.
 * Sono poche centinaia di righe anche dopo anni d'uso: le carichiamo tutte
 * una volta sola e filtriamo i periodi lato client (grafico immediato).
 */
export async function listaPesi(): Promise<WeightEntry[]> {
  return unwrap(
    await supabase
      .from('weight_entries')
      .select('*')
      .order('date', { ascending: true }),
  ) as WeightEntry[]
}

/**
 * Inserisce la misurazione; se quel giorno esiste gia', la sostituisce.
 * L'identificativo dell'utente viene scritto esplicitamente: serve alla
 * regola "una sola misurazione per giorno" (user_id + data).
 */
export async function salvaPeso(
  userId: string,
  input: WeightEntryInput,
): Promise<WeightEntry> {
  return unwrap(
    await supabase
      .from('weight_entries')
      .upsert({ ...input, user_id: userId }, { onConflict: 'user_id,date' })
      .select('*')
      .single(),
  ) as WeightEntry
}

export async function aggiornaPeso(
  id: UUID,
  patch: Partial<WeightEntryInput>,
): Promise<WeightEntry> {
  return unwrap(
    await supabase.from('weight_entries').update(patch).eq('id', id).select('*').single(),
  ) as WeightEntry
}

export async function eliminaPeso(id: UUID): Promise<void> {
  const { error } = await supabase.from('weight_entries').delete().eq('id', id)
  if (error) throw error
}
