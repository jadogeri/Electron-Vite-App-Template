import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: { rollupOptions: { output: { format: 'es', entryFileNames: 'index.mjs' } } },
    plugins: [externalizeDepsPlugin()]
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
