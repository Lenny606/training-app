---
name: verify
description: Validate changes in this TanStack Start app by type-checking, running tests, and building. Use before pushing or when asked to verify a change works.
---

Run these in order and report results. Stop at the first failure and show its output.

1. **Lint:** `npm run lint`
2. **Type-check:** `npx tsc --noEmit`
3. **Tests:** `npm run test`
4. **Build:** `npm run build`

Notes for this project:

- `src/routeTree.gen.ts` is generated — if type errors point there, run `npm run generate-routes` and re-check rather than editing it.
- Run a single test with `npx vitest run -t "<name>"`.
- This skill is additive to the bundled `/verify`; it pins the exact commands for this repo.
