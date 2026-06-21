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

| Camada               | Tecnologia                         | Versão      |
| -------------------- | ---------------------------------- | ----------- |
| Runtime              | Node.js                            | 24          |
| HTTP Framework       | Fastify                            | 5.8.5       |
| Linguagem            | TypeScript                         | 6.0.3       |
| ORM                  | Prisma                             | 7.8.0       |
| Driver Adapter       | `@prisma/adapter-mariadb`          | 7.8.0       |
| Banco                | MySQL                              | 8           |
| Validação            | Zod                                | 4.4.3       |
| Auth                 | `@fastify/jwt` + `@fastify/cookie` | 10.1 / 11.0 |
| Hash                 | bcryptjs (12 rounds)               | 3.0.3       |
| Headers de segurança | `@fastify/helmet`                  | 13.0.2      |
| CORS                 | `@fastify/cors`                    | 11.2        |
| Rate limit           | `@fastify/rate-limit`              | 10.3        |
| Guarda do event loop | `@fastify/under-pressure`          | 9.0.3       |
| Logs                 | pino (via Fastify) + pino-pretty   | —           |
| Datas                | dayjs                              | 1.11        |
| Testes               | Vitest                             | 4.1.8       |
| Lint/Format          | ESLint 10 (flat) + Prettier 3.8    | —           |
| Build prod           | tsup                               | 8.5.1       |
| Package manager      | pnpm                               | 11.5.2      |

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

- **S (Single Responsibility):** cada _use-case_ faz **uma** operação de negócio.
  Cada _controller_ só traduz HTTP ↔ use-case.
- **O (Open/Closed):** novos repositórios/implementações entram sem alterar o
  use-case (ele depende da interface).
- **L (Liskov):** `InMemory*Repository` e `Prisma*Repository` são intercambiáveis
  porque honram o mesmo contrato.
- **I (Interface Segregation):** interfaces de repositório pequenas e específicas
  (`IUsersRepository`, `IGymsRepository`, `ICheckInsRepository`).
- **D (Dependency Inversion):** use-cases recebem **interfaces** no construtor; as
  _factories_ injetam a implementação concreta (Prisma).

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
│   ├── token-denylist.ts    # Singleton da denylist de tokens revogados (híbrida RAM+DB)
│   └── email/              # seam do provedor de e-mail (IEmailProvider + ConsoleEmailProvider)
├── prisma-client/           # CLIENTE GERADO pelo Prisma 7 (output custom)
├── http/
│   ├── controllers/
│   │   ├── auth/            # auth + self-service (login, logout, refresh, me, editar username, troca de e-mail)
│   │   ├── users/           # rotas de conta (cadastro, verificação de e-mail, reset de senha, confirmar troca de e-mail, listar/buscar/editar admin)
│   │   ├── gyms/            # rotas + controllers de academias (criar, editar, buscar, nearby)
│   │   ├── check-ins/       # rotas + controllers de check-ins
│   │   └── health/          # healthcheck (/hello)
│   ├── middlewares/
│   │   ├── verify-jwt-middleware.ts   # autenticação + checagem na denylist
│   │   ├── verify-user-role.ts        # autorização (RBAC; lê papel do DB; 403 se papel errado)
│   │   ├── verify-email-verified.ts   # bloqueia não verificados (REQUIRE_EMAIL_VERIFICATION)
│   │   └── rate-limit.ts              # limite estrito p/ rotas de auth
│   └── schemas/
│       └── password-schema.ts         # schema Zod de senha compartilhado (cadastro + reset)
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
    ├── get-distance-between-coordinates.ts   # haversine (regra geográfica)
    ├── sha256.ts                             # helper de hash de token/OTP
    └── tests/                                # helpers de teste e2e (create-and-auth-user, coords)
