import { defineConfig } from 'vitest/config';

// End-to-end checks that boot a real stack (Kernel, worker, app runtime, Gateway) with the
// CLI. They need network access (the components find each other over the DHT) and take a
// minute or two, so they are not part of `npm test`; run them with `npm run test:e2e`
// (or `test:e2e:stack` / `test:e2e:scaffold`). The scaffold suite also needs a built ui/.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/e2e/**/*.e2e.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    env: { NO_COLOR: '1' },
  },
});
