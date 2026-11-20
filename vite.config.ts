import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
/// <reference types="vitest" />

export default defineConfig(({ mode }) => {
  const isTest = Boolean(process.env.VITEST || mode === 'test');
  return {
    plugins: [react(), !isTest && tailwindcss()].filter(Boolean),
    define: {
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(
        process.env.GOOGLE_MAPS_PLATFORM_KEY || ''
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('leaflet')) return 'vendor-gis';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('motion') || id.includes('framer-motion') || id.includes('@animate-ui')) {
              return 'vendor-motion';
            }
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('\\react\\') || id.includes('\\react-dom\\') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            return undefined;
          },
        },
      },
    },
    // Vitest: kiểm thử tự động cho KP3 (Công cụ #23 trong danh sách 30)
    test: {
      globals: true,
      environment: 'node',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        exclude: [
          'node_modules/',
          'src/test/',
          'src/mockData.ts',
          'src/mockForms.ts',
          'dist/',
        ],
      },
    },
  };
});
