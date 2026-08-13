/**
 * Tipi condivisi da tutta l'app.
 * Rispecchiano 1:1 le tabelle definite in supabase/schema.sql.
 *
 * Convenzioni importanti:
 * - i pesi sono SEMPRE salvati in chilogrammi e le altezze in centimetri;
 *   la conversione in libbre/pollici avviene solo al momento di mostrarli
 *   (vedi src/lib/units.ts). Cosi' cambiare unita' di misura non tocca i dati.
 * - le date "senza orario" sono stringhe 'AAAA-MM-GG' (tipo `date` di Postgres).
 */

export type UUID = string
/** Data nel formato 'AAAA-MM-GG' */
export type ISODate = string

/* -------------------------------------------------------------------------- */
/* Profilo e preferenze                                                       */
/* -------------------------------------------------------------------------- */

export type WeightUnit = 'kg' | 'lb'
export type LengthUnit = 'cm' | 'in'
export type ThemeMode = 'light' | 'dark' | 'system'
export type AccentName = 'verde' | 'indaco' | 'ciano' | 'rosa' | 'ambra' | 'viola'

export interface ReminderSetting {
  enabled: boolean
  /** orario nel formato 'HH:MM' */
  time: string
}

export interface Reminders {
  weight: ReminderSetting
  journal: ReminderSetting
  habits: ReminderSetting
}

export interface Profile {
  user_id: UUID
  display_name: string | null
  height_cm: number | null
  weight_unit: WeightUnit
  length_unit: LengthUnit
  weight_goal_kg: number | null
  calorie_goal: number | null
  theme: ThemeMode
  accent: AccentName
  reminders: Reminders
  created_at: string
  updated_at: string
}

/* -------------------------------------------------------------------------- */
/* Peso                                                                       */
/* -------------------------------------------------------------------------- */

export interface WeightEntry {
  id: UUID
  user_id: UUID
  date: ISODate
  weight_kg: number
  body_fat: number | null
  note: string | null
  created_at: string
}

export type WeightEntryInput = {
  date: ISODate
  weight_kg: number
  body_fat: number | null
  note: string | null
}

export type WeightRange = '7g' | '30g' | '3m' | '1a' | 'tutto'

/* -------------------------------------------------------------------------- */
/* Ricette e piano pasti                                                      */
/* -------------------------------------------------------------------------- */

export const MEAL_SLOTS = ['colazione', 'pranzo', 'cena', 'spuntino'] as const
export type MealSlot = (typeof MEAL_SLOTS)[number]

export const DIFFICULTIES = ['facile', 'media', 'difficile'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export interface Ingredient {
  name: string
  quantity: number | null
  unit: string | null
}

export interface Recipe {
  id: UUID
  user_id: UUID
  title: string
  photo_path: string | null
  category: MealSlot
  tags: string[]
  prep_minutes: number | null
  difficulty: Difficulty
  servings: number
  ingredients: Ingredient[]
  steps: string[]
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  created_at: string
  updated_at: string
}

export type RecipeInput = Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export interface MealPlanEntry {
  id: UUID
  user_id: UUID
  date: ISODate
  meal: MealSlot
  recipe_id: UUID
  pinned: boolean
  created_at: string
}

export interface MealPlanEntryWithRecipe extends MealPlanEntry {
  recipe: Recipe | null
}

export interface ShoppingItem {
  id: UUID
  user_id: UUID
  name: string
  quantity: number | null
  unit: string | null
  checked: boolean
  manual: boolean
  sort_order: number
  created_at: string
}

export interface RecipeTag {
  id: UUID
  user_id: UUID
  name: string
  created_at: string
}

/* -------------------------------------------------------------------------- */
/* Task                                                                       */
/* -------------------------------------------------------------------------- */

export const PRIORITIES = ['bassa', 'media', 'alta'] as const
export type Priority = (typeof PRIORITIES)[number]

export const RECURRENCES = ['giornaliera', 'settimanale', 'mensile'] as const
export type Recurrence = (typeof RECURRENCES)[number]

export interface TaskCategory {
  id: UUID
  user_id: UUID
  name: string
  color: string
  created_at: string
}

export interface Task {
  id: UUID
  user_id: UUID
  title: string
  notes: string | null
  priority: Priority
  due_date: ISODate | null
  category_id: UUID | null
  recurrence: Recurrence | null
  completed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type TaskInput = {
  title: string
  notes: string | null
  priority: Priority
  due_date: ISODate | null
  category_id: UUID | null
  recurrence: Recurrence | null
}

/* -------------------------------------------------------------------------- */
/* Diario e abitudini                                                         */
/* -------------------------------------------------------------------------- */

/** 1 = molto male ... 5 = benissimo */
export type Mood = 1 | 2 | 3 | 4 | 5

export interface JournalEntry {
  id: UUID
  user_id: UUID
  date: ISODate
  content: string
  mood: Mood | null
  created_at: string
  updated_at: string
}

export interface Habit {
  id: UUID
  user_id: UUID
  name: string
  emoji: string
  sort_order: number
  archived: boolean
  created_at: string
}

export interface HabitLog {
  id: UUID
  user_id: UUID
  habit_id: UUID
  date: ISODate
  created_at: string
}

/* -------------------------------------------------------------------------- */
/* Backup                                                                     */
/* -------------------------------------------------------------------------- */

export interface BackupFile {
  app: 'benessere'
  version: 1
  exported_at: string
  data: {
    profile: Profile | null
    weight_entries: WeightEntry[]
    recipes: Recipe[]
    recipe_tags: RecipeTag[]
    meal_plan_entries: MealPlanEntry[]
    shopping_items: ShoppingItem[]
    task_categories: TaskCategory[]
    tasks: Task[]
    journal_entries: JournalEntry[]
    habits: Habit[]
    habit_logs: HabitLog[]
  }
}
