# HANDOFF — solid_api_sample

_Atualizado: 2026-06-19 @ 6e0634b (branch master) — antes de iniciar `feat/account-management`_

## Resume prompt (cole em qualquer sessão / modelo)

> Leia este HANDOFF.md + CLAUDE.md e **execute o plano abaixo** a partir de "Estado atual".
> Honre as regras do CLAUDE.md (branch por tarefa, commit por fase com gate verde, docs nas 4
> línguas). Confirme antes de qualquer ação irreversível. **Nunca dê push.** Pergunte UMA coisa
> por vez (sem caixas), em pt-BR. Caveman mode on (terse; código/commits/segurança normais).
>
> **PLANO — rotas de edição (admin + self) + edição de gym.** Branch `feat/account-management`
> off master. 1 commit por fase, gate (`pnpm lint && pnpm compile && pnpm test`; +`pnpm test:e2e`
> p/ rotas) verde antes de cada commit. (PLAN.md local detalha; é gitignored — estes passos são
> a cópia portável.)
>
> - **F1 `PATCH /gyms/:gymId`** (JWT+ADMIN) edita `{title?,description?,phone?}` (≥1). Repo
>   `gymsRepository.update`; `UpdateGymUseCase` (findById→404); controller refine ≥1 campo; 200.
> - **F2 `PATCH /auth/me`** (JWT self) `{username}` `.strict()`. Estende `usersRepository.update`
>   com `username?`; `UpdateProfileUseCase` (unicidade `findByUsername` excl. próprio→409, sem
>   lowercase); 200 `{user:{id,username,is_verified,role}}`.
> - **F3 `GET /users?page=`** (JWT+ADMIN) lista `PublicUser[]`. `usersRepository.findMany(page)`
>   (take20/skip, sem password_hash); `FetchUsersUseCase`.
> - **F4 `PATCH /users/:userId`** (JWT+ADMIN) `{username?,email?,role?,is_verified?}` `.strict()`
>   refine ≥1 e refine `!(email && is_verified===true)`→400. Estende update com `email?,role?`.
>   Regras: troca email→`is_verified=false`+cria password_reset+`sendPasswordResetEmail` ao NOVO
>   (inline, sem cooldown); `target==actor && role==MEMBER`→**400** `CannotChangeOwnRoleError`
>   (garante ≥1 admin); muda email/is_verified→`verifiedCache.invalidate(target)`. 404/409.
> - **F5 self email change pattern A** (migration). Model Prisma `EmailChange` (espelha
>   `EmailVerification`: new_email, link_token @unique, otp_code, attempts, expires_at, used_at;
>   onDelete Cascade) + back-ref em User. `migrate dev --name add_email_changes` → **recriar
>   barrel** `src/prisma-client/index.ts` (`export * from './client.js'`). Repo
>   `IEmailChangeRepository` (espelha verification). `IEmailProvider`:
>   `sendEmailChangeConfirmation` (ao NOVO) + `sendEmailChangeAlert` (ao ANTIGO, anti-sequestro).
>   `RequestEmailChangeUseCase` (≠atual, unicidade→409, cooldown, envia confirm+alerta);
>   `ConfirmEmailChangeUseCase` (link/OTP, recheca unicidade no confirm→409, swap email +
>   `is_verified=true` pois clique=prova). Rotas: `POST /auth/me/email` (JWT),
>   `POST /auth/me/email/confirm` (JWT, OTP), `GET /users/confirm-email-change?token=` (público).
> - **F6 docs** README+README-pt-BR+PROJECT+PROJECT-pt-BR (tabela rotas, matriz acesso, smoke
>   curl, notas arquitetura) + `prettier --check`.
> - **F7 smoke manual DB-limpa** (compose down/up, migrate deploy, seed-adm-role, dev, curl 1-a-1
>   conferindo status; mind rate limits) + montar **referência de rotas pro front** (todas, incl.
>   nearby c/ geolocation lat/long). STOP → usuário testa/autoriza merge → merge FF local →
>   usuário pusha → apaga branch.
>
> Cada fase: unit (in-memory repos) + e2e (`createAndAuthUser(app,true)` p/ admin). Erros↦HTTP:
> UserAlreadyExists→409, ResourceNotFound→404, Zod→400. Coverage ≥80. No fim: `rm PLAN.md`.

## Estado atual

- Branch / commit: `master` @ `6e0634b` (2026-06-19); árvore limpa. (master pode estar 1 à
  frente de origin se o push do 6e0634b ainda não saiu — é do usuário.)
- **Em andamento:** PLAN.md aprovado (3 confirmações fechadas: paths email-change · self-demote
  400 · alerta email antigo INCLUÍDO). **Próximo passo:** Fase 0 — criar branch
  `feat/account-management` e executar F1→F7.
- Decisões travadas: ver resume prompt acima. Detalhe completo em `PLAN.md` (gitignored, local).

## Threads abertas

- **`.env` local:** `APP_URL=http://localhost:3001` (gitignored). Liga os links de email ao front.
- **Front (outra sessão):** aguarda a **referência de rotas** que sai na F7 (todas, incl. nearby).
- **DB dev:** só `admin` seedado (is_verified=true). `mary_jane` não existe (apagada no Workbench).

## Como trabalhamos (regras)

Doutrina completa: **`CLAUDE.md`** (branch / commit / merge / push / docs nas 4 línguas).
Guardrails que NÃO podem falhar: **nunca push** (é do usuário) · **nunca commit sem aprovação** ·
**gate verde** antes de cada commit · **PLAN.md nunca commitado** (gitignored).

## Memória profunda

Harness memory (só Claude / mesma máquina):
`~/.claude/projects/-home-user--Dev-samples-solid-api-sample/memory/`
Cobre: smoke de rotas (rate-limit / parar server por porta), gate de format pré-commit,
reset/migrate Prisma, idioma pt-BR, revisar docs+rotas no fim, **não usar AskUserQuestion**.
