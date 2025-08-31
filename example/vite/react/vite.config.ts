import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteReactLiveEditor from 'vaji'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteReactLiveEditor({ isEditable: true })
  ],
})
