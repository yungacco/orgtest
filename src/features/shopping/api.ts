import { supabase, unwrap } from '@/lib/supabase'
import type { ShoppingItem, UUID } from '@/types'

export type VoceSpesaInput = {
  name: string
  quantity: number | null
  unit: string | null
  manual: boolean
  sort_order: number
}

export async function listaSpesa(): Promise<ShoppingItem[]> {
  return unwrap(
    await supabase
      .from('shopping_items')
      .select('*')
      .order('checked')
      .order('sort_order'),
  ) as ShoppingItem[]
}

export async function aggiungiVoci(voci: VoceSpesaInput[]): Promise<ShoppingItem[]> {
  if (voci.length === 0) return []
  return unwrap(
    await supabase.from('shopping_items').insert(voci).select('*'),
  ) as ShoppingItem[]
}

/**
 * Applica in un colpo solo l'unione calcolata da `unisciNellaLista`:
 * prima somma le quantita' delle voci gia' presenti, poi inserisce le nuove.
 */
export async function unisciVoci(unione: {
  daInserire: VoceSpesaInput[]
  daAggiornare: { id: UUID; quantity: number | null }[]
}): Promise<{ inserite: ShoppingItem[]; aggiornate: ShoppingItem[] }> {
  const aggiornate = await Promise.all(
    unione.daAggiornare.map((voce) => aggiornaVoce(voce.id, { quantity: voce.quantity })),
  )
  const inserite = await aggiungiVoci(unione.daInserire)
  return { inserite, aggiornate }
}

export async function aggiornaVoce(
  id: UUID,
  patch: Partial<Pick<ShoppingItem, 'name' | 'quantity' | 'unit' | 'checked'>>,
): Promise<ShoppingItem> {
  return unwrap(
    await supabase.from('shopping_items').update(patch).eq('id', id).select('*').single(),
  ) as ShoppingItem
}

export async function eliminaVoce(id: UUID): Promise<void> {
  const { error } = await supabase.from('shopping_items').delete().eq('id', id)
  if (error) throw error
}

/** Cancella le voci arrivate dal piano pasti, lasciando quelle scritte a mano. */
export async function eliminaGenerate(): Promise<void> {
  const { error } = await supabase.from('shopping_items').delete().eq('manual', false)
  if (error) throw error
}

export async function eliminaSpuntate(): Promise<void> {
  const { error } = await supabase.from('shopping_items').delete().eq('checked', true)
  if (error) throw error
}
