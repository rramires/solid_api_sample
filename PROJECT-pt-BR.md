# PROJECT.md — Arquitetura de Referência (Backend)

> Documento de referência da arquitetura deste projeto-exemplo. Serve como
> **blueprint** para iniciar novos backends maiores, reutilizando a mesma
> estrutura, os mesmos princípios (SOLID + Clean Architecture leve) e as mesmas
> práticas de segurança. Escrito para ser entendido tanto por **humanos** quanto
> por **IAs** que vão replicar o padrão.

> 🇺🇸 English version: [PROJECT.md](PROJECT.md)

---

## 1. Visão Geral

API estilo "GymPass" (academias, check-ins e usuários) construída com foco em
**SOLID**, **separação de camadas** e **inversão de dependência**. O domínio é
secundário — o que importa aqui é a **arquitetura replicável**.

### Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime | Node.js | 24 |
| HTTP Framework | Fastify | 5.8.5 |
| Linguagem | TypeScript | 6.0.3 |
| ORM | Prisma | 7.8.0 |
| Driver Adapter | `@prisma/adapter-mariadb` | 7.8.0 |
| Banco | MySQL | 8 |
| Validação | Zod | 4.4.3 |
| Auth | `@fastify/jwt` + `@fastify/cookie` | 10.1 / 11.0 |
| Hash | bcryptjs (12 rounds) | 3.0.3 |
| Headers de segurança | `@fastify/helmet` | 13.0.2 |
| CORS | `@fastify/cors` | 11.2 |
| Rate limit | `@fastify/rate-limit` | 10.3 |
| Logs | pino (via Fastify) + pino-pretty | — |
| Datas | dayjs | 1.11 |
| Testes | Vitest | 4.1.8 |
| Lint/Format | ESLint 10 (flat) + Prettier 3.8 | — |
| Build prod | tsup | 8.5.1 |
| Package manager | pnpm | 11.5.2 |

---

## 2. Princípios Arquiteturais

A arquitetura segue uma divisão em **4 camadas** com dependências apontando
sempre **para dentro** (regra de dependência da Clean Architecture):

```
HTTP (Controllers/Routes)  ->  Use Cases (regras de negócio)
        |                              |
        v                              v
   Validação (Zod)            Repositories (interfaces)
                                       |
                              +--------+--------+
                              |                 |
                        Prisma (prod)     In-Memory (testes)
```

Princípios SOLID aplicados:

- **S (Single Responsibility):** cada *use-case* faz **uma** operação de negócio.
  Cada *controller* só traduz HTTP ↔ use-case.
- **O (Open/Closed):** novos repositórios/implementações entram sem alterar o
  use-case (ele depende da interface).
- **L (Liskov):** `InMemory*Repository` e `Prisma*Repository` são intercambiáveis
  porque honram o mesmo contrato.
- **I (Interface Segregation):** interfaces de repositório pequenas e específicas
  (`IUsersRepository`, `IGymsRepository`, `ICheckInsRepository`).
- **D (Dependency Inversion):** use-cases recebem **interfaces** no construtor; as
  *factories* injetam a implementação concreta (Prisma).

---

## 3. Estrutura de Pastas

