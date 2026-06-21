# HANDOFF — solid_api_sample

_Atualizado: 2026-06-21 @ 1e161d7 (branch master) — CORS preflight ENTREGUE + sincronizado p/ monorepo/api._

## Resume prompt (cole em qualquer sessão / modelo)

> Leia este HANDOFF.md + CLAUDE.md e continue a partir de "Estado atual". Honre as regras
> do CLAUDE.md (branch por tarefa, commit por fase com gate verde, docs nas 4 línguas).
> Confirme antes de qualquer ação irreversível. **Nunca dê push.** Pergunte UMA coisa por
> vez (sem caixas), em pt-BR. Caveman mode on (terse; código/commits/segurança normais).
>
> **Sem trabalho em aberto** — última entrega mergeada em `master` (local, **2 commits à
> frente do origin, aguardando push do usuário**). Aguarde a próxima tarefa.

## Estado atual

- Branch / commit: `master` @ `1e161d7` (2026-06-21); árvore limpa; **ahead 2 do origin
  (NÃO pushado — push é do usuário)**.
- **Última entrega (CORS preflight):** `@fastify/cors` registrava sem `methods` e caía no
  default `GET,HEAD,POST` → browser abortava todo `PATCH`/`PUT`/`DELETE` no preflight
  (server respondia OPTIONS 204; quem bloqueava era o browser). Quebrava `PATCH /check-ins/
:id/validate` e `PATCH /auth/refresh`. Fix: `methods` explícito (`GET,HEAD,POST,PUT,PATCH,
DELETE`) em `app.ts`. Gate verde (**93 unit / 59 e2e**, +1 e2e de preflight), **prova ao
  vivo** (Allow-Methods com PATCH). Docs: PROJECT §segurança (EN+PT). Branch
  `fix/cors-allow-methods` mergeada (FF) + apagada.
- **Entrega anterior (check-ins 4xx):** os 3 erros de domínio dos check-ins retornam **4xx**
  via `instanceof` no controller: `MaxDistanceError`→`400`, `MaxCheckInsReachedError`→`409`,
  `LateCheckInValidationError`→`409`. Docs README smoke + PROJECT §4.3.
- **Entrega anterior (RBAC + env):** autorização lê o **papel do banco**, não do claim do JWT
  (`verifyUserRole` consulta o DB; demote/promote vale na hora) · refresh assina `role` fresco do
  DB · `DATABASE_URL` validado pelo Zod.
- **Trade-off documentado (aceito):** `POST /auth/me/email` → `409` p/ e-mail já cadastrado =
  oráculo de enumeração autenticado (low); mantido por UX (PROJECT §5.4).
- **Cópia p/ monorepo:** `~/_Dev/samples/monorepo_sample/api` sincronizada @ `1e161d7` (código +
  PROJECT/README). Lá `HANDOFF`/`CLAUDE`/`AGENTS` são versões próprias (contexto monorepo) — **não**
  se sobrescrevem com as daqui; só código+docs migram. O front virá em `monorepo_sample/web` (sessão separada).
- **Próximo passo:** nenhum pendente (usuário ainda vai pushar os 2 commits).

## Como trabalhamos (regras)

Doutrina completa: **`CLAUDE.md`** (branch / commit / merge / push / docs nas 4 línguas).
Guardrails que NÃO podem falhar: **nunca push** (é do usuário) · **nunca commit sem aprovação**
· **gate verde** antes de cada commit · **PLAN.md nunca commitado** (gitignored).

## Memória profunda

Harness memory (só Claude / mesma máquina):
`~/.claude/projects/-home-user--Dev-samples-solid-api-sample/memory/`
Cobre: smoke de rotas (rate-limit / parar server por porta / zsh sem word-split + UUID), gate de
format pré-commit, reset/migrate Prisma, idioma pt-BR, revisar docs+rotas no fim, **não usar AskUserQuestion**.
