import {
  Archive,
  BookOpen,
  CalendarDays,
  ChefHat,
  Home,
  ListTodo,
  Scale,
  Settings,
  ShoppingCart,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface VoceNav {
  percorso: string
  etichetta: string
  icona: LucideIcon
  /** true se la voce deve essere evidenziata anche per le sotto-pagine */
  prefisso?: boolean
}

/** Voci della barra in basso sul telefono (max 5, con target da 44px). */
export const NAV_PRINCIPALE: VoceNav[] = [
  { percorso: '/', etichetta: 'Home', icona: Home },
  { percorso: '/peso', etichetta: 'Peso', icona: Scale },
  { percorso: '/ricette', etichetta: 'Ricette', icona: ChefHat, prefisso: true },
  { percorso: '/task', etichetta: 'Task', icona: ListTodo },
  { percorso: '/diario', etichetta: 'Diario', icona: BookOpen },
]

/** Voci aggiuntive: nella sidebar desktop e nelle schede interne su mobile. */
export const NAV_SECONDARIA: VoceNav[] = [
  { percorso: '/piano', etichetta: 'Piano pasti', icona: CalendarDays },
  { percorso: '/spesa', etichetta: 'Lista della spesa', icona: ShoppingCart },
  { percorso: '/archivio', etichetta: 'Archivio task', icona: Archive },
]

export const VOCE_IMPOSTAZIONI: VoceNav = {
  percorso: '/impostazioni',
  etichetta: 'Impostazioni',
  icona: Settings,
}
