import path from 'node:path'
import { defineConfig, loadEnv, mergeConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nimiWebViteConfig } from '@nimiplatform/app-tools/web'

const root = import.meta.dirname

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, root, ''), ...process.env }
  const serve = command === 'serve'
  const release = mode === 'web-release'
  if (!serve && !release && !env.NIMI_DEV_REALM) {
    env.NIMI_DEV_REALM = 'local'
  }
  return mergeConfig(
    {
      root,
      publicDir: path.join(root, 'frontend/public'),
      base: './',
      plugins: [
        react(),
        tailwindcss(),
        {
          name: 'notebook-web-no-next-server',
          resolveId(id) {
            if (id.startsWith('next/') || id === 'server-only') {
              throw new Error(`Review the Web consumer of ${id}; Next servers are not packaged in static Web bundles.`)
            }
          },
        },
      ],
      server: {
        watch: { ignored: ['**/.nimi/local/**', '**/.tmp/**', '**/dist/**', '**/dist-electron*/**', '**/frontend/.next*/**'] },
      },
      resolve: {
        alias: [
          { find: '@/components/ui/md-editor-loader', replacement: path.join(root, 'frontend/src/mobile/md-editor.ts') },
          { find: '@/lib/navigation', replacement: path.join(root, 'frontend/src/web/navigation.tsx') },
          { find: '@', replacement: path.join(root, 'frontend/src') },
        ],
        dedupe: [
          'react',
          'react-dom',
          'react/jsx-runtime',
          'i18next',
          'react-i18next',
          '@radix-ui/react-context',
          '@radix-ui/react-dialog',
          '@radix-ui/react-dismissable-layer',
          '@radix-ui/react-focus-guards',
          '@radix-ui/react-focus-scope',
          '@radix-ui/react-portal',
        ],
      },
      define: {
        'process.env.NEXT_PUBLIC_NIMI_WEB': '"1"',
        'process.env.NEXT_PUBLIC_API_TIMEOUT_MS': 'undefined',
      },
      css: { postcss: { plugins: [] } },
      build: {
        outDir: path.join(root, 'dist-web'),
        emptyOutDir: true,
        target: 'es2022',
      },
    },
    nimiWebViteConfig({ root, env, serve, release })
  )
})
