import { defineConfig } from 'vitest/config'

// Firestore Security Rules tests (tests/rules) and cloud-store tests (tests/cloud). They need the
// local Firestore + Auth emulators, so they run only through `npm run test:rules`
// (firebase emulators:exec), never in `npm test`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts', 'tests/cloud/**/*.test.ts'],
    // All files share one emulator database; run them one after another.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
})
