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
  /** altre pagine che appartengono alla stessa sezione (schede interne) */
  altriPercorsi?: string[]
}

/** Voci della barra in basso sul telefono (max 5, con target da 44px). */
export const NAV_PRINCIPALE: VoceNav[] = [
  { percorso: '/', etichetta: 'Home', icona: Home },
  { percorso: '/peso', etichetta: 'Peso', icona: Scale },
  {
    percorso: '/ricette',
    etichetta: 'Cibo',
    icona: ChefHat,
    prefisso: true,
    altriPercorsi: ['/piano', '/spesa'],
  },
  { percorso: '/task', etichetta: 'Task', icona: ListTodo, altriPercorsi: ['/archivio'] },
  { percorso: '/diario', etichetta: 'Diario', icona: BookOpen },
]

/**
 * La voce di menu e' quella "accesa"?
 *
 * Con `sezioneIntera` (barra in basso del telefono) si accende anche sulle
 * pagine sorelle: dal piano pasti resta illuminato "Cibo". Senza, si accende
 * solo sulla pagina esatta: serve alla barra laterale del desktop, che elenca
 * gia' le pagine sorelle una per una e altrimenti ne evidenzierebbe due.
 */
export function voceAttiva(
  voce: VoceNav,
  percorso: string,
  sezioneIntera = false,
): boolean {
  if (
    sezioneIntera &&
    voce.altriPercorsi?.some((p) => percorso === p || percorso.startsWith(`${p}/`))
  ) {
    return true
  }
  if (voce.prefisso) {
    return percorso === voce.percorso || percorso.startsWith(`${voce.percorso}/`)
  }
  return percorso === voce.percorso
}

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