```
src/
├── app.ts                  # Composição do Fastify: plugins, rotas, error handler, hook onClose
├── server.ts               # Bootstrap + graceful shutdown (SIGTERM/SIGINT) + load da denylist
├── @types/
│   └── fastify-jwt.d.ts     # Augmentation do payload JWT (request.user = { sub, role, jti, exp })
├── env/
│   └── index.ts             # Validação das env vars com Zod (falha rápido no boot)
├── lib/
│   ├── prisma.ts            # Singleton do PrismaClient + driver adapter MySQL
│   ├── report-error.ts      # Seam de report de erro (porta única p/ Sentry/Datadog)
│   └── token-denylist.ts    # Singleton da denylist de tokens revogados (híbrida RAM+DB)
├── prisma-client/           # CLIENTE GERADO pelo Prisma 7 (output custom)
├── http/
│   ├── controllers/
│   │   ├── users/           # rotas + controllers de usuário/sessão
│   │   ├── gyms/            # rotas + controllers de academias
│   │   └── check-ins/       # rotas + controllers de check-ins
│   └── middlewares/
│       ├── verify-jwt-middleware.ts   # autenticação + checagem na denylist
│       ├── verify-user-role.ts        # autorização (RBAC; 403 se papel errado)
│       └── rate-limit.ts              # limite estrito p/ rotas de auth
├── use-cases/
│   ├── *-use-case.ts        # regras de negócio puras (sem HTTP, sem Prisma direto)
│   ├── *.spec.ts            # testes unitários (usam repos in-memory)
│   ├── errors/             # erros de domínio tipados
│   └── factories/          # montam use-case + repositório concreto (DI manual)
├── repositories/
│   ├── i-*-repository.ts    # CONTRATOS (interfaces)
│   ├── i-token-denylist.ts  # contrato da denylist (assíncrono → trocável por Redis)
│   ├── prisma/             # implementações de produção (inclui denylist híbrida RAM+DB)
│   └── in-memory/          # implementações para teste unitário
└── utils/
    └── get-distance-between-coordinates.ts   # haversine (regra geográfica)
```

### Convenção de nomes

- Interfaces de repositório: prefixo `i-` no arquivo, `I` no tipo.
- Use-cases: `<acao>-use-case.ts` exportando a classe `<Acao>UseCase`.
- Factories: `make-<acao>-use-case.ts` exportando `make<Acao>UseCase()`.
- Controllers: `<acao>-controller.ts` exportando `<acao>Controller`.
- Erros de domínio: classes que estendem `Error` em `use-cases/errors/`.

---

## 4. Caminho Completo de uma Requisição

Exemplo: **`POST /sessions`** (login) e **`POST /gyms/:gymId/check-ins`** (rota protegida).

### 4.1 Fluxo geral (todas as rotas)

```
1. Cliente HTTP
        │
2. Fastify recebe a request
        │
3. Plugins globais (app.ts), nesta ordem:
     • @fastify/helmet      → injeta headers de segurança
     • @fastify/cors        → política de origem por ambiente (credentials:true)
     • @fastify/rate-limit  → limite global por IP (100/min)
     • @fastify/jwt         → habilita request.jwtVerify / reply.jwtSign
     • @fastify/cookie      → parsing de cookies (refreshToken)
        │
4. Hooks `onRequest` da rota (se houver):
     • strictAuthLimit(app)          → rate limit estrito (5/min) em /users e /sessions
     • verifyJwtMiddleware           → autenticação (401 se inválido ou revogado)
     • verifyUserRole(Role.ADMIN)    → autorização (403 se papel errado)
        │
5. Controller:
     • Valida params/body/query com Zod  (ZodError → 400 no error handler)
     • Lê dados autenticados em request.user ({ sub, role })
     • Chama a factory → make<Acao>UseCase()
        │
6. Use-case (regra de negócio):
     • Orquestra repositórios via INTERFACE
     • Aplica regras (distância, duplicidade, prazos…)
     • Lança erros de domínio tipados quando regra falha
        │
7. Repositório (Prisma):
     • Executa a query no MySQL via driver adapter
        │
8. Resposta volta: controller traduz resultado/erro → status HTTP
        │
9. setErrorHandler global (app.ts):
     • ZodError              → 400 + issues (enxutas em produção; format() só em dev)
     • Erro não tratado      → 500 (request.log.error em dev; reportError() em prod)
```

### 4.2 Exemplo detalhado — `POST /sessions` (público)

1. **Rota** (`users/routes.ts`): `app.post('/sessions', authenticateController)` — sem hook de auth.
2. **Controller** (`authenticate-controller.ts`):
   - Valida `{ email, password }` com Zod (`email()`, `min(6)`).
   - `makeAuthenticateUseCase()` → `AuthenticateUseCase` + `PrismaUsersRepository`.
