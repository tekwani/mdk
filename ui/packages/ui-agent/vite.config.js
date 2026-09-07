import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

import mdkLayer from './postcss-mdk-layer.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// One stylesheet for the whole package. Unlike react-devkit, components here do
// NOT import their own `.scss` from their `.tsx` — every partial is reached from
// `src/styles.scss` instead (see scripts/check-style-forwards.mjs). That removes
// the need for a dist style-import stripper: the emitted JS never references SCSS.
export default defineConfig(({ mode }) => ({
  publicDir: false,
  build: {
    lib: {
      entry: { styles: resolve(__dirname, 'src/styles.scss') },
      formats: ['es'],
    },
    outDir: resolve(__dirname, 'dist'),
    // The TS build writes here first; emptying would delete it.
    emptyOutDir: false,
    // Must stay `true` under Vite 8 / rolldown — `vite:css-post` only registers
    // entry CSS assets when code splitting is on, and its pure-CSS-chunk cleanup
    // crashes without them. Same reason react-devkit pins it.
    cssCodeSplit: true,
    sourcemap: mode === 'development',
    rollupOptions: {
      output: { assetFileNames: '[name].css' },
    },
  },
  css: {
    devSourcemap: true,
    postcss: { plugins: [mdkLayer()] },
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: ['import'],
      },
    },
  },
}))
