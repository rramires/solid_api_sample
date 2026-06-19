# HANDOFF — solid_api_sample

_Atualizado: 2026-06-19 @ 5384feb (branch master) — feature `account-management` ENTREGUE._

## Resume prompt (cole em qualquer sessão / modelo)

> Leia este HANDOFF.md + CLAUDE.md e continue a partir de "Estado atual". Honre as regras
> do CLAUDE.md (branch por tarefa, commit por fase com gate verde, docs nas 4 línguas).
> Confirme antes de qualquer ação irreversível. **Nunca dê push.** Pergunte UMA coisa por
> vez (sem caixas), em pt-BR. Caveman mode on (terse; código/commits/segurança normais).
>
> **Sem trabalho em aberto** — a última entrega já está em `master` e pushada. Aguarde a
> próxima tarefa.

## Estado atual

- Branch / commit: `master` @ `5384feb` (2026-06-19); árvore limpa; **à frente do `origin`** (push pendente do usuário).
- **Entregue** (mergeado FF + pushado; branch `feat/account-management` apagada): rotas de
  gestão de conta + edição.
    - `PATCH /gyms/:gymId` — admin edita academia (title/description/phone).
    - `PATCH /auth/me` — self edita o próprio username.
    - `GET /users` + `PATCH /users/:userId` — admin lista/edita usuários.
    - `POST /auth/me/email` + `POST /auth/me/email/confirm` + `GET /users/confirm-email-change`
      — self troca de e-mail (**pattern A**: confirma no novo, alerta no antigo; só troca após
      confirmar). Admin trocar e-mail de alguém → `is_verified=false` + reset ao novo endereço.
    - Migration `add_email_changes` (model `EmailChange`).
    - Verificação: gate verde (unit 93 + e2e 53), coverage 88% linhas / 92% funcs, **smoke
      manual de TODAS as rotas** (incl. nearby) passou em DB limpa. Docs nas 4 línguas
      (README + PROJECT) atualizadas e auditadas (rotas/matriz/árvore/models coerentes).
- **Dev tooling** (commits `acf8139` + `5384feb`): `pnpm db:fresh` (zera + recria o banco:
  compose down/up `--wait` + migrate deploy + seed) · `pnpm killapp` (libera 3333/5555 + mata
  server) · healthcheck no MySQL (compose). Seed renomeado: script `seed-adm-role` → **`seeddb`**,
  arquivo `prisma/seed-adm-role.ts` → **`prisma/seed.ts`**.
- **Próximo passo:** nenhum pendente.

## Threads abertas

- **Front (outra sessão):** referência consolidada de rotas já entregue (todas, incl.
  `/gyms/nearby` com geolocation do navegador). Backend em `613e324`.
- **DB dev:** limpo + seedado (`admin@example.com`, `is_verified=true`).

## Como trabalhamos (regras)

Doutrina completa: **`CLAUDE.md`** (branch / commit / merge / push / docs nas 4 línguas).
Guardrails que NÃO podem falhar: **nunca push** (é do usuário) · **nunca commit sem aprovação**
· **gate verde** antes de cada commit · **PLAN.md nunca commitado** (gitignored).

## Memória profunda

Harness memory (só Claude / mesma máquina):
`~/.claude/projects/-home-user--Dev-samples-solid-api-sample/memory/`
Cobre: smoke de rotas (rate-limit / parar server por porta), gate de format pré-commit,
reset/migrate Prisma, idioma pt-BR, revisar docs+rotas no fim, **não usar AskUserQuestion**.