3. **Use-case** (`authenticate-use-case.ts`):
   - `findByEmail` → se não existir, lança `InvalidCredentialsError`.
   - `bcrypt.compare(password, hash)` → se não bater, mesmo erro genérico.
4. **Emissão de tokens** (de volta no controller):
   - `token` (access): payload `{ role, jti }`, `sub = user.id`, **expira em 4h**.
   - `refreshToken`: payload `{ role, jti }`, `sub`, **expira em 7d**.
   - cada token recebe um `jti` (`randomUUID()`) que habilita a revogação (denylist).
   - `refreshToken` é gravado em **cookie** `httpOnly + secure + sameSite`.
   - `token` (access) volta no **corpo** da resposta.
5. **Erros**: `InvalidCredentialsError` → `401`; demais → re-lançados → `500`.

### 4.3 Exemplo detalhado — `POST /gyms/:gymId/check-ins` (protegido)

1. **Rota** (`check-ins/routes.ts`): grupo inteiro tem `app.addHook('onRequest', verifyJwtMiddleware)`.
2. **`verifyJwtMiddleware`**: `request.jwtVerify()` valida o Bearer token; popula `request.user = { sub, role }`. Falha → `401`.
3. **Controller** (`check-in-controller.ts`):
   - Lê `userId = request.user.sub` (vem do token, **não** do cliente).
   - Valida `gymId` (uuid) nos params e `latitude/longitude` no body.
4. **Use-case** (`check-in-use-case.ts`) aplica as regras de negócio:
   - Academia existe? senão `ResourceNotFoundError`.
   - Usuário está a ≤ **100 m** da academia (haversine)? senão `MaxDistanceError`.
   - Já existe check-in **no mesmo dia**? então `MaxCheckInsReachedError`.
   - Caso ok → cria o check-in.
5. Resposta `201` com o check-in criado.

---

## 5. Modelo de Segurança

### 5.1 Autenticação (quem é o usuário)

- **JWT stateless** via `@fastify/jwt`. Segredo em `JWT_SECRET` (mín. 20 chars,
  validado no boot pelo Zod).
- **Access token**: 4h, enviado no header `Authorization: Bearer <token>`.
- **Refresh token**: 7d, em **cookie** `httpOnly`, `secure`, `sameSite`,
  `signed:false` (é um JWT, já autovalidável).
- `request.jwtVerify()` decodifica e valida assinatura/expiração; o payload
  tipado (`@types/fastify-jwt.d.ts`) garante `request.user = { sub, role }`.
- **`PATCH /token/refresh`**: usa `jwtVerify({ onlyCookie: true })` e **rotaciona**
  ambos os tokens (emite novos access + refresh).
- **`jti` + denylist**: todo token carrega um `jti`. **`POST /logout`** registra o
  `jti` atual na denylist (até o `exp`) e limpa o cookie; o `verifyJwtMiddleware`
  rejeita (`401`) qualquer token revogado. Detalhes na §5.5.

### 5.2 Autorização (o que o usuário pode fazer) — RBAC

- Papéis no enum `Role`: `MEMBER` (padrão) e `ADMIN`.
- `verifyUserRole(role)` é um *middleware factory* que compara `request.user.role`
  com o papel exigido. Usado nas rotas administrativas.
- **Por que `403` e não `401`:** o usuário está **autenticado** (token válido), mas
  **sem permissão** → `403 Forbidden`. O `401 Unauthorized` fica reservado para
  falha de **autenticação** (token ausente/inválido/revogado). Misturar os dois
  mascara a causa real do erro para o cliente.

### 5.3 Mapa de rotas × proteção

