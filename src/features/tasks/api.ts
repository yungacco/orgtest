import { supabase, unwrap } from '@/lib/supabase'
import type { ISODate, Task, TaskCategory, TaskInput, UUID } from '@/types'

/* -------------------------------------------------------------------------- */
/* Task attive e archiviate                                                   */
/* -------------------------------------------------------------------------- */

export async function listaTaskAttive(): Promise<Task[]> {
  return unwrap(
    await supabase
      .from('tasks')
      .select('*')
      .is('completed_at', null)
      .order('sort_order', { ascending: true }),
  ) as Task[]
}

export async function listaTaskArchiviate(): Promise<Task[]> {
  return unwrap(
    await supabase
      .from('tasks')
      .select('*')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(500),
  ) as Task[]
}

export async function creaTask(input: TaskInput, sortOrder: number): Promise<Task> {
  return unwrap(
    await supabase
      .from('tasks')
      .insert({ ...input, sort_order: sortOrder })
      .select('*')
      .single(),
  ) as Task
}

export async function modificaTask(id: UUID, patch: Partial<Task>): Promise<Task> {
  return unwrap(
    await supabase.from('tasks').update(patch).eq('id', id).select('*').single(),
  ) as Task
}

export async function eliminaTask(id: UUID): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

/** Riordino dell'elenco attivo: una sola chiamata per tutta la lista. */
export async function riordinaTask(ids: UUID[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_tasks', { p_ids: ids })
  if (error) throw error
}

/* -------------------------------------------------------------------------- */
/* Completamento (con eventuale occorrenza successiva)                        */
/* -------------------------------------------------------------------------- */

export interface EsitoCompletamento {
  completata: Task
  /** creata solo se la task era ricorrente */
  successiva: Task | null
}

export async function completaTask(
  task: Task,
  prossimaScadenza: ISODate | null,
): Promise<EsitoCompletamento> {
  const completata = await modificaTask(task.id, {
    completed_at: new Date().toISOString(),
  })

  if (!task.recurrence) return { completata, successiva: null }

  const successiva = unwrap(
    await supabase
      .from('tasks')
      .insert({
        title: task.title,
        notes: task.notes,
        priority: task.priority,
        due_date: prossimaScadenza,
        category_id: task.category_id,
        recurrence: task.recurrence,
        sort_order: task.sort_order,
      })
      .select('*')
      .single(),
  ) as Task

  return { completata, successiva }
}

/* -------------------------------------------------------------------------- */
/* Categorie                                                                  */
/* -------------------------------------------------------------------------- */

export async function listaCategorie(): Promise<TaskCategory[]> {
  return unwrap(
    await supabase.from('task_categories').select('*').order('name'),
  ) as TaskCategory[]
}

export async function creaCategoria(nome: string, colore: string): Promise<TaskCategory> {
  return unwrap(
    await supabase
      .from('task_categories')
      .insert({ name: nome.trim(), color: colore })
      .select('*')
      .single(),
  ) as TaskCategory
}

export async function eliminaCategoria(id: UUID): Promise<void> {
  const { error } = await supabase.from('task_categories').delete().eq('id', id)
  if (error) throw error
}
