import { forwardRef, useEffect, useId, useRef } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

const baseCampo =
  'w-full rounded-xl border border-line bg-card px-3.5 text-ink placeholder:text-ink-3 ' +
  'transition-colors duration-150 hover:border-ink-3/50 ' +
  'disabled:cursor-not-allowed disabled:bg-elev disabled:text-ink-3 ' +
  'aria-[invalid=true]:border-danger'

interface EtichettaProps {
  etichetta?: string
  descrizione?: string
  errore?: string
  richiesto?: boolean
  className?: string
  children: (id: string, invalido: boolean) => ReactNode
}

/**
 * Contenitore che collega etichetta, descrizione ed errore al campo tramite
 * gli attributi corretti (for / aria-describedby): serve all'accessibilita'.
 */
export function Field({
  etichetta,
  descrizione,
  errore,
  richiesto,
  className,
  children,
}: EtichettaProps) {
  const id = useId()
  const contenitore = useRef<HTMLDivElement>(null)
  const messaggioId = errore || descrizione ? `${id}-msg` : undefined

  // Collega descrizione ed errore al campo senza obbligare chi usa Field a
  // ripetere ogni volta gli attributi aria.
  useEffect(() => {
    const campo = contenitore.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
    if (!campo) return
    if (messaggioId) campo.setAttribute('aria-describedby', messaggioId)
    else campo.removeAttribute('aria-describedby')
    if (errore) campo.setAttribute('aria-invalid', 'true')
    else if (campo.getAttribute('aria-invalid') === 'true') {
      campo.removeAttribute('aria-invalid')
    }
  }, [id, messaggioId, errore])

  return (
    <div ref={contenitore} className={cn('space-y-1.5', className)}>
      {etichetta && (
        <label htmlFor={id} className="block text-sm font-medium text-ink-2">
          {etichetta}
          {richiesto && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children(id, Boolean(errore))}
      {errore ? (
        <p id={`${id}-msg`} role="alert" className="text-sm text-danger">
          {errore}
        </p>
      ) : descrizione ? (
        <p id={`${id}-msg`} className="text-sm text-ink-3">
          {descrizione}
        </p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(baseCampo, 'h-11', className)} {...props} />
  },
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(baseCampo, 'resize-y py-2.5 leading-relaxed', className)}
      {...props}
    />
  )
})

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          baseCampo,
          'h-11 appearance-none pr-9',
          'bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat',
          className,
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
    </div>
  )
})

/** Interruttore on/off accessibile (usa un vero checkbox sotto). */
export function Switch({
  checked,
  onChange,
  etichetta,
  disabled,
}: {
  checked: boolean
  onChange: (valore: boolean) => void
  etichetta: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={etichetta}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-accent-600' : 'bg-ink-3/35',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

/** Casella di spunta grande abbastanza da essere toccata sul telefono. */
export function Checkbox({
  checked,
  onChange,
  etichetta,
  className,
}: {
  checked: boolean
  onChange: (valore: boolean) => void
  etichetta: string
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={etichetta}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150',
        checked
          ? 'border-accent-600 bg-accent-600 text-white'
          : 'border-ink-3/50 bg-transparent hover:border-accent-500',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={cn(
          'h-3.5 w-3.5 transition-opacity duration-150',
          checked ? 'opacity-100' : 'opacity-0',
        )}
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </button>
  )
}