```

### Convenção de nomes

- Interfaces de repositório: prefixo `i-` no arquivo, `I` no tipo.
- Use-cases: `<acao>-use-case.ts` exportando a classe `<Acao>UseCase`.
- Factories: `make-<acao>-use-case.ts` exportando `make<Acao>UseCase()`.
- Controllers: `<acao>-controller.ts` exportando `<acao>Controller`.
- Erros de domínio: classes que estendem `Error` em `use-cases/errors/`.

---

## 4. Caminho Completo de uma Requisição

Exemplo: **`POST /auth/login`** (login) e **`POST /gyms/:gymId/check-ins`** (rota protegida).

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
     • strictAuthLimit(app)          → rate limit estrito (5/min) em /users e /auth/login
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
     • Erro de framework     → seu próprio statusCode (429 rate-limit, 413 body-limit, 400 JSON inválido, 503 under-pressure)
     • Erro não tratado      → 500 (request.log.error em dev; reportError() em prod)
```

### 4.2 Exemplo detalhado — `POST /auth/login` (público)

1. **Rota** (`auth/routes.ts`): `app.post('/auth/login', authenticateController)` — rate limit estrito, sem hook JWT.
2. **Controller** (`authenticate-controller.ts`):
    - Valida `{ identifier, password }` com Zod (`identifier` aceita e-mail **ou** username).
    - `makeAuthenticateUseCase()` → `AuthenticateUseCase` + `PrismaUsersRepository`.
3. **Use-case** (`authenticate-use-case.ts`):
    - Resolve a conta por e-mail ou username (`identifier` com `@` → `findByEmail`;
      senão `findByUsername`, em lowercase para login case-insensitive). Se não
      existir, lança `InvalidCredentialsError`.
    - `bcrypt.compare(password, hash)` → se não bater, mesmo erro genérico.
    - O lockout é chaveado por **`user.id`** (não pela string do identifier), então
      não dá pra burlar um bloqueio alternando entre e-mail e username da conta.
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
6. **Erros** — mapeados nos controllers via `instanceof` (o padrão da casa, como
   `ResourceNotFoundError`/`UserAlreadyExistsError` nos demais), então esses
   resultados de negócio esperados retornam `4xx` e **nunca** caem no `500`
   global: `ResourceNotFoundError` → `404`, `MaxDistanceError` → `400`,
   `MaxCheckInsReachedError` → `409`. Validar um check-in após a janela de
   **20 minutos** (`validate-controller.ts`) → `LateCheckInValidationError` →
   `409`. Cada resposta carrega a `message` do erro.

### 4.4 Regras de validação (entrada)

Todo controller valida `body`/`params`/`query` com um **schema Zod**
(`bodySchema`/`querySchema`). Esses schemas são a **fonte única de verdade** das
regras de entrada — tamanhos, formatos, charset, nulabilidade — e são
**parametrizados por env** (`MIN_TEXT_LENGTH`, `PASSWORD_MIN_LENGTH`,
`PASSWORD_PATTERN`), então este
doc **não** repete os valores literais (eles driftariam). Leia as regras na
fonte via este índice rota → controller:

| Rota                                     | Controller (schema Zod)                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `POST /users`                            | `src/http/controllers/users/register-controller.ts`                     |
| `POST /auth/login`                       | `src/http/controllers/auth/authenticate-controller.ts`                  |
| `POST /gyms`                             | `src/http/controllers/gyms/create-controller.ts`                        |
| `GET /gyms/search`                       | `src/http/controllers/gyms/search-controller.ts`                        |
| `GET /gyms/nearby`                       | `src/http/controllers/gyms/nearby-controller.ts`                        |
| `POST /gyms/:gymId/check-ins`            | `src/http/controllers/check-ins/check-in-controller.ts`                 |
| `GET` / `POST /users/verify-email[/otp]` | `src/http/controllers/users/verify-email-controller.ts`                 |
| `POST /users/forgot-password`            | `src/http/controllers/users/forgot-password-controller.ts`              |
| `POST /users/reset-password`             | `src/http/controllers/users/reset-password-controller.ts`               |
| `PATCH /gyms/:gymId`                     | `src/http/controllers/gyms/update-controller.ts`                        |
| `PATCH /auth/me`                         | `src/http/controllers/auth/update-profile-controller.ts`                |
| `POST /auth/me/email`                    | `src/http/controllers/auth/request-email-change-controller.ts`          |
| `POST /auth/me/email/confirm`            | `src/http/controllers/auth/confirm-email-change-by-otp-controller.ts`   |
| `GET /users/confirm-email-change`        | `src/http/controllers/users/confirm-email-change-by-link-controller.ts` |
| `GET /users`                             | `src/http/controllers/users/list-controller.ts`                         |
| `GET /users/:userId`                     | `src/http/controllers/users/get-user-controller.ts`                     |
| `PATCH /users/:userId`                   | `src/http/controllers/users/update-controller.ts`                       |

