# solid_api_sample

API estilo GymPass construída com princípios SOLID.

> 🇺🇸 English version: [README.md](README.md)

## Arquitetura

Para a referência completa de arquitetura (ciclo de vida de requisição, modelo
de segurança, camada de dados, CI/CD e observabilidade) consulte:

- [PROJECT.md](PROJECT.md) — English
- [PROJECT-pt-BR.md](PROJECT-pt-BR.md) — Português

[![Unit Tests](https://github.com/rramires/solid_api_sample/actions/workflows/run-unit-tests.yml/badge.svg)](https://github.com/rramires/solid_api_sample/actions/workflows/run-unit-tests.yml)
[![E2E Tests](https://github.com/rramires/solid_api_sample/actions/workflows/run-e2e-tests.yml/badge.svg)](https://github.com/rramires/solid_api_sample/actions/workflows/run-e2e-tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Stack:** Node.js · Fastify · TypeScript 6 · Prisma 7 · MySQL · Vitest

## Funcionalidades

- **Arquitetura SOLID em camadas** — controllers, use-cases e interfaces de
  repositório com implementações Prisma e in-memory.
- **Autenticação JWT com refresh tokens** — access token de curta duração mais
  um cookie httpOnly de refresh.
- **RBAC** — papéis `MEMBER` / `ADMIN` aplicados por rota.
- **Revogação de token** — logout adiciona o `jti` do token a uma denylist
  híbrida (memória + banco de dados).
- **Rate limiting** — limites globais e limites mais rígidos em rotas de
  autenticação.
- **Hardening de segurança** — headers Helmet, CORS por ambiente, política de
  senha configurável, limite de tamanho de body e equalização de timing no login
  para prevenir enumeração de usuários.
- **Operabilidade** — validação de env fail-fast, log estruturado com `pino` e
  graceful shutdown.
- **Bloqueio de login por conta** — após N tentativas falhas a conta é bloqueada
  por um período configurável (in-memory hoje, troca por Redis via `ILoginAttemptTracker`).
- **Verificação de e-mail** — fluxo de link + OTP com seam de provedor de e-mail
  (`IEmailProvider`); `ConsoleEmailProvider` imprime no stdout em dev.
- **Proteção do event loop** — `@fastify/under-pressure` retorna `503`
  automaticamente quando o lag do event loop ou o uso de heap ultrapassa os limites.
- **Testado** — suite unitária (sem banco) e suite e2e com banco isolado, ambas no CI.

## Configuração

```sh
cp .env.example .env  # preencha os valores (veja Variáveis de ambiente)
pnpm install
pnpm compose:up       # inicia o MySQL no Docker
pnpm migrate          # executa as migrations
pnpm seed-adm-role    # cria o usuário ADMIN com as vars ADMIN_*
pnpm dev              # inicia o servidor em modo dev
```

## Scripts

| Comando              | Descrição                            |
| -------------------- | ------------------------------------ |
| `pnpm dev`           | Inicia o servidor dev com hot-reload |
| `pnpm build`         | Build de produção (tsup)             |
| `pnpm start`         | Executa o build de produção          |
| `pnpm migrate`       | Cria/executa migrations do Prisma    |
| `pnpm seed-adm-role` | Cria o usuário ADMIN (idempotente)   |
| `pnpm test`          | Testes unitários                     |
| `pnpm test:e2e`      | Testes e2e (requer MySQL)            |
| `pnpm lint`          | Executa o ESLint                     |
| `pnpm lint:fix`      | Corrige erros de lint                |
| `pnpm compile`       | Type-check do TypeScript             |
| `pnpm showdb`        | Abre o Prisma Studio (porta 5555)    |

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores. A aplicação **falha
imediatamente** no boot se alguma variável for inválida (validação Zod em
`src/env`).

| Variável                     | Obrigatória | Padrão                  | Descrição                                                                                     |
| ---------------------------- | ----------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| `NODE_ENV`                   | sim         | –                       | `development` \| `test` \| `production`                                                       |
| `PORT`                       | não         | `3333`                  | Porta HTTP                                                                                    |
| `JWT_SECRET`                 | sim         | –                       | Segredo de assinatura, mín. 20 chars (use GitHub Secrets / cofre em CI/produção)              |
| `DATABASE_URL`               | sim         | –                       | ex. `mysql://root:docker123@localhost:3306/gympass-db`                                        |
| `CORS_ORIGIN`                | não         | –                       | Origens permitidas separadas por vírgula (somente produção)                                   |
| `PASSWORD_MIN_LENGTH`        | não         | `8`                     | Tamanho mínimo de senha no cadastro (8–72)                                                    |
| `BODY_LIMIT`                 | não         | `16384`                 | Tamanho máximo do body da requisição, em bytes                                                |
| `LOG_LEVEL`                  | não         | `info`                  | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` \| `silent`                      |
| `ADMIN_NAME`                 | sim         | –                       | Nome de exibição do ADMIN seed                                                                |
| `ADMIN_EMAIL`                | sim         | –                       | Email do ADMIN (login)                                                                        |
| `ADMIN_PASSWORD`             | sim         | –                       | Senha do ADMIN: mín. 10 chars com maiúscula, minúscula, número e especial (ex. `Admin@12345`) |
| `TRUST_PROXY`                | não         | –                       | `false` \| `true` \| IP do proxy; ative atrás de Nginx/Cloudflare/ALB                         |
| `MAX_EVENT_LOOP_DELAY`       | não         | `1000`                  | Limiar de lag do event loop em ms antes de retornar 503                                       |
| `MAX_HEAP_USED_BYTES`        | não         | `209715200`             | Limiar de heap em bytes antes de retornar 503 (padrão 200 MB)                                 |
| `LOGIN_MAX_ATTEMPTS`         | não         | `5`                     | Tentativas falhas antes do bloqueio de conta                                                  |
| `LOGIN_LOCKOUT_MINUTES`      | não         | `15`                    | Duração do bloqueio em minutos                                                                |
| `APP_URL`                    | não         | `http://localhost:3333` | URL pública usada nos e-mails de verificação                                                  |
| `VERIFICATION_EXPIRES_HOURS` | não         | `24`                    | Validade do link/OTP de verificação em horas                                                  |
| `REQUIRE_EMAIL_VERIFICATION` | não         | `false`                 | Quando `true`, bloqueia usuários não verificados em rotas protegidas                          |

## Rotas da API

| Método  | Rota                             | Auth           | Papel   | Descrição                                             |
| ------- | -------------------------------- | -------------- | ------- | ----------------------------------------------------- |
| `GET`   | `/hello`                         | –              | –       | Healthcheck                                           |
| `POST`  | `/users`                         | –              | –       | Cadastrar usuário (com rate limit)                    |
| `POST`  | `/sessions`                      | –              | –       | Login → access token + cookie de refresh (rate limit) |
| `PATCH` | `/token/refresh`                 | refresh cookie | –       | Rotacionar o access token                             |
| `GET`   | `/me`                            | Bearer         | –       | Perfil do usuário autenticado                         |
| `POST`  | `/logout`                        | Bearer         | –       | Revogar o token atual (denylist)                      |
| `GET`   | `/gyms/search`                   | Bearer         | –       | Buscar academias por nome                             |
| `GET`   | `/gyms/nearby`                   | Bearer         | –       | Academias próximas a uma coordenada                   |
| `POST`  | `/gyms`                          | Bearer         | `ADMIN` | Cadastrar academia                                    |
| `GET`   | `/check-ins/history`             | Bearer         | –       | Histórico de check-ins paginado                       |
| `GET`   | `/check-ins/metrics`             | Bearer         | –       | Total de check-ins                                    |
| `POST`  | `/gyms/:gymId/check-ins`         | Bearer         | –       | Fazer check-in                                        |
| `PATCH` | `/check-ins/:checkInId/validate` | Bearer         | `ADMIN` | Validar check-in                                      |
| `POST`  | `/users/send-verification`       | Bearer         | –       | Enviar e-mail de verificação (link + OTP)             |
| `GET`   | `/users/verify-email`            | –              | –       | Verificar e-mail via link token (`?token=`)           |
| `POST`  | `/users/verify-email/otp`        | Bearer         | –       | Verificar e-mail via código OTP                       |
| `POST`  | `/users/resend-verification`     | Bearer         | –       | Reenviar e-mail de verificação                        |

> O `role` (`MEMBER` \| `ADMIN`) é incorporado ao JWT no momento do login.
> Promover um usuário **não** afeta tokens já emitidos — é necessário um novo
> login para obter um token com o novo papel.

### Exemplos de resposta

`POST /sessions` → `200` (também define o cookie httpOnly `refreshToken`):

```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

`GET /me` → `200`:

```json
{ "user": { "id": "3fa2...c9", "name": "Fulano" } }
```

Uma validação com falha retorna `400` com os problemas; um token inválido ou
revogado retorna `401`; a ausência do papel `ADMIN` retorna `403`.

## Usuário ADMIN

Não existe endpoint para criar admins. O ADMIN único é provisionado pelo
**seed**, que lê `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` e é
**idempotente** (executar novamente nunca sobrescreve um admin existente):

```sh
pnpm seed-adm-role
```

## Testes

- `pnpm test` — testes unitários (use-cases, repositórios in-memory, sem banco).
- `pnpm test:e2e` — testes HTTP/end-to-end. Requer MySQL; cada arquivo de teste
  roda contra um banco isolado criado dinamicamente.

## Verificação final

```sh
pnpm compile   # type-check, sem erros
pnpm lint      # ESLint, sem erros
pnpm test      # suite unitária
pnpm test:e2e  # suite e2e (MySQL rodando)
```

### Smoke test manual das rotas

Com o servidor rodando (`pnpm dev`) e o ADMIN criado (`pnpm seed-adm-role`),
execute o bloco abaixo. Ele exercita as rotas públicas, RBAC, refresh de token e
revogação de token. As senhas de cadastro devem ter pelo menos
`PASSWORD_MIN_LENGTH` caracteres (padrão 8).

```sh
BASE="http://127.0.0.1:3333"

# 1. Healthcheck
echo "=== 1. GET /hello ===" && curl -s "$BASE/hello" && echo

# 2. Cadastrar um MEMBER normal (senha >= 8 chars)
echo -e "\n=== 2. POST /users ===" && \
curl -s -X POST "$BASE/users" -H "Content-Type: application/json" \
  -d '{"name":"Fulano","email":"fulano@email.com","password":"password123"}' | python3 -m json.tool

# 3. Login como MEMBER (captura token + cookie de refresh)
echo -e "\n=== 3. POST /sessions (member) ===" && \
TOKEN=$(curl -s -c /tmp/cookies.txt -X POST "$BASE/sessions" \
  -H "Content-Type: application/json" \
  -d '{"email":"fulano@email.com","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "Token: ${TOKEN:0:40}..."

# 4. Perfil autenticado
echo -e "\n=== 4. GET /me ===" && \
curl -s "$BASE/me" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 5. Renovar o access token via cookie de refresh
echo -e "\n=== 5. PATCH /token/refresh ===" && \
curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt -X PATCH "$BASE/token/refresh" | python3 -m json.tool

# 6. Criar academia como MEMBER -> esperado 401 (papel ADMIN obrigatório)
echo -e "\n=== 6. POST /gyms (esperado 401 - MEMBER) ===" && \
curl -s -X POST "$BASE/gyms" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Academia Teste","description":"Teste","phone":"9999-8888","latitude":-25.4677004,"longitude":-49.304584}' | \
  python3 -m json.tool

# 7. Logout -> revoga o token atual (denylist)
echo -e "\n=== 7. POST /logout ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/logout" -H "Authorization: Bearer $TOKEN"

# 8. Reusar o token revogado -> esperado 401 (token na denylist)
echo -e "\n=== 8. GET /me com token revogado (esperado 401) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  "$BASE/me" -H "Authorization: Bearer $TOKEN"

# 9. Login como ADMIN (use seu ADMIN_EMAIL / ADMIN_PASSWORD)
echo -e "\n=== 9. POST /sessions (admin) ===" && \
ADMIN_TOKEN=$(curl -s -X POST "$BASE/sessions" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@12345"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "Admin token: ${ADMIN_TOKEN:0:40}..."

# 10. Criar academia como ADMIN -> esperado 201
echo -e "\n=== 10. POST /gyms (ADMIN - esperado 201) ===" && \
curl -s -X POST "$BASE/gyms" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"title":"Academia SOLID","description":"Treino funcional","phone":"9999-8888","latitude":-25.4677004,"longitude":-49.304584}' | \
  python3 -m json.tool
```

## Licença

Distribuído sob a [Licença MIT](LICENSE).
