import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests only — Playwright specs (*.spec.ts) run via `npm run test:e2e`.
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
