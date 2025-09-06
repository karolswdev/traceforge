import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.tmp_test_*/**',
      ],
    },
  },
});