| Método | Rota | Auth (JWT) | Papel exigido | Observação |
|--------|------|:---------:|:-------------:|------------|
| GET | `/hello` | ❌ | — | health/teste |
| POST | `/users` | ❌ | — | registro (público) |
| POST | `/sessions` | ❌ | — | login |
| PATCH | `/token/refresh` | cookie | — | rotação de token |
| GET | `/me` | ✅ | — | perfil próprio |
| POST | `/logout` | ✅ | — | revoga o token atual (denylist) + limpa cookie |
| GET | `/gyms/search` | ✅ | — | busca por nome |
| GET | `/gyms/nearby` | ✅ | — | busca por proximidade |
| POST | `/gyms` | ✅ | **ADMIN** | cadastrar academia |
| GET | `/check-ins/history` | ✅ | — | histórico próprio |
| GET | `/check-ins/metrics` | ✅ | — | total próprio |
| POST | `/gyms/:gymId/check-ins` | ✅ | — | fazer check-in |
| PATCH | `/check-ins/:checkInId/validate` | ✅ | **ADMIN** | validar check-in |

> Padrão para proteger um grupo: `app.addHook('onRequest', verifyJwtMiddleware)`
> no início da função de rotas. Para exigir papel: adicionar
> `{ onRequest: [verifyUserRole(Role.ADMIN)] }` na rota específica.

### 5.4 Outras defesas presentes

- **Helmet** (headers de segurança) registrado globalmente.
- **bcrypt 12 rounds** para hash de senha.
- **SQL Injection mitigado**: o ORM parametriza tudo; a única query `$queryRaw`
  (`findManyNearby`) usa `Prisma.sql` com interpolação **parametrizada** (`${...}`),
  não concatenação de string.
- **Validação de entrada** com Zod em todo controller (body/params/query).
- **Erros de credencial genéricos** (`InvalidCredentialsError`) — não revelam se o
  e-mail existe.
- **`userId` sempre derivado do token** (`request.user.sub`), nunca do corpo da
  requisição → previne IDOR/spoofing de identidade.
- **Cookie `httpOnly`** → token de refresh não acessível via JavaScript (anti-XSS).
- **Rate limiting** (`@fastify/rate-limit`): limite global por IP (100/min) +
  limite estrito (5/min) em `/users` e `/sessions` via `strictAuthLimit` → mitiga
  brute-force de senha e abuso de cadastro/enumeração.
- **CORS por ambiente** (`@fastify/cors`) com `credentials:true` (necessário para
  o cookie de refresh). Em produção a origem vem de `CORS_ORIGIN` (allow-list); em
  dev é liberado. Nunca `origin:'*'` junto de credenciais.
- **Tempo de login uniforme (anti-enumeração):** o login **sempre** roda
  `bcrypt.compare` — contra um `DUMMY_HASH` fixo quando o e-mail não existe — para
  que o tempo de resposta não revele se a conta existe.
- **Política de senha configurável:** registro com
  `min(PASSWORD_MIN_LENGTH).max(72)` (72 = limite do bcrypt; evita DoS por string
  gigante). A senha do ADMIN exige complexidade (≥10, maiúscula, minúscula, número
  e especial).
- **`bodyLimit` configurável** (`BODY_LIMIT`, default 16 KB) limita o tamanho do
  corpo da request.

### 5.5 Revogação de token (denylist híbrida)

- **Contrato assíncrono** (`i-token-denylist.ts`: `isRevoked`, `revoke`, `load`) —
  deixado `async` de propósito para trocar a implementação por **Redis** sem tocar
  no middleware.
- **Implementação híbrida (RAM + DB), sem Redis:** leitura (`isRevoked`) só na RAM
  (~0 custo no hot path de toda request); `revoke` faz INSERT no banco **e**
  atualiza o `Map`; `load()` aquece a RAM a partir do banco no boot.
- **Limpeza periódica** (`setInterval(...).unref()`) remove entradas expiradas da
  RAM e do banco, mantendo a denylist limitada.
