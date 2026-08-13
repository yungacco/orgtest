import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variante = 'primario' | 'secondario' | 'fantasma' | 'pericolo' | 'soft'
type Dimensione = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  dimensione?: Dimensione
  caricamento?: boolean
  iconaSinistra?: ReactNode
  iconaDestra?: ReactNode
  larghezzaPiena?: boolean
}

const varianti: Record<Variante, string> = {
  primario:
    'bg-accent-600 text-white hover:bg-accent-700 active:bg-accent-700 shadow-soft disabled:hover:bg-accent-600',
  secondario:
    'bg-card text-ink border border-line hover:bg-elev active:bg-elev disabled:hover:bg-card',
  fantasma: 'text-ink-2 hover:bg-elev hover:text-ink active:bg-elev',
  soft: 'bg-accent-500/12 text-accent-700 hover:bg-accent-500/20 dark:text-accent-300',
  pericolo: 'bg-danger text-white hover:opacity-90 active:opacity-90',
}

const dimensioni: Record<Dimensione, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-[0.95rem] gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variante = 'primario',
    dimensione = 'md',
    caricamento = false,
    iconaSinistra,
    iconaDestra,
    larghezzaPiena,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || caricamento}
      aria-busy={caricamento || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium',
        'transition-[background-color,color,transform,opacity] duration-150 active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100',
        varianti[variante],
        dimensioni[dimensione],
        larghezzaPiena && 'w-full',
        className,
      )}
      {...props}
    >
      {caricamento ? (
        <Loader2 aria-hidden className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        iconaSinistra
      )}
      {children}
      {!caricamento && iconaDestra}
    </button>
  )
})

/** Collegamento interno con l'aspetto di un pulsante. */
export function LinkButton({
  to,
  variante = 'primario',
  dimensione = 'md',
  iconaSinistra,
  larghezzaPiena,
  className,
  children,
}: {
  to: string
  variante?: Variante
  dimensione?: Dimensione
  iconaSinistra?: ReactNode
  larghezzaPiena?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium',
        'transition-[background-color,color,transform] duration-150 active:scale-[0.98]',
        varianti[variante],
        dimensioni[dimensione],
        larghezzaPiena && 'w-full',
        className,
      )}
    >
      {iconaSinistra}
      {children}
    </Link>
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  etichetta: string
  variante?: Variante
  dimensione?: 'sm' | 'md'
}

/** Pulsante con la sola icona: richiede sempre un'etichetta per lo screen reader. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { etichetta, variante = 'fantasma', dimensione = 'md', className, children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        title={etichetta}
        aria-label={etichetta}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-xl transition-colors duration-150',
          'active:scale-95 disabled:cursor-not-allowed disabled:opacity-50',
          dimensione === 'md' ? 'h-11 w-11' : 'h-9 w-9',
          varianti[variante],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    )
  },
)
