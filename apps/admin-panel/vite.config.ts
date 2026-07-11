import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vite build configuration for the Admin Panel.
 * Phase 1 scope: build tooling only — no application UI is defined yet.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.ADMIN_PANEL_PORT) || 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
