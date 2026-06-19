# HANDOFF — solid_api_sample

_Atualizado: 2026-06-19 @ 7c5e23c (branch master)_

## Resume prompt (cole em qualquer sessão / modelo)

> Leia este HANDOFF.md + CLAUDE.md e continue a partir de "Estado atual".
> Honre as regras do CLAUDE.md. Confirme antes de qualquer ação irreversível. Nunca dê push.

## Estado atual

- Branch / commit: `master` @ `7c5e23c` (2026-06-19); árvore limpa.
- `master` já **pushado** pelo usuário (`origin/master` em sync). Em andamento: **nada**.
- Próximo passo: aguardando próxima tarefa.
- Feature `auth-me-is-verified` **concluída, mergeada (FF) e no remoto**:
  - `GET /auth/me` retorna `is_verified` **e** `role`, lidos **fresh do banco** — front usa
    p/ banner "verifique e-mail" + UI de RBAC.
  - Docs do gate `REQUIRE_EMAIL_VERIFICATION` (matriz de rotas + smoke) no README + PROJECT
    (pt-BR e en). Gate trava **só** `POST /gyms/:gymId/check-ins`.
  - Comentário do `APP_URL` no `.env.example` (prefixa links de verify **e** reset).
  - Verificado: gate verde (lint + compile + unit 61 + e2e 30) + smoke manual dos 2 estados
    da flag.
- Branch local apagada. **Pendência opcional (push do usuário):** a branch remota
  `origin/feat/auth-me-is-verified` ainda existe — `git push origin --delete feat/auth-me-is-verified`.

## Threads abertas

- **`.env` local:** `APP_URL=http://localhost:3001` (gitignored, não commitado). Aponta os
  links de e-mail pro front. **Reinicie o server** p/ aplicar. `.env.example` mantém `:3333`.
- **Frontend (outra sessão):** páginas de verify-email + reset-password (link **e** OTP). O
  SPA precisa de 2 rotas públicas com paths **exatos**: `/users/verify-email` e
  `/users/reset-password`. Reset **exige** rota no front (backend não tem GET de reset).
- **Smoke do reset (opcional, não rodado):** forgot-password → pega OTP no console →
  reset-password → confirmar logout global (`password_changed_at`).
- **DB dev:** users de smoke removidos. Sobrou só `admin`. `mary_jane` foi apagada (pelo
  usuário, no Workbench) — não é seedada; recriar via `POST /users` se quiser.

## Como trabalhamos (regras)

Doutrina completa: ver **`CLAUDE.md`** (governa branch / commit / merge / push).
Guardrails que NÃO podem falhar: **nunca push** (é do usuário) · **nunca commit sem
aprovação** · **gate verde** (`pnpm lint && pnpm compile && pnpm test`; e2e p/ rotas) antes
de cada commit.

## Memória profunda

Harness memory (só Claude / mesma máquina):
`~/.claude/projects/-home-user--Dev-samples-solid-api-sample/memory/`
Cobre: smoke de rotas (rate-limit / tsx-watch / parar server por porta), gate de format
pré-commit, reset/migrate Prisma, idioma pt-BR, revisar docs + rotas no fim de cada tarefa.