Formatos notáveis: `username` (piso `MIN_TEXT_LENGTH` … 30, `[a-zA-Z0-9_]`,
gravado lowercase — mesma regra no cadastro **e** nas edições de perfil/admin),
`identifier` de login (e-mail ou username), `password`
(cadastro + reset, schema compartilhado: ≥ `PASSWORD_MIN_LENGTH`, ≤ 72,
complexidade `PASSWORD_PATTERN`), `title` de gym (≥ `MIN_TEXT_LENGTH`), `phone`
de gym (opcional; `^\+?[\d\s().-]{7,20}$`), `query` de busca
(≥ `MIN_TEXT_LENGTH`). Os `max` do Zod espelham os tamanhos de coluna
`@db.VarChar(n)` (ver §6.3).

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
- **`PATCH /auth/refresh`**: usa `jwtVerify({ onlyCookie: true })` e **rotaciona**
  ambos os tokens. Refresh tokens são de **uso único** — o `jti` apresentado é
  revogado antes de emitir o novo par, então um cookie de refresh roubado não
  pode ser reusado.
- **`jti` + denylist**: todo token carrega um `jti`. **`POST /auth/logout`** revoga
  **ambos** os `jti` (access e refresh, até o `exp`) e limpa o cookie; o
  `verifyJwtMiddleware` rejeita (`401`) qualquer token revogado. Detalhes na §5.5.
- **`is_verified` não é claim do JWT**: o `verifyEmailVerified` lê o estado real
  do banco via cache read-through (`lib/verified-cache.ts`), então um usuário que
  verifica no meio da sessão é liberado na hora. Pelo mesmo motivo, o
  `GET /auth/me` retorna `is_verified` **e** `role` fresh do banco (não do
  token), para um frontend exibir um banner de "e-mail não verificado" que some
  no instante em que o usuário verifica, e UI de RBAC que reflete uma promoção
  sem esperar um novo login.
- **Invalidação global de sessão**: um reset de senha grava `password_changed_at`;
  todo token emitido antes desse instante é rejeitado (veja §5.5).

### 5.2 Autorização (o que o usuário pode fazer) — RBAC

- Papéis no enum `Role`: `MEMBER` (padrão) e `ADMIN`.
- `verifyUserRole(role)` é um _middleware factory_ que lê o **papel do banco**
  (por `request.user.sub`, via o mesmo use-case do `GET /auth/me`) e compara com o
  papel exigido — o claim `role` assinado nunca é confiado para autorização, então
  um rebaixamento passa a valer na próxima requisição. Usado nas rotas
  administrativas; roda depois do `verifyJwtMiddleware`.
- **Por que `403` e não `401`:** o usuário está **autenticado** (token válido), mas
  **sem permissão** → `403 Forbidden`. O `401 Unauthorized` fica reservado para
  falha de **autenticação** (token ausente/inválido/revogado). Misturar os dois
  mascara a causa real do erro para o cliente.

### 5.3 Mapa de rotas × proteção

