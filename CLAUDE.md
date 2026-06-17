# CLAUDE.md — How to work on this repo

Instructions for AI assistants (and humans) contributing to this project.
Architecture lives in [PROJECT.md](PROJECT.md) / [PROJECT-pt-BR.md](PROJECT-pt-BR.md);
this file is about **process**.

## Before you start — approval & planning

- **Do not execute, edit, or commit anything until the user explicitly says
  so.** Discuss first; act only on an explicit go-ahead.
- For any non-trivial work, **clarify every open question first**. Only once all
  doubts are resolved, write a **`PLAN.md`** at the repo root (groups, phase
  commits, gates, docs, final verification).
- After writing `PLAN.md`, **offer `/checkpoint`** to emit the resume prompt — a
  self-contained prompt (it folds in the plan's remaining steps) so the user can
  compact the current session and paste it into a fresh one. The `checkpoint`
  skill owns resume-prompt generation; don't hand-roll one here.
- **`PLAN.md` is NEVER committed.** It is in `.gitignore` and must stay there —
  it is a local working document. Delete it (`rm PLAN.md`) only after every plan
  item is verified.

## Golden workflow (every change) — local, no PR

This is a sample/reference project: keep it simple. Work on a **local branch**,
commit per phase, and let the user own the merge and the push. **No pull
requests, no GitHub merge step.**

1. **Local branch per task**, off `master`. **Never commit code directly to
   `master`** — always branch first. Branches stay local until the user pushes.
   - **Exception — docs-only changes** (`README*`, `PROJECT*`, `CLAUDE.md`, with
     **no code**) may be committed **straight to `master`**, no branch. The
     push is still the user's.
2. **Commit per phase** — one commit per finished, coherent step (a phase commit),
   created **right after its gate passes**. Conventional Commits. Never batch
   unrelated work into one commit; never leave a finished phase uncommitted.
3. **Gate before every commit** (must be green):
   ```sh
   pnpm lint && pnpm compile && pnpm test
   ```
   Changes that touch HTTP/routes also run the e2e suite (MySQL up:
   `pnpm compose:up`):
   ```sh
   pnpm test:e2e
   ```
4. **When the task is done, STOP and wait for the user.** The user tests the
   branch (and, for route-adding changes, runs the clean-DB walkthrough below).
   - The user **explicitly authorizes the merge**; only then merge the branch
     into `master` **locally** (`git checkout master && git merge <branch>`).
   - **Only the user pushes.** Never run `git push`. After the user pushes and
     confirms, delete the local branch (`git branch -d <branch>`).

> `master` is no longer protected on GitHub, so the user can push it directly.
> CI still runs on push — keep the gate green locally so push stays clean.

## Commit messages

Conventional Commits, matching the change: `fix(scope): …`, `feat(auth): …`,
`test: …`, `docs: …`, `ci: …`, `chore: …`. Intermediate fixes found mid-group
get their own `fix(scope): …` phase commit. End every commit with:

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

**Always finish with a docs review.** At the very end of every task — before
declaring it done — re-read `README` + `PROJECT` (both languages) and confirm
they still match the code you touched: routes table, env table, features,
models, the folder tree (`PROJECT` §3), the request-lifecycle file references
(§4.x), and the README curl smoke block. Structural changes (renamed/moved/
added routes or folders, renamed files) are the usual source of doc drift and
are easy to miss mid-task — this final pass exists to catch them.

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
