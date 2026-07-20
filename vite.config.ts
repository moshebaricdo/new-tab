import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so GitHub Pages works for project pages and custom domains.
export default defineConfig({
  plugins: [react()],
  base: './',
})