| Método | Rota                             | Auth (JWT) | Papel exigido | Observação                                       |
| ------ | -------------------------------- | :--------: | :-----------: | ------------------------------------------------ |
| GET    | `/hello`                         |     ❌     |       —       | health/teste                                     |
| POST   | `/users`                         |     ❌     |       —       | registro (público)                               |
| POST   | `/auth/login`                    |     ❌     |       —       | login                                            |
| PATCH  | `/auth/refresh`                  |   cookie   |       —       | rotação de token                                 |
| GET    | `/auth/me`                       |     ✅     |       —       | perfil próprio                                   |
| POST   | `/auth/logout`                   |     ✅     |       —       | revoga o token atual (denylist) + limpa cookie   |
| PATCH  | `/auth/me`                       |     ✅     |       —       | self: editar o próprio username                  |
| POST   | `/auth/me/email`                 |     ✅     |       —       | self: solicitar troca de e-mail (confirma novo)  |
| POST   | `/auth/me/email/confirm`         |     ✅     |       —       | self: confirmar troca de e-mail via OTP          |
| GET    | `/gyms/search`                   |     ✅     |       —       | busca por título                                 |
| GET    | `/gyms/nearby`                   |     ✅     |       —       | busca por proximidade                            |
| POST   | `/gyms`                          |     ✅     |   **ADMIN**   | cadastrar academia                               |
| PATCH  | `/gyms/:gymId`                   |     ✅     |   **ADMIN**   | editar academia (título/descrição/telefone)      |
| GET    | `/check-ins/history`             |     ✅     |       —       | histórico próprio                                |
| GET    | `/check-ins/metrics`             |     ✅     |       —       | total próprio                                    |
| POST   | `/gyms/:gymId/check-ins`         |     ✅     |       —       | check-in (e-mail verificado se flag ligada)      |
| PATCH  | `/check-ins/:checkInId/validate` |     ✅     |   **ADMIN**   | validar check-in                                 |
| POST   | `/users/send-verification`       |     ✅     |       —       | enviar e-mail de verificação (link + OTP)        |
| GET    | `/users/verify-email`            |     ❌     |       —       | verificar e-mail via link token (`?token=`)      |
| POST   | `/users/verify-email/otp`        |     ✅     |       —       | verificar e-mail via código OTP                  |
| POST   | `/users/resend-verification`     |     ✅     |       —       | reenviar e-mail de verificação                   |
| POST   | `/users/forgot-password`         |     ❌     |       —       | solicitar reset; sempre `202` (anti-enumeração)  |
| POST   | `/users/reset-password`          |     ❌     |       —       | resetar via link token ou email + OTP            |
| GET    | `/users/confirm-email-change`    |     ❌     |       —       | confirmar troca de e-mail via link (`?token=`)   |
| GET    | `/users`                         |     ✅     |   **ADMIN**   | listar usuários (paginado, 20/página)            |
| GET    | `/users/:userId`                 |     ✅     |   **ADMIN**   | buscar um usuário por id (PublicUser)            |
| PATCH  | `/users/:userId`                 |     ✅     |   **ADMIN**   | editar usuário (username/email/role/is_verified) |

> Padrão para proteger um grupo: `app.addHook('onRequest', verifyJwtMiddleware)`
> no início da função de rotas. Para exigir papel: adicionar
> `{ onRequest: [verifyUserRole(Role.ADMIN)] }` na rota específica.

**Gate de verificação de e-mail.** Com `REQUIRE_EMAIL_VERIFICATION=true`,
exatamente uma rota exige e-mail verificado — `POST /gyms/:gymId/check-ins`, via
middleware `verifyEmailVerified` (`403 Email not verified.`). Toda outra rota
fica inalterada. O gate independe de papel — checa só `is_verified`, lido fresh
do banco (ver §5.1), e o ADMIN do seed já é verificado, então nunca trava. A
matriz de acesso por rota e um smoke test com a flag ligada estão no README
(_Gate de verificação de e-mail_).

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
  limite estrito (5/min) em `/users` e `/auth/login` via `strictAuthLimit` → mitiga
  brute-force de senha e abuso de cadastro/enumeração.
