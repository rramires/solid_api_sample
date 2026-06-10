# CLAUDE.md — How to work on this repo

Instructions for AI assistants (and humans) contributing to this project.
Architecture lives in [PROJECT.md](PROJECT.md) / [PROJECT-pt-BR.md](PROJECT-pt-BR.md);
this file is about **process**.

## Before you start — approval & planning

- **Do not execute, edit, or commit anything until the user explicitly says
  so.** Discuss first; act only on an explicit go-ahead.
- For any non-trivial work, **clarify every open question first**. Only once all
  doubts are resolved, write a **`PLAN.md`** at the repo root (groups, checkpoint
  commits, gates, docs, final verification).
- After writing `PLAN.md`, **ask whether the user wants a resume prompt** — a
  self-contained prompt carrying every instruction needed to execute the plan,
  so the user can compact the current session and paste it into a fresh one.
- **`PLAN.md` is NEVER committed.** It is in `.gitignore` and must stay there —
  it is a local working document. Delete it (`rm PLAN.md`) only after every plan
  item is verified.

## Golden workflow (every change)

1. **Branch per stage**, off `master`. **Never commit to `master`** (it is
   protected and CI runs on PRs).
2. **Checkpoint commits** — one commit per finished item, created **right after
   its gate passes**. Never batch two items into one commit; never leave a
   finished item uncommitted.
3. **Gate before every commit** (must be green):
    ```sh
    pnpm lint && pnpm compile && pnpm test
    ```
    Changes that touch HTTP/routes also run the e2e suite before pushing
    (MySQL up: `pnpm compose:up`):
    ```sh
    pnpm test:e2e
    ```
4. **One PR per group** (`gh pr create`) with a descriptive body + test plan.
   Then **STOP and wait for the user to merge** on GitHub (CI must be green
   there). After merge: `git checkout master && git pull`, delete the local
   branch, `git remote prune origin`, start the next branch.

## Commit messages

Conventional Commits, matching the change: `fix(scope): …`, `feat(auth): …`,
`test: …`, `docs: …`, `ci: …`, `chore: …`. Intermediate fixes found mid-group
get their own `fix(scope): …` checkpoint commit. End every commit with:

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

## Prisma

- After any `prisma migrate` / `prisma generate`: **recreate the barrel**
  `src/prisma-client/index.ts` with `export * from './client.js'` — generation
  overwrites it.
- Every new env var goes to **`.env.example` with a comment** AND to the Zod
  schema in `src/env/index.ts`.

## Tests

- **Unit project** glob: `src/{use-cases,utils,repositories,lib}/**/*.spec.ts`
  (no database; use the in-memory repositories).
- **E2E project**: `src/http/controllers/**/*.spec.ts` plus integration specs
  named `*.int-spec.ts` (isolated per-file test DB). The `.int-spec.ts` suffix
  keeps DB-bound specs **out** of the unit glob.
- **Coverage thresholds** are enforced in `vite.config.mts` (lines/functions 80) via `pnpm test:coverage`, run in the e2e workflow (MySQL available).
- **CI gotcha:** any spec that imports `@/app` or `@/env` pulls the env module,
  which validates on load. The **unit** workflow therefore needs `NODE_ENV`,
  `JWT_SECRET`, `ADMIN_*` and a dummy `DATABASE_URL` (unit never connects).

## Docs — always both languages

A doc change is incomplete until it lands in **all four** files:
`README.md` + `README-pt-BR.md`, `PROJECT.md` + `PROJECT-pt-BR.md`. Keep them
coherent (routes table, env table, features, models, error-handler behavior).
`PROJECT*.md` = architecture reference; `README*.md` = setup + usage + smoke
test. Run `pnpm exec prettier --check` on the docs before committing.

## Large changes that add routes — final manual verification

Before finishing such a change, on a **clean database**, exercise every route
**one-by-one in the terminal** (just like the README smoke test), confirming
status codes — new routes are only "done" after passing here:

```sh
pnpm compose:down && pnpm compose:up      # destroy + recreate MySQL
pnpm exec prisma migrate deploy
pnpm seed-adm-role
pnpm dev                                  # then curl each route
```

Mind the rate limits while walking through routes:

- **Strict 5/min per IP** on `/users`, `/sessions`, `/users/forgot-password`,
  `/users/reset-password` — each route has its own independent budget.
- **Global 100/min per IP** on everything.
- Sleep 60s to reset a window when a budget is exhausted; run any `/hello`
  flood (global-limit test) **last**, since it drains the global window.

## Architecture (quick reminder)

Controllers never talk to Prisma; use-cases never talk to HTTP; dependencies
always flow through an **interface** injected by a **factory**. Cross-cutting
state (token denylist, login lockout, verified cache, password-changed
registry) lives behind an async seam so it can be swapped for Redis without
touching call sites. Full details in `PROJECT.md`.