- **Fluxo:** `POST /logout` → `revoke(jti, exp)` → requests seguintes com aquele
  token são rejeitadas (`401`) no `verifyJwtMiddleware`.

---

## 6. Camada de Dados

### 6.1 Conexão (`src/lib/prisma.ts`)

- `PrismaClient` único (singleton de módulo) com **driver adapter** MySQL
  (`@prisma/adapter-mariadb`), `connectionLimit: 5`.
- A URL é lida de `process.env.DATABASE_URL` **em tempo de chamada** (`createAdapter()`),
  o que evita problemas de ordem de carregamento de env em workers de teste.
- `log: ['query']` apenas em `development`.

### 6.2 Prisma 7 — pontos de atenção

- O schema **não** contém `url` no `datasource`; a URL vem do `prisma.config.ts`
  (que faz `import 'dotenv/config'` e usa `env('DATABASE_URL')`).
- O cliente é gerado em `src/prisma-client/` (output custom).
- ⚠️ **`prisma generate` apaga `src/prisma-client/index.ts`.** É preciso recriá-lo
  com `export * from './client.js'` após cada geração (barrel manual).

### 6.3 Modelos

- `User` (id uuid, email único, password_hash, role, created_at) 1—N `CheckIn`.
- `Gym` (id uuid, title, latitude/longitude decimal) 1—N `CheckIn`.
- `CheckIn` (created_at, validated_at?) N—1 `User` e N—1 `Gym`.
- `RevokedToken` (`jti` PK, `expires_at`, `created_at`) — denylist persistida
  (tabela `revoked_tokens`).

### 6.4 Paginação

- Tamanho fixo `PAGE_SIZE = 20`, via `take`/`skip` (`(page-1)*PAGE_SIZE`).
- `findManyNearby` usa `ORDER BY distance ASC` (MySQL não garante ordem de inserção).

### 6.5 Seed controlado de ADMIN

- `prisma/seed-adm-role.ts`: `upsert` **idempotente** do usuário `ADMIN`
  (`update: {}` → nunca reseta a senha de um admin já existente).
- Credenciais **só via env** (`ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`),
  validadas no Zod global (fail-fast); senha com bcrypt 12 rounds.
- Registrado em `prisma.config.ts` (`migrations.seed`) e no script
  `pnpm seed-adm-role` (`prisma db seed`). O `migrate deploy` usado nos testes
  **não** dispara o seed.

---

## 7. Testes

- **Unitários** (`*.spec.ts` em `use-cases/`): usam repositórios **in-memory** →
  rápidos, sem banco. Validam regras de negócio isoladamente.
- **E2E** (`*.spec.ts` em `http/controllers/`): sobem o app real + MySQL.
  Cada arquivo cria um **banco isolado** (`test_<UUID>`) via
  `prisma/vitest-environment/prisma-test-environment.ts`, roda
  `prisma migrate deploy` e dropa o banco no teardown.
  - ⚠️ O environment de teste precisa de `import 'dotenv/config'` no topo, pois o
    Vite não injeta `.env` nos workers forkados.
- Config Vitest usa `projects:` (`unit` e `e2e`) — comandos: `pnpm test` e
  `pnpm test:e2e`.

---

## 8. CI/CD (GitHub Actions)

- **`run-unit-tests.yml`**: em todo `push`. Node 24 + pnpm (sem `version:` no
  `action-setup`, herda de `packageManager` no `package.json`) → `pnpm test`.
- **`run-e2e-tests.yml`**: em `pull_request`. Sobe service container MySQL 8 com
  healthcheck → `pnpm test:e2e`.
- **Branch `master` protegida** por ruleset: bloqueia deleção e force-push, exige
  PR e status checks (`Execute Unit Tests` + `Execute E2E Tests`) verdes.

> O `JWT_SECRET` do workflow e2e vem de **GitHub Secrets**
> (`${{ secrets.JWT_SECRET }}`) — cadastre o secret no repositório. Em produção,
> injete o segredo via cofre (Vault/Secrets Manager), nunca versionado.

