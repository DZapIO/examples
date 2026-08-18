import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Vite only exposes VITE_-prefixed vars to import.meta.env; the DZap SDK reads
  // its zap API URL override from process.env at module load time instead, so it
  // has to be injected explicitly here for a local .env override to take effect.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      nodePolyfills()
    ],
    define: {
      'process.env.ZAP_API_URL': JSON.stringify(env.ZAP_API_URL),
    },
  }
})
