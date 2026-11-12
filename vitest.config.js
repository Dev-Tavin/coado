import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/domain/**'],
      reporter: ['text', 'html'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }, // RNF-006
    },
  },
});
