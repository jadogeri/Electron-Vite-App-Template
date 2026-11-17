import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { build } from 'vite'

export default defineConfig({
  main: {
    build: { rollupOptions: { output: { format: 'es', entryFileNames: 'index.mjs' } } },
    plugins: [externalizeDepsPlugin(), {
      name: 'utility-process-entry',
      writeBundle: {
        order: 'pre',
        sequential: true,
        async handler() {
          const { existsSync } = await import('node:fs')
          const entry = resolve('src/main/features/worker-process/worker.ts')
          if (!existsSync(entry)) return
          await build({
            configFile: false,
            build: {
              emptyOutDir: false, outDir: 'out/main', minify: false,
              lib: { entry, formats: ['cjs'], fileName: () => 'worker-process.cjs' },
              rollupOptions: { external: ['electron', /^node:/] }
            }
          })
        }
      }
    }]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    build: { minify: false, reportCompressedSize: false },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      react(),
      {
        name: 'packaged-content-security-policy',
        apply: 'build',
        // file:// pages cannot rely on HTTP response headers.
        transformIndexHtml: () => [{
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'"
          },
          injectTo: 'head-prepend'
        }]
      }
    ]
  }
})
