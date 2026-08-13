import { supabase, unwrap } from '@/lib/supabase'
import type { UUID, Workout, WorkoutInput } from '@/types'

/**
 * Tutti gli allenamenti, dal piu' recente. Sono poche righe alla settimana:
 * li carichiamo insieme e facciamo i conti nel browser, cosi' filtri e
 * statistiche rispondono all'istante.
 */
export async function listaAllenamenti(): Promise<Workout[]> {
  return unwrap(
    await supabase.from('workouts').select('*').order('date', { ascending: false }),
  ) as Workout[]
}

export async function creaAllenamento(
  userId: string,
  input: WorkoutInput,
): Promise<Workout> {
  return unwrap(
    await supabase
      .from('workouts')
      .insert({ ...input, user_id: userId })
      .select('*')
      .single(),
  ) as Workout
}

export async function modificaAllenamento(
  id: UUID,
  patch: Partial<WorkoutInput>,
): Promise<Workout> {
  return unwrap(
    await supabase.from('workouts').update(patch).eq('id', id).select('*').single(),
  ) as Workout
}

export async function eliminaAllenamento(id: UUID): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('id', id)
  if (error) throw error
}