---

## 9. Operação & Observabilidade

### 9.1 Configuração via ambiente (fail-fast)

Tudo que muda entre ambientes é **env validado no boot** (`src/env/index.ts`); o
app **não sobe** com config inválida. Variáveis: `NODE_ENV`, `PORT`, `JWT_SECRET`
(≥20), `CORS_ORIGIN`, `PASSWORD_MIN_LENGTH`, `BODY_LIMIT`, `LOG_LEVEL`,
`ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`. **Toda nova env entra também no
`.env.example`** (com comentário explicando formato/exemplo).

### 9.2 Logs (pino) e seam de erro

- Logger do Fastify (**pino**): JSON estruturado em produção (nível via
  `LOG_LEVEL`), `pino-pretty` em desenvolvimento e **desligado em teste** (evita
  ruído e handles abertos).
- **`reportError()`** (`src/lib/report-error.ts`) é a **porta única** de report de
  erro: hoje loga via pino; troque o corpo por Sentry/Datadog/etc. sem mexer nos
  call sites. O `setErrorHandler` chama `reportError(error)` no ramo de produção.

### 9.3 Graceful shutdown

- `app.addHook('onClose', …)` desconecta o Prisma ao fechar o app.
- `server.ts` trata `SIGTERM`/`SIGINT` → `app.close()` (drena requests) → `exit(0)`,
  com **timeout de 10s** (`setTimeout(...).unref()`) que força a saída se travar.

---

## 10. Como Replicar a Arquitetura (passo a passo para um novo recurso)

Para adicionar um recurso novo (ex.: `Plan`):

1. **Modelo** no `schema.prisma` → `prisma migrate dev` → recriar barrel
   `src/prisma-client/index.ts`.
2. **Interface** do repositório: `repositories/i-plans-repository.ts`.
3. **Implementações**: `repositories/prisma/prisma-plans-repository.ts` e
   `repositories/in-memory/in-memory-plans-repository.ts`.
4. **Use-case**: `use-cases/create-plan-use-case.ts` (recebe a interface no
   construtor; lança erros de domínio de `use-cases/errors/`).
5. **Teste unitário**: `use-cases/create-plan-use-case.spec.ts` usando o repo
   in-memory.
6. **Factory**: `use-cases/factories/make-create-plan-use-case.ts`.
7. **Controller**: `http/controllers/plans/create-controller.ts` (valida com Zod,
   chama a factory, traduz erros → HTTP).
8. **Rotas**: `http/controllers/plans/routes.ts` (aplique `verifyJwtMiddleware`
   e/ou `verifyUserRole` conforme a necessidade).
9. **Registrar** as rotas em `app.ts` (`app.register(plansRoutes)`).
10. **Teste E2E**: `http/controllers/plans/create-controller.spec.ts`.

**Regra de ouro:** controllers nunca falam com Prisma; use-cases nunca falam com
HTTP; dependências sempre via **interface** + injeção pela factory.

---

## 11. Pontos Fortes (manter no padrão)

- Camadas bem separadas e testáveis; DIP via interfaces + factories.
- `userId` sempre derivado do token (anti-IDOR).
- Raw SQL parametrizado (sem injeção).
- bcrypt 12 rounds; cookie `httpOnly`/`secure`/`sameSite`.
- Env validado no boot (fail-fast) e tudo configurável por `.env`.
- Rate limit (global + auth), CORS por ambiente, headers via Helmet, `bodyLimit`.
- Login com tempo uniforme (anti-enumeração) e revogação de token (denylist).
- Autorização com `403` correto; respostas **sem** `password_hash`.
- Logger estruturado (pino) + seam `reportError()`; graceful shutdown.
- Seed idempotente de ADMIN via env.
- Testes unitários + E2E com banco isolado por arquivo; CI com branch protegida.
