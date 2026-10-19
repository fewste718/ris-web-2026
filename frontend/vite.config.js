import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { mockApiPlugin } from './dev/mockApiPlugin.js'

export default defineConfig({
  plugins: [vue(), mockApiPlugin()],
  server: {
    port: 5173,
    strictPort: true,
  },
})
