# HANDOFF — solid_api_sample

_Atualizado: 2026-06-21 @ a8af349 (branch master) — GET /users/:userId + fix(env) ENTREGUE + sincronizado p/ monorepo/api._

## Resume prompt (cole em qualquer sessão / modelo)

> Leia este HANDOFF.md + CLAUDE.md e continue a partir de "Estado atual". Honre as regras
> do CLAUDE.md (branch por tarefa, commit por fase com gate verde, docs nas 4 línguas).
> Confirme antes de qualquer ação irreversível. **Nunca dê push.** Pergunte UMA coisa por
> vez (sem caixas), em pt-BR. Caveman mode on (terse; código/commits/segurança normais).
>
> **Sem trabalho em aberto.** ⚠️ `origin/master` está em `b9d7d50`; os commits da última
> entrega (GET /users/:userId + fix(env) + refresh deste HANDOFF) estão **só locais —
> push pendente do usuário**. Aguarde a próxima tarefa.

## Estado atual

- Branch / commit: `master` @ `a8af349` (2026-06-21); árvore limpa.
- **Push pendente:** `origin/master` @ `b9d7d50`; tudo desde então (feature GET /users +
  fix env + este refresh) **NÃO pushado** — push é do usuário.
- **Última entrega (GET /users/:userId — admin):** busca 1 usuário por id; `200 { user: PublicUser }`
  com serialização byte-idêntica ao item do `GET /users` (novo `findPublicById` no repo reusa
  `PUBLIC_USER_SELECT`; `password_hash` nunca lido do banco) · `404 "Resource not found."` ·
  `400 "Validation error."` (id não-uuid) · `403`/`401` do middleware. Camadas: repo →
  `GetUserUseCase` → factory → controller fino. Junto veio **`fix(env)`**: `REQUIRE_EMAIL_VERIFICATION`
  era `z.coerce.boolean()` → `"false"` virava `true`; trocado por `z.enum(['true','false']).transform(...)`.
  Gate verde (**95 unit / 63 e2e**), **smoke 5/5** em DB limpa. Docs 4 línguas (rotas + controller-map
    - RBAC + árvore §3 + smoke 13b).
- **Entrega anterior (CORS preflight):** `methods` explícito no `@fastify/cors` (`app.ts`) — o
  default `GET,HEAD,POST` bloqueava `PATCH`/`PUT`/`DELETE` no preflight do browser.
- **Entregas anteriores:** check-ins 4xx (3 erros de domínio → 4xx via `instanceof`) · RBAC lê
  papel do **banco** (não do JWT).
- **Trade-off documentado (aceito):** `POST /auth/me/email` → `409` p/ e-mail já cadastrado =
  oráculo de enumeração autenticado (low); mantido por UX (PROJECT §5.4).
- **Cópia p/ monorepo:** `~/_Dev/samples/monorepo_sample/api` sincronizada @ `a8af349` (código +
  PROJECT/README; parity verificada). Lá `HANDOFF`/`CLAUDE`/`AGENTS` são versões próprias —
  **não** se sobrescrevem; só código+docs migram. Front virá em `monorepo_sample/web` (sessão separada).
- **Próximo passo:** usuário **pushar** os commits locais; avisar o front pra dar pull.

## Como trabalhamos (regras)

Doutrina completa: **`CLAUDE.md`** (branch / commit / merge / push / docs nas 4 línguas).
Guardrails que NÃO podem falhar: **nunca push** (é do usuário) · **nunca commit sem aprovação**
· **gate verde** antes de cada commit · **PLAN.md nunca commitado** (gitignored).

## Memória profunda

Harness memory (só Claude / mesma máquina):
`~/.claude/projects/-home-user--Dev-samples-solid-api-sample/memory/`
Cobre: smoke de rotas (rate-limit / parar server por porta / zsh sem word-split + UUID), gate de
format pré-commit, reset/migrate Prisma, idioma pt-BR, revisar docs+rotas no fim, **não usar AskUserQuestion**.
