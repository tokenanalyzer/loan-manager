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
  optimizeDeps: {
    // @loan-manager/shared-types is a pnpm workspace symlink resolving outside
    // node_modules, so Vite treats it as source and skips its usual CJS->ESM
    // interop. Forcing it into the esbuild pre-bundle restores that interop —
    // without it, the browser loads the package's CommonJS dist/index.js as
    // native ESM and finds no named exports at all.
    include: ['@loan-manager/shared-types'],
  },
});
