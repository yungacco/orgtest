import { supabase, unwrap } from '@/lib/supabase'
import type { Profile, Reminders } from '@/types'

/** Valori usati finche' il profilo non e' stato caricato o personalizzato. */
export const PROMEMORIA_DEFAULT: Reminders = {
  weight: { enabled: false, time: '08:00' },
  journal: { enabled: false, time: '21:00' },
  habits: { enabled: false, time: '20:00' },
}

export function profiloVuoto(userId: string): Profile {
  return {
    user_id: userId,
    display_name: null,
    height_cm: null,
    weight_unit: 'kg',
    length_unit: 'cm',
    weight_goal_kg: null,
    calorie_goal: null,
    theme: 'system',
    accent: 'verde',
    reminders: PROMEMORIA_DEFAULT,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * Legge il profilo dell'utente; se non esiste ancora (per esempio perche'
 * l'account e' stato creato prima di installare lo schema) lo crea al volo.
 */
export async function caricaProfilo(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (data) {
    const row = data as Profile
    return { ...row, reminders: { ...PROMEMORIA_DEFAULT, ...(row.reminders ?? {}) } }
  }

  const creato = unwrap(
    await supabase
      .from('profiles')
      .insert({ user_id: userId })
      .select('*')
      .single(),
  ) as Profile
  return { ...creato, reminders: { ...PROMEMORIA_DEFAULT, ...(creato.reminders ?? {}) } }
}

export type ProfiloPatch = Partial<Omit<Profile, 'user_id' | 'created_at' | 'updated_at'>>

export async function salvaProfilo(userId: string, patch: ProfiloPatch): Promise<Profile> {
  return unwrap(
    await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('*')
      .single(),
  ) as Profile
}
