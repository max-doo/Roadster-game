import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], base: './', build: { rollupOptions:{output:{manualChunks:{three:['three'],physics:['@dimforge/rapier2d-compat'],react:['react','react-dom']}}} }, server: { port: 5173, strictPort: true } });
