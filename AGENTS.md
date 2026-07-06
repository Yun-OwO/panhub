# Repository Guidelines

## Project Structure & Module Organization
This repository is a Nuxt 4 + TypeScript app with server-side search aggregation logic.

- `pages/` and `app.vue`: UI routes and page-level Vue components.
- `composables/`: client-side reusable logic (for example `useSearch.ts`, `useSettings.ts`).
- `server/api/`: HTTP endpoints (`*.get.ts`, `*.post.ts`).
- `server/core/`: core services, plugins, cache, types, and utilities.
- `config/`: runtime plugin/channel configuration.
- `test/unit/`: Vitest unit tests (`*.test.ts`).
- `test/*.mjs`: API/integration-oriented test scripts.
- `public/` and `assets/`: static files and styling assets.
- `data/`: local runtime data (JSON hot-search persistence in local/Docker).

## Build, Test, and Development Commands
Use `pnpm` (lockfile is `pnpm-lock.yaml`).

- `pnpm dev`: start local development server.
- `pnpm build`: build production bundle.
- `pnpm preview`: preview the production build locally.
- `pnpm generate`: generate static output when needed.
- `pnpm test`: run all unit tests with Vitest.
- `pnpm test:watch`: run tests in watch mode.
- `pnpm test:coverage`: generate text/json/html coverage reports.
- `pnpm test:api`: run API test script (`test/api.test.mjs`).
- `pnpm deploy:cf`: deploy to Cloudflare Workers via Wrangler.

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts`) and Vue SFC (`.vue`), ESM modules.
- Indentation: 2 spaces; keep semicolons and double quotes consistent with existing files.
- Naming:
  - Vue composables: `useXxx.ts`.
  - Server routes: `name.get.ts` / `name.post.ts`.
  - Unit tests: `*.test.ts` under `test/unit/`.
- Keep changes focused; prefer small, testable functions in `server/core/services`.

## Testing Guidelines
- Framework: Vitest (`vitest.config.ts`), Node environment, globals enabled.
- Coverage provider: V8; reporters include `text`, `json`, and `html`.
- Add/adjust unit tests whenever behavior in `server/core/**` changes.
- Run `pnpm test` before opening a PR; use `pnpm test:coverage` for critical logic updates.

## Commit & Pull Request Guidelines
- Follow Conventional Commits, as used in history: `feat:`, `fix:`, `refactor:`, `delete:`.
- Keep commit subjects short and imperative; one logical change per commit.
- PRs should include:
  - clear summary of behavior changes,
  - linked issue (if applicable),
  - test evidence (command + result),
  - UI screenshots/GIFs for page/component updates.

## Security & Configuration Tips
- Do not commit secrets or local runtime data from `data/`.
- Validate new external plugins/sources in `server/core/plugins/` with timeout and retry-safe patterns.