- **CORS por ambiente** (`@fastify/cors`) com `credentials:true` (necessário para
  o cookie de refresh). Em produção a origem vem de `CORS_ORIGIN` (allow-list); em
  dev é liberado. Nunca `origin:'*'` junto de credenciais. O `methods` é definido
  explicitamente (`GET,HEAD,POST,PUT,PATCH,DELETE`) — o plugin usa por padrão
  `GET,HEAD,POST`, que bloquearia todo `PATCH`/`PUT`/`DELETE` no preflight do
  navegador.
- **Tempo de login uniforme (anti-enumeração):** o login **sempre** roda
  `bcrypt.compare` — contra um `DUMMY_HASH` fixo quando o e-mail não existe — para
  que o tempo de resposta não revele se a conta existe.
- **Política de senha configurável:** cadastro **e** reset de senha compartilham
  um único schema (`src/http/schemas/password-schema.ts`):
  `min(PASSWORD_MIN_LENGTH).max(72)` (72 = limite do bcrypt; evita DoS por string
  gigante) mais a regex de complexidade `PASSWORD_PATTERN` (padrão: maiúscula,
  minúscula, número e especial). A senha de seed do ADMIN tem política própria
  mais estrita (≥10, maiúscula, minúscula, número e especial), validada no `env`.
- **`bodyLimit` configurável** (`BODY_LIMIT`, default 16 KB) limita o tamanho do
  corpo da request.
- **`.max()` por campo em todas as entradas de texto** previne overflow de colunas
  no banco e ReDoS em validadores regex complexos. O `bodyLimit` global limita o
  payload total, mas não campos individuais.
- **Bloqueio de login por conta** (`ILoginAttemptTracker`): após `LOGIN_MAX_ATTEMPTS`
  falhas a conta é bloqueada por `LOGIN_LOCKOUT_MINUTES`. `Map` in-memory hoje;
  troca por Redis substituindo `src/lib/login-attempt-tracker.ts` (mesma interface
  assíncrona). Retorna `429 Too Many Requests`.
- **Defesa contra mass-assignment nas edições:** toda rota de edição valida um
  **whitelist `.strict()`** — `PATCH /auth/me` aceita só `username` (nunca
  `role`/`is_verified`/`email`/`password`); `PATCH /users/:userId` aceita só
  `username`/`email`/`role`/`is_verified`. Chave desconhecida vira `400`, então um
  member não escala injetando campos.
- **Um modelo de autoridade por handler (self vs admin):** o self-service age sobre
  `request.user.sub` e mora em `/auth/me` (sem id na URL); as edições administrativas
  pegam o id da URL e são guardadas por `verifyUserRole(ADMIN)` em `/users/:userId`.
  Cada handler tem um único modelo de autoridade, sem ramo "self-ou-admin" para
  errar. Como `verifyUserRole` roda no `onRequest`, um não-admin leva `403` mesmo
  para id inexistente (sem vazar existência — `403` antes de `404`).
- **Sem auto-rebaixamento (invariante ≥1 admin):** `PATCH /users/:userId` rejeita
  `role: MEMBER` quando o alvo é o próprio ator (`400 CannotChangeOwnRoleError`).
  Como só admins chegam à rota, rebaixar _outros_ nunca remove o último admin, então
  bloquear só o auto-rebaixamento garante ≥1 admin sempre — sem query de "contar
  admins".
