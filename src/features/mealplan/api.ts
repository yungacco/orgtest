import { supabase, unwrap } from '@/lib/supabase'
import type { ISODate, MealPlanEntry, MealSlot, UUID } from '@/types'

export interface SlotPiano {
  date: ISODate
  meal: MealSlot
  recipe_id: UUID
  pinned: boolean
}

export async function listaPiano(da: ISODate, a: ISODate): Promise<MealPlanEntry[]> {
  return unwrap(
    await supabase
      .from('meal_plan_entries')
      .select('*')
      .gte('date', da)
      .lte('date', a)
      .order('date'),
  ) as MealPlanEntry[]
}

/** Scrive (o sovrascrive) piu' caselle del piano in una sola richiesta. */
export async function salvaSlot(
  userId: string,
  slot: SlotPiano[],
): Promise<MealPlanEntry[]> {
  if (slot.length === 0) return []
  return unwrap(
    await supabase
      .from('meal_plan_entries')
      .upsert(
        slot.map((casella) => ({ ...casella, user_id: userId })),
        { onConflict: 'user_id,date,meal' },
      )
      .select('*'),
  ) as MealPlanEntry[]
}

export async function aggiornaSlot(
  id: UUID,
  patch: Partial<Pick<MealPlanEntry, 'recipe_id' | 'pinned'>>,
): Promise<MealPlanEntry> {
  return unwrap(
    await supabase.from('meal_plan_entries').update(patch).eq('id', id).select('*').single(),
  ) as MealPlanEntry
}

export async function eliminaSlot(id: UUID): Promise<void> {
  const { error } = await supabase.from('meal_plan_entries').delete().eq('id', id)
  if (error) throw error
}

/** Svuota un intervallo di giorni, lasciando in piedi i pasti bloccati. */
export async function svuotaPeriodo(
  da: ISODate,
  a: ISODate,
  tenerePinnati = true,
): Promise<void> {
  let query = supabase.from('meal_plan_entries').delete().gte('date', da).lte('date', a)
  if (tenerePinnati) query = query.eq('pinned', false)
  const { error } = await query
  if (error) throw error
}
