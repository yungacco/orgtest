/**
 * Genera le icone PNG della PWA (public/icons/*.png e public/apple-touch-icon.png)
 * senza dipendenze esterne.
 *
 * Uso:  node scripts/generate-icons.mjs
 *
 * Le icone sono gia' committate nel repository: questo script serve solo se
 * vuoi cambiare colore o disegno dell'icona.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const crcTable = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filtro "None"
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const clamp01 = (v) => Math.min(1, Math.max(0, v))
/** anti-aliasing: 1 dentro la forma, 0 fuori, sfumato sul bordo */
const cover = (d, feather = 1.2) => clamp01(0.5 - d / feather)

const TOP = [52, 199, 123]
const BOTTOM = [13, 148, 136]

/**
 * @param {number} size lato in pixel
 * @param {boolean} maskable se true lascia un margine di sicurezza del 20%
 */
function drawIcon(size, maskable) {
  const px = Buffer.alloc(size * size * 4)
  const s = size
  const radius = maskable ? s / 2 : s * 0.22 // maskable = cerchio pieno
  const pad = maskable ? s * 0.2 : 0
  const inner = s - pad * 2
  // foglia: intersezione di due cerchi, centrata nell'area utile
  const cx = s / 2
  const cy = s / 2
  const leafR = inner * 0.42
  const off = leafR * 0.55
  const stemW = Math.max(1.5, inner * 0.035)

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4
      // --- sfondo: rettangolo arrotondato (o cerchio) con gradiente ---
      const qx = Math.abs(x + 0.5 - s / 2) - (s / 2 - radius)
      const qy = Math.abs(y + 0.5 - s / 2) - (s / 2 - radius)
      const dBg =
        Math.min(Math.max(qx, qy), 0) +
        Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) -
        radius
      const bgA = cover(dBg, 1.6)
      const base = mix(TOP, BOTTOM, y / s)

      // --- foglia bianca (due archi che si incontrano) ---
      const rx = x + 0.5 - cx
      const ry = y + 0.5 - cy
      // ruota di 45 gradi
      const k = Math.SQRT1_2
      const ux = (rx - ry) * k
      const uy = (rx + ry) * k
      const d1 = Math.hypot(ux + off, uy + off) - leafR
      const d2 = Math.hypot(ux - off, uy - off) - leafR
      const leafA = cover(Math.max(d1, d2), 1.4)

      // --- nervatura centrale (linea diagonale sottile) ---
      const along = clamp01(1 - Math.abs(uy) / (leafR * 1.35))
      const vein = cover(Math.abs(ux) - stemW / 2, 1.2) * along * leafA

      let col = base
      col = mix(col, [255, 255, 255], leafA * 0.96)
      col = mix(col, mix(TOP, BOTTOM, 0.5), vein * 0.9)

      px[i] = col[0]
      px[i + 1] = col[1]
      px[i + 2] = col[2]
      px[i + 3] = Math.round(bgA * 255)
    }
  }
  return encodePng(s, s, px)
}

mkdirSync(resolve(root, 'public/icons'), { recursive: true })
const outputs = [
  ['public/icons/icon-192.png', 192, false],
  ['public/icons/icon-512.png', 512, false],
  ['public/icons/icon-512-maskable.png', 512, true],
  ['public/apple-touch-icon.png', 180, false],
]
for (const [file, size, maskable] of outputs) {
  writeFileSync(resolve(root, file), drawIcon(size, maskable))
  console.log('creato', file, `${size}x${size}`)
}
