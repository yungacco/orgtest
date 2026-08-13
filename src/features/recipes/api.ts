import { PHOTO_BUCKET, supabase, unwrap } from '@/lib/supabase'
import { comprimiImmagine } from '@/lib/image'
import type { Recipe, RecipeInput, RecipeTag, UUID } from '@/types'

/* -------------------------------------------------------------------------- */
/* Ricette                                                                    */
/* -------------------------------------------------------------------------- */

export async function listaRicette(): Promise<Recipe[]> {
  return unwrap(
    await supabase.from('recipes').select('*').order('created_at', { ascending: false }),
  ) as Recipe[]
}

export async function leggiRicetta(id: UUID): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as Recipe) ?? null
}

export async function creaRicetta(input: RecipeInput): Promise<Recipe> {
  return unwrap(
    await supabase.from('recipes').insert(input).select('*').single(),
  ) as Recipe
}

export async function modificaRicetta(
  id: UUID,
  patch: Partial<RecipeInput>,
): Promise<Recipe> {
  return unwrap(
    await supabase.from('recipes').update(patch).eq('id', id).select('*').single(),
  ) as Recipe
}

export async function eliminaRicetta(ricetta: Recipe): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', ricetta.id)
  if (error) throw error
  // la foto non serve piu': liberiamo lo spazio sullo storage
  if (ricetta.photo_path) await eliminaFoto(ricetta.photo_path)
}

/* -------------------------------------------------------------------------- */
/* Foto (bucket privato: si accede solo con link firmati)                     */
/* -------------------------------------------------------------------------- */

export async function caricaFoto(userId: string, file: File): Promise<string> {
  const compressa = await comprimiImmagine(file)
  const percorso = `${userId}/${crypto.randomUUID()}.${compressa.estensione}`

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(percorso, compressa.blob, {
      contentType: compressa.blob.type,
      cacheControl: '31536000',
      upsert: false,
    })
  if (error) throw error
  return percorso
}

export async function eliminaFoto(percorso: string): Promise<void> {
  // un errore qui non deve bloccare l'utente: al massimo resta un file orfano
  await supabase.storage.from(PHOTO_BUCKET).remove([percorso])
}

/** Link temporaneo (1 ora) per mostrare una foto del bucket privato. */
export async function urlFirmato(percorso: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(percorso, 60 * 60)
  if (error) throw error
  return data.signedUrl
}

/* -------------------------------------------------------------------------- */
/* Tag                                                                        */
/* -------------------------------------------------------------------------- */

export async function listaTag(): Promise<RecipeTag[]> {
  return unwrap(
    await supabase.from('recipe_tags').select('*').order('name'),
  ) as RecipeTag[]
}

export async function creaTag(nome: string): Promise<RecipeTag> {
  return unwrap(
    await supabase.from('recipe_tags').insert({ name: nome.trim() }).select('*').single(),
  ) as RecipeTag
}

export async function eliminaTag(id: UUID): Promise<void> {
  const { error } = await supabase.from('recipe_tags').delete().eq('id', id)
  if (error) throw error
}

/**
 * Registra fra i tag conosciuti quelli usati in una ricetta e non ancora
 * salvati, cosi' la prossima volta compaiono nei suggerimenti.
 */
export async function registraTagMancanti(
  usati: string[],
  conosciuti: RecipeTag[],
): Promise<void> {
  const esistenti = new Set(conosciuti.map((t) => t.name.toLowerCase()))
  const nuovi = [...new Set(usati.map((t) => t.trim()).filter(Boolean))].filter(
    (t) => !esistenti.has(t.toLowerCase()),
  )
  if (nuovi.length === 0) return
  const { error } = await supabase
    .from('recipe_tags')
    .insert(nuovi.map((name) => ({ name })))
  if (error && !error.message.includes('duplicate key')) throw error
}
