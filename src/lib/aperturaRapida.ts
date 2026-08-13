import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Convenzione usata dal pulsante flottante "+": invece di far comunicare
 * fra loro componenti lontani, la pagina viene aperta con il parametro
 * ?nuovo=1 nell'indirizzo e la pagina stessa apre il proprio modulo.
 *
 * Vantaggio: si puo' anche salvare/condividere il link "aggiungi peso".
 */
export function useAperturaRapida(): [boolean, () => void] {
  const [params, setParams] = useSearchParams()
  const aperto = params.get('nuovo') === '1'

  const chiudi = useCallback(() => {
    setParams(
      (precedenti) => {
        const successivi = new URLSearchParams(precedenti)
        successivi.delete('nuovo')
        return successivi
      },
      { replace: true },
    )
  }, [setParams])

  return [aperto, chiudi]
}
