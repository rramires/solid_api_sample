# HANDOFF — solid_api_sample

_Atualizado: 2026-06-20 @ bbde272 (branch master) — RBAC autorizado pelo banco ENTREGUE._

## Resume prompt (cole em qualquer sessão / modelo)

> Leia este HANDOFF.md + CLAUDE.md e continue a partir de "Estado atual". Honre as regras
> do CLAUDE.md (branch por tarefa, commit por fase com gate verde, docs nas 4 línguas).
> Confirme antes de qualquer ação irreversível. **Nunca dê push.** Pergunte UMA coisa por
> vez (sem caixas), em pt-BR. Caveman mode on (terse; código/commits/segurança normais).
>
> **Sem trabalho em aberto** — a última entrega já está em `master` e pushada. Aguarde a
> próxima tarefa.

## Estado atual

- Branch / commit: `master` @ `bbde272` (2026-06-20); árvore limpa; origin em dia (pushado).
- **Entregue** (mergeado FF + pushado; branch `fix/rbac-role-from-db` apagada): autorização
  RBAC pelo **banco**, não pelo claim do JWT.
    - `verifyUserRole` lê o `role` do DB (por `request.user.sub`) → demote/promote vale no
      próximo request; o claim assinado nunca é confiado p/ autorização.
    - `refreshController` assina `role` **fresco do DB** (login e refresh consistentes).
    - `DATABASE_URL` agora validado pelo Zod (`src/env/index.ts`); `prisma.ts` lê `env.DATABASE_URL`.
    - Verificação: gate verde (**unit 93 + e2e 55**), **smoke manual 29/29** em DB limpa
      (incl. a prova: token de member promovido cria gym → 201). Docs nas 4 línguas atualizadas.
- **Trade-off documentado (aceito):** `POST /auth/me/email` retorna `409` p/ e-mail já
  cadastrado = oráculo de enumeração **autenticado** (low); mantido por UX, documentado em PROJECT §5.4.
- **Cópia p/ monorepo:** backend copiado p/ `~/_Dev/samples/monorepo_sample/api` (sem
  `.git`/`node_modules`; com `.env`/`.env.example`/`prisma-client`; HANDOFF/AGENTS/CLAUDE
  adaptados + memória destilada). O front virá em `monorepo_sample/web` numa entrega separada.
- **Próximo passo:** nenhum pendente.

## Como trabalhamos (regras)

Doutrina completa: **`CLAUDE.md`** (branch / commit / merge / push / docs nas 4 línguas).
Guardrails que NÃO podem falhar: **nunca push** (é do usuário) · **nunca commit sem aprovação**
· **gate verde** antes de cada commit · **PLAN.md nunca commitado** (gitignored).

## Memória profunda

Harness memory (só Claude / mesma máquina):
`~/.claude/projects/-home-user--Dev-samples-solid-api-sample/memory/`
Cobre: smoke de rotas (rate-limit / parar server por porta / zsh UUID), gate de format
pré-commit, reset/migrate Prisma, idioma pt-BR, revisar docs+rotas no fim, **não usar AskUserQuestion**.
