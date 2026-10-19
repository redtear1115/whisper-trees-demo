import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  // 固定埠：Firebase API key 的 HTTP referrer 限制與 Auth 授權網域只列這個
  server: { port: 5173, strictPort: true },
})
