# solid_api_sample

GymPass style API built with SOLID principles.

**Stack:** Node.js · Fastify · TypeScript 6 · Prisma 7 · MySQL · Vitest

## Setup

```sh
pnpm install
pnpm compose:up       # start MySQL in Docker
pnpm migrate          # run migrations
pnpm dev              # start dev server
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with hot-reload |
| `pnpm build` | Production build (tsup) |
| `pnpm start` | Run production build |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | E2E tests (requires MySQL) |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix lint errors |
| `pnpm compile` | TypeScript type-check |
