import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Configurazione dei test automatici.
 *
 * I test coprono la logica "di calcolo" dell'app (medie del peso, somme
 * della spesa, serie delle abitudini, generatore del menu', statistiche
 * degli allenamenti): sono funzioni pure, quindi non serve ne' un browser
 * ne' il database. Si lanciano con `npm test`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
