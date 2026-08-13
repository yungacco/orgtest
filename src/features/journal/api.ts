import { supabase, unwrap } from '@/lib/supabase'
import { oggiISO, sommaGiorni } from '@/lib/format'
import type { Habit, HabitLog, ISODate, JournalEntry, Mood, UUID } from '@/types'

/* -------------------------------------------------------------------------- */
/* Diario                                                                     */
/* -------------------------------------------------------------------------- */

/** Ultimi due anni di note: bastano per calendario e rilettura. */
export async function listaDiario(): Promise<JournalEntry[]> {
  return unwrap(
    await supabase
      .from('journal_entries')
      .select('*')
      .gte('date', sommaGiorni(oggiISO(), -730))
      .order('date', { ascending: false }),
  ) as JournalEntry[]
}

export async function salvaNota(
  userId: string,
  data: ISODate,
  contenuto: string,
  umore: Mood | null,
): Promise<JournalEntry> {
  return unwrap(
    await supabase
      .from('journal_entries')
      .upsert(
        { user_id: userId, date: data, content: contenuto, mood: umore },
        { onConflict: 'user_id,date' },
      )
      .select('*')
      .single(),
  ) as JournalEntry
}

export async function eliminaNota(id: UUID): Promise<void> {
  const { error } = await supabase.from('journal_entries').delete().eq('id', id)
  if (error) throw error
}

/* -------------------------------------------------------------------------- */
/* Abitudini                                                                  */
/* -------------------------------------------------------------------------- */

export async function listaAbitudini(): Promise<Habit[]> {
  return unwrap(
    await supabase
      .from('habits')
      .select('*')
      .eq('archived', false)
      .order('sort_order'),
  ) as Habit[]
}

export async function creaAbitudine(
  nome: string,
  emoji: string,
  sortOrder: number,
): Promise<Habit> {
  return unwrap(
    await supabase
      .from('habits')
      .insert({ name: nome.trim(), emoji, sort_order: sortOrder })
      .select('*')
      .single(),
  ) as Habit
}

export async function modificaAbitudine(
  id: UUID,
  patch: Partial<Pick<Habit, 'name' | 'emoji' | 'archived' | 'sort_order'>>,
): Promise<Habit> {
  return unwrap(
    await supabase.from('habits').update(patch).eq('id', id).select('*').single(),
  ) as Habit
}

export async function eliminaAbitudine(id: UUID): Promise<void> {
  const { error } = await supabase.from('habits').delete().eq('id', id)
  if (error) throw error
}

/** Un anno di spunte: e' quello che serve alla heatmap e agli streak. */
export async function listaLogAbitudini(): Promise<HabitLog[]> {
  return unwrap(
    await supabase
      .from('habit_logs')
      .select('*')
      .gte('date', sommaGiorni(oggiISO(), -400))
      .order('date'),
  ) as HabitLog[]
}

export async function segnaAbitudine(
  userId: string,
  habitId: UUID,
  data: ISODate,
): Promise<HabitLog> {
  return unwrap(
    await supabase
      .from('habit_logs')
      .upsert(
        { user_id: userId, habit_id: habitId, date: data },
        { onConflict: 'user_id,habit_id,date' },
      )
      .select('*')
      .single(),
  ) as HabitLog
}

export async function togliAbitudine(habitId: UUID, data: ISODate): Promise<void> {
  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('habit_id', habitId)
    .eq('date', data)
  if (error) throw error
}
