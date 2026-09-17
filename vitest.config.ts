import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'shared',
          root: 'packages/shared',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'api',
          root: 'apps/api',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: { '@': path.resolve(import.meta.dirname, 'apps/web') },
        },
        test: {
          name: 'web',
          root: 'apps/web',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['tests/setup.ts'],
          include: ['tests/**/*.test.tsx', 'tests/**/*.test.ts'],
        },
      },
    ],
  },
});