- **Troca de e-mail é prova-gated:**
    - _Self (pattern A):_ `POST /auth/me/email` nunca sobrescreve o endereço comprovado;
      grava um `EmailChange` pendente e envia confirmação ao **novo** endereço mais um
      alerta anti-sequestro ao **antigo**. Só ao confirmar (link ou OTP) o e-mail é
      trocado e `is_verified` volta a `true`. Unicidade rechecada no confirm (TOCTOU);
      cooldown de 60s; tentativas de OTP limitadas a 5.
    - _Admin:_ trocar o e-mail de um usuário não é prova, então seta `is_verified=false`
      e envia um **reset de senha ao novo endereço** (inline). Mandar `email` e
      `is_verified:true` na mesma request é `400` (contradição).
    - Qualquer um dos caminhos invalida a entrada do usuário no verified-cache (§5.1)
      para o gate reler o banco.
    - _Trade-off conhecido (enumeração):_ o pedido self retorna `409` quando o novo
      endereço já pertence a uma conta — um oráculo de enumeração **autenticado** (quem
      está logado consegue sondar se um e-mail existe; o caminho `409` não manda e-mail
      nem sofre cooldown, só vale o limite global de 100/min). Mantido de propósito sobre
      a alternativa anti-enumeração (sempre `204`, adiando a unicidade pro confirm) pela
      UX imediata de "endereço já em uso"; o oráculo é fraco (autenticado, rate-limited,
      rastreável). As superfícies não autenticadas (`forgot-password`, login) seguem
      estritamente anti-enumeração.
- **`@fastify/under-pressure`**: monitora lag do event loop e uso de heap; retorna
  `503 Service Unavailable` automaticamente quando os limiares são excedidos —
  circuit breaker contra DoS por queries lentas.
- **`trustProxy`**: defina `TRUST_PROXY=true` (ou um IP específico) ao implantar
  atrás de proxy reverso para que `@fastify/rate-limit` leia `X-Forwarded-For`
  em vez do IP do proxy.

### 5.5 Revogação de token (denylist híbrida)

- **Contrato assíncrono** (`i-token-denylist.ts`: `isRevoked`, `revoke`, `load`) —
  deixado `async` de propósito para trocar a implementação por **Redis** sem tocar
  no middleware.
- **Implementação híbrida (RAM + DB), sem Redis:** leitura (`isRevoked`) só na RAM
  (~0 custo no hot path de toda request); `revoke` faz INSERT no banco **e**
  atualiza o `Map`; `load()` aquece a RAM a partir do banco no boot.
- **Limpeza periódica** (`setInterval(...).unref()`) remove entradas expiradas da
  RAM e do banco, mantendo a denylist limitada.
- **Fluxo:** `POST /auth/logout` → `revoke(jti, exp)` → requests seguintes com aquele
  token são rejeitadas (`401`) no `verifyJwtMiddleware`.
- **Refresh de uso único:** `PATCH /auth/refresh` também revoga o `jti` de
  refresh apresentado antes de emitir o novo par (rotação = consumo). Os tokens
  rotacionados levam o `role` **relido do banco** (igual ao login), então o claim
  nunca diverge do papel atual do usuário.
- **Logout global (`password_changed_at`):** um registro híbrido RAM+DB irmão
  (`password-changed-registry.ts`) grava cada troca de senha; tokens cujo `iat`
  é anterior são rejeitados no `verifyJwtMiddleware`. Mesmo seam de troca por
  Redis da denylist.

### 5.6 Por que proteção CSRF não é necessária

Todas as rotas autenticadas usam o cabeçalho `Authorization: Bearer` —
requisições cross-site não conseguem definir cabeçalhos customizados, portanto
CSRF não é aplicável.
A única rota baseada em cookie (`PATCH /auth/refresh`) é protegida pelo atributo
`sameSite` no cookie de refresh (`lax` ou `strict`), que impede navegadores de
enviar o cookie em requisições cross-origin não seguras.

> **Importante:** se `sameSite` for alterado para `none` (ex.: para suportar
> cookies cross-origin em subdomínio diferente), `@fastify/csrf-protection`
> deve ser adicionado.

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

- `User` (id uuid, **`username` único**, email único, password_hash, role,
  `is_verified` bool, `password_changed_at?`, created_at) 1—N `CheckIn`.
  `username` é único (índice b-tree via `@unique`), gravado em lowercase.
