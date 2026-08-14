import {
  Archive,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ChefHat,
  Dumbbell,
  HeartPulse,
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
  {
    percorso: '/peso',
    etichetta: 'Salute',
    icona: HeartPulse,
    altriPercorsi: ['/allenamenti'],
  },
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

export interface GruppoNav {
  titolo: string
  voci: VoceNav[]
}

/**
 * Barra laterale del desktop: tutte le pagine, raggruppate per argomento.
 *
 * Sul telefono le stesse pagine si raggiungono con le schede in cima a ogni
 * sezione; qui c'e' spazio per elencarle tutte, cosi' non si "nasconde"
 * niente dietro a un altro schermo.
 */
export const GRUPPI_NAV: GruppoNav[] = [
  {
    titolo: 'Salute',
    voci: [
      { percorso: '/peso', etichetta: 'Peso', icona: Scale },
      { percorso: '/allenamenti', etichetta: 'Allenamenti', icona: Dumbbell },
    ],
  },
  {
    titolo: 'Cibo',
    voci: [
      { percorso: '/ricette', etichetta: 'Ricettario', icona: ChefHat, prefisso: true },
      { percorso: '/piano', etichetta: 'Piano pasti', icona: CalendarDays },
      { percorso: '/spesa', etichetta: 'Lista della spesa', icona: ShoppingCart },
    ],
  },
  {
    titolo: 'Organizzazione',
    voci: [
      { percorso: '/task', etichetta: 'Task', icona: ListTodo },
      { percorso: '/archivio', etichetta: 'Archivio task', icona: Archive },
      { percorso: '/diario', etichetta: 'Diario', icona: BookOpen },
    ],
  },
]

/** Voci fuori dai gruppi, in cima alla barra laterale. */
export const VOCI_IN_CIMA: VoceNav[] = [
  { percorso: '/', etichetta: 'Home', icona: Home },
  { percorso: '/settimana', etichetta: 'La tua settimana', icona: CalendarRange },
]

export const VOCE_IMPOSTAZIONI: VoceNav = {
  percorso: '/impostazioni',
  etichetta: 'Impostazioni',
  icona: Settings,
}
