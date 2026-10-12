import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const desktopBuild = mode === 'desktop'
  return {
    // Keep OCR models and runtimes out of the web deployment. Electron builds
    // still include the full `public` directory for local receipt scanning.
    publicDir: desktopBuild ? 'public' : 'public-web',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        {
          find: './ReceiptScanner',
          replacement: fileURLToPath(new URL(
            desktopBuild ? './src/features/ReceiptScanner.tsx' : './src/features/ReceiptScannerUnavailable.tsx',
            import.meta.url,
          )),
        },
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      ],
    },
  }
})