- `Gym` (id uuid, title, description?, phone?, latitude/longitude decimal) 1—N `CheckIn`.

Os tamanhos de coluna são fixados com Prisma `@db.VarChar(n)` para casar com o
`max` do Zod (sem descompasso "Zod permite mais que o banco"): `username` 30,
`email` 254, `password_hash` 60, todas as colunas uuid `id`/FK 36; gym `title`
100, `description` 500, `phone` 20.

- `CheckIn` (created_at, validated_at?) N—1 `User` e N—1 `Gym`.
- `RevokedToken` (`jti` PK, `expires_at`, `created_at`) — denylist persistida
  (tabela `revoked_tokens`).
- `EmailVerification` (`id` uuid, `user_id` FK, `link_token` uuid único,
  `otp_code` string de 6 dígitos, `attempts`, `expires_at`, `used_at?`,
  `created_at`) — armazena tanto o link de verificação quanto o OTP para o mesmo
  evento de verificação (tabela `email_verifications`).
- `PasswordReset` (`id` uuid, `user_id` FK, `link_token_hash` único,
  `otp_code_hash`, `attempts`, `expires_at`, `used_at?`, `created_at`) — tokens
  de reset são armazenados **com hash** (SHA-256), então um vazamento do banco
  não revela link/código utilizável (tabela `password_resets`).
- `EmailChange` (`id` uuid, `user_id` FK, `new_email`, `link_token` uuid único,
  `otp_code` string de 6 dígitos, `attempts`, `expires_at`, `used_at?`,
  `created_at`) — troca de e-mail self-service pendente (pattern A): o `new_email`
  fica aqui até ser confirmado, então é trocado em `User.email`. Espelha
  `EmailVerification` (token/OTP **crus**, `onDelete: Cascade`); tabela
  `email_changes`.

### 6.4 Paginação

- Tamanho fixo `PAGE_SIZE = 20`, via `take`/`skip` (`(page-1)*PAGE_SIZE`). A
  listagem de usuários admin (`GET /users`) ordena por mais recentes
  (`created_at desc`).
- `findManyNearby` usa `ORDER BY distance ASC` (MySQL não garante ordem de inserção).

### 6.5 Seed controlado de ADMIN

- `prisma/seed.ts`: `upsert` **idempotente** do usuário `ADMIN`
  (`update: {}` → nunca reseta a senha de um admin já existente).
- Credenciais **só via env** (`ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`),
  validadas no Zod global (fail-fast); senha com bcrypt 12 rounds.
- Registrado em `prisma.config.ts` (`migrations.seed`) e no script
  `pnpm seeddb` (`prisma db seed`). O `migrate deploy` usado nos testes
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
(≥20), `DATABASE_URL`, `CORS_ORIGIN`, `PASSWORD_MIN_LENGTH`, `PASSWORD_PATTERN`,
`MIN_TEXT_LENGTH` (piso 3),
`BODY_LIMIT`, `LOG_LEVEL`, `TRUST_PROXY`, `MAX_EVENT_LOOP_DELAY`,
`MAX_HEAP_USED_BYTES`, `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCKOUT_MINUTES`, `APP_URL`,
`VERIFICATION_EXPIRES_HOURS`, `RESET_EXPIRES_MINUTES`, `REQUIRE_EMAIL_VERIFICATION`,
`ADMIN_USERNAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`. **Toda nova env entra também no
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

> **Recursos que enviam e-mails:** siga o padrão de seam `IEmailProvider` em
> `src/lib/email/` (ex. `sendVerificationEmail`, `sendPasswordResetEmail`).
> Adicione um método à interface, implemente em `ConsoleEmailProvider` primeiro,
> depois troque por SMTP/SendGrid/Resend em produção substituindo
> `src/lib/email/index.ts` — nenhum call site muda.

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
