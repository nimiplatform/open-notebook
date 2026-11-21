import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { mobileAccess } from './capacitor.config.ts'
const root = import.meta.dirname
export default defineConfig({
  root: path.join(root, 'frontend/mobile'), publicDir: path.join(root, 'frontend/public'),
  plugins: [react(), tailwindcss(), { name: 'notebook-mobile-no-next-server', resolveId(id) {
    if (id.startsWith('next/') || id === 'server-only') throw new Error(`Review the mobile consumer of ${id}; Next servers are not packaged in Android.`)
  } }],
  resolve: { alias: [
    { find: '@/components/ui/md-editor-loader', replacement: path.join(root, 'frontend/src/mobile/md-editor.ts') },
    { find: '@/lib/navigation', replacement: path.join(root, 'frontend/src/mobile/navigation.tsx') },
    { find: '@', replacement: path.join(root, 'frontend/src') },
  ], dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'i18next', 'react-i18next', '@radix-ui/react-context', '@radix-ui/react-dialog', '@radix-ui/react-dismissable-layer', '@radix-ui/react-focus-guards', '@radix-ui/react-focus-scope', '@radix-ui/react-portal'] },
  define: { __NOTEBOOK_MOBILE_CONFIG__: JSON.stringify(mobileAccess), 'process.env.NEXT_PUBLIC_NIMI_WEB': '"1"', 'process.env.NEXT_PUBLIC_API_TIMEOUT_MS': 'undefined' },
  css: { postcss: { plugins: [] } },
  build: { outDir: path.join(root, 'dist-mobile'), emptyOutDir: true, target: 'chrome120', rollupOptions: {
    input: { index: path.join(root, 'frontend/mobile/index.html'), workspace: path.join(root, 'frontend/mobile/workspace.html') },
  } },
})
