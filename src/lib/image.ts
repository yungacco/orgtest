/**
 * Compressione delle foto lato client, PRIMA di caricarle su Supabase Storage.
 * Una foto da 4 MB scattata col telefono diventa in genere 150–300 kB: si
 * risparmia spazio, traffico dati e l'app resta veloce anche in mobilita'.
 */

export interface ImmagineCompressa {
  blob: Blob
  estensione: 'webp' | 'jpg'
  larghezza: number
  altezza: number
}

const LATO_MASSIMO = 1400
const QUALITA = 0.82

function supportaWebp(): boolean {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').startsWith('data:image/webp')
}

function caricaImmagine(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Non riesco a leggere questa immagine.'))
    }
    img.src = url
  })
}

export async function comprimiImmagine(file: File): Promise<ImmagineCompressa> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Il file selezionato non e’ un’immagine.')
  }

  const img = await caricaImmagine(file)
  const scala = Math.min(1, LATO_MASSIMO / Math.max(img.width, img.height))
  const larghezza = Math.max(1, Math.round(img.width * scala))
  const altezza = Math.max(1, Math.round(img.height * scala))

  const canvas = document.createElement('canvas')
  canvas.width = larghezza
  canvas.height = altezza
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Il browser non supporta la compressione delle immagini.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, larghezza, altezza)

  const webp = supportaWebp()
  const mime = webp ? 'image/webp' : 'image/jpeg'

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, QUALITA),
  )
  if (!blob) throw new Error('Compressione dell’immagine non riuscita.')

  return {
    blob,
    estensione: webp ? 'webp' : 'jpg',
    larghezza,
    altezza,
  }
}

/** Dimensione leggibile: "248 kB" */
export function formatDimensione(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}
