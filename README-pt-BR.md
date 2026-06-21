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
- **RBAC** — papéis `MEMBER` / `ADMIN` aplicados por rota; o papel é lido do
  banco na checagem, nunca confiado do claim JWT.
- **Revogação e rotação de token** — logout revoga tanto o access quanto o
  refresh token; refresh tokens são de uso único (rotacionados a cada refresh)
  via denylist híbrida (memória + banco) por `jti`.
- **Invalidação global de sessão** — um reset de senha invalida todo token
  emitido antes, via um registro `password_changed_at`.
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
  (`IEmailProvider`); tentativas de OTP são limitadas e reenvios têm cooldown;
  `ConsoleEmailProvider` imprime no stdout em dev. `is_verified` é lido do banco
  (via cache), nunca confiado de um claim JWT desatualizado.
- **Redefinição de senha** — `forgot-password` anti-enumeração (sempre responde
  `202`) mais `reset-password` por link ou OTP; tokens armazenados como hashes
  SHA-256, de uso único e com limite de tentativas; um reset bem-sucedido dispara
  logout global.
- **Gestão de conta** — admins listam e editam usuários
  (`username`/`email`/`role`/`is_verified`) e editam academias; o usuário edita o
  próprio `username` e troca o próprio e-mail com confirmação (**pattern A**: o
  endereço comprovado permanece até o novo ser confirmado por link/OTP). Uma troca
  de e-mail feita pelo admin desverifica a conta e envia um reset de senha ao novo
  endereço; um admin nunca consegue se rebaixar (sempre ≥1 admin).
- **Proteção do event loop** — `@fastify/under-pressure` retorna `503`
  automaticamente quando o lag do event loop ou o uso de heap ultrapassa os limites.
- **Testado** — suite unitária (sem banco) e suite e2e com banco isolado, ambas no CI.

## Configuração

```sh
cp .env.example .env  # preencha os valores (veja Variáveis de ambiente)
pnpm install
pnpm compose:up       # inicia o MySQL no Docker
pnpm migrate          # executa as migrations
pnpm seeddb    # cria o usuário ADMIN com as vars ADMIN_*
pnpm dev              # inicia o servidor em modo dev
```

## Scripts

| Comando         | Descrição                                                         |
| --------------- | ----------------------------------------------------------------- |
| `pnpm dev`      | Inicia o servidor dev com hot-reload                              |
| `pnpm build`    | Build de produção (tsup)                                          |
| `pnpm start`    | Executa o build de produção                                       |
| `pnpm migrate`  | Cria/executa migrations do Prisma                                 |
| `pnpm seeddb`   | Cria o usuário ADMIN (idempotente)                                |
| `pnpm db:fresh` | Zera + recria o banco dev (compose down/up, migrate deploy, seed) |
| `pnpm test`     | Testes unitários                                                  |
| `pnpm test:e2e` | Testes e2e (requer MySQL)                                         |
| `pnpm lint`     | Executa o ESLint                                                  |
| `pnpm lint:fix` | Corrige erros de lint                                             |
| `pnpm compile`  | Type-check do TypeScript                                          |
| `pnpm showdb`   | Abre o Prisma Studio (porta 5555)                                 |
| `pnpm format`   | Formata `src` com Prettier (write)                                |
| `pnpm killapp`  | Libera as portas 3333/5555 + encerra o servidor                   |

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores. A aplicação **falha
imediatamente** no boot se alguma variável for inválida (validação Zod em
`src/env`).

| Variável                     | Obrigatória | Padrão                              | Descrição                                                                                                                                                     |
| ---------------------------- | ----------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                   | sim         | –                                   | `development` \| `test` \| `production`                                                                                                                       |
| `PORT`                       | não         | `3333`                              | Porta HTTP                                                                                                                                                    |
| `JWT_SECRET`                 | sim         | –                                   | Segredo de assinatura, mín. 20 chars (use GitHub Secrets / cofre em CI/produção)                                                                              |
| `DATABASE_URL`               | sim         | –                                   | ex. `mysql://root:docker123@localhost:3306/gympass-db`                                                                                                        |
| `CORS_ORIGIN`                | não         | –                                   | Origens permitidas separadas por vírgula (somente produção)                                                                                                   |
| `PASSWORD_MIN_LENGTH`        | não         | `8`                                 | Tamanho mínimo de senha no cadastro/reset (8–72)                                                                                                              |
| `PASSWORD_PATTERN`           | não         | maiúscula/minúscula/número/especial | Regex de complexidade de senha no cadastro/reset; veja `.env.example` para o literal                                                                          |
| `MIN_TEXT_LENGTH`            | não         | `3`                                 | Tamanho mínimo de campos de texto "nome das coisas" (username, título de gym, busca); piso 3                                                                  |
| `BODY_LIMIT`                 | não         | `16384`                             | Tamanho máximo do body da requisição, em bytes                                                                                                                |
| `LOG_LEVEL`                  | não         | `info`                              | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` \| `silent`                                                                                      |
| `ADMIN_USERNAME`             | sim         | –                                   | Username do ADMIN seed (3–30, letras/números/underscore, gravado lowercase)                                                                                   |
| `ADMIN_EMAIL`                | sim         | –                                   | Email do ADMIN (login)                                                                                                                                        |
| `ADMIN_PASSWORD`             | sim         | –                                   | Senha do ADMIN: mín. 10 chars com maiúscula, minúscula, número e especial (ex. `Admin@12345`)                                                                 |
| `TRUST_PROXY`                | não         | –                                   | `false` \| `true` \| IP do proxy; ative atrás de Nginx/Cloudflare/ALB                                                                                         |
| `MAX_EVENT_LOOP_DELAY`       | não         | `1000`                              | Limiar de lag do event loop em ms antes de retornar 503                                                                                                       |
| `MAX_HEAP_USED_BYTES`        | não         | `209715200`                         | Limiar de heap em bytes antes de retornar 503 (padrão 200 MB)                                                                                                 |
| `LOGIN_MAX_ATTEMPTS`         | não         | `5`                                 | Tentativas falhas antes do bloqueio de conta                                                                                                                  |
| `LOGIN_LOCKOUT_MINUTES`      | não         | `15`                                | Duração do bloqueio em minutos                                                                                                                                |
| `APP_URL`                    | não         | `http://localhost:3333`             | URL pública usada nos e-mails de verificação                                                                                                                  |
| `VERIFICATION_EXPIRES_HOURS` | não         | `24`                                | Validade do link/OTP de verificação em horas                                                                                                                  |
| `REQUIRE_EMAIL_VERIFICATION` | não         | `false`                             | Quando `true`, usuários não verificados recebem `403` em `POST /gyms/:gymId/check-ins` (a única rota bloqueada — veja _Gate de verificação de e-mail_ abaixo) |
| `RESET_EXPIRES_MINUTES`      | não         | `60`                                | Validade do link/OTP de redefinição de senha em minutos                                                                                                       |

## Rotas da API

| Método  | Rota                             | Auth           | Papel   | Descrição                                               |
| ------- | -------------------------------- | -------------- | ------- | ------------------------------------------------------- |
| `GET`   | `/hello`                         | –              | –       | Healthcheck                                             |
| `POST`  | `/users`                         | –              | –       | Cadastrar usuário (com rate limit)                      |
| `POST`  | `/auth/login`                    | –              | –       | Login → access token + cookie de refresh (rate limit)   |
| `PATCH` | `/auth/refresh`                  | refresh cookie | –       | Rotacionar o access token                               |
| `GET`   | `/auth/me`                       | Bearer         | –       | Perfil do usuário autenticado                           |
| `POST`  | `/auth/logout`                   | Bearer         | –       | Revogar o token atual (denylist)                        |
| `PATCH` | `/auth/me`                       | Bearer         | –       | Editar o próprio username                               |
| `POST`  | `/auth/me/email`                 | Bearer         | –       | Solicitar troca do próprio e-mail (confirma no novo)    |
| `POST`  | `/auth/me/email/confirm`         | Bearer         | –       | Confirmar troca do próprio e-mail via OTP               |
| `GET`   | `/gyms/search`                   | Bearer         | –       | Buscar academias por nome                               |
| `GET`   | `/gyms/nearby`                   | Bearer         | –       | Academias próximas a uma coordenada                     |
| `POST`  | `/gyms`                          | Bearer         | `ADMIN` | Cadastrar academia                                      |
| `PATCH` | `/gyms/:gymId`                   | Bearer         | `ADMIN` | Editar academia (título/descrição/telefone)             |
| `GET`   | `/check-ins/history`             | Bearer         | –       | Histórico de check-ins paginado                         |
| `GET`   | `/check-ins/metrics`             | Bearer         | –       | Total de check-ins                                      |
| `POST`  | `/gyms/:gymId/check-ins`         | Bearer         | –       | Fazer check-in (`400` longe demais · `409` já fez hoje) |
| `PATCH` | `/check-ins/:checkInId/validate` | Bearer         | `ADMIN` | Validar check-in (`409` fora da janela de 20 min)       |
| `POST`  | `/users/send-verification`       | Bearer         | –       | Enviar e-mail de verificação (link + OTP)               |
| `GET`   | `/users/verify-email`            | –              | –       | Verificar e-mail via link token (`?token=`)             |
| `POST`  | `/users/verify-email/otp`        | Bearer         | –       | Verificar e-mail via código OTP                         |
| `GET`   | `/users/confirm-email-change`    | –              | –       | Confirmar troca de e-mail via link token (`?token=`)    |
| `POST`  | `/users/resend-verification`     | Bearer         | –       | Reenviar e-mail de verificação                          |
| `POST`  | `/users/forgot-password`         | –              | –       | Solicitar reset; sempre `202` (rate limit)              |
| `POST`  | `/users/reset-password`          | –              | –       | Resetar via link token ou email + OTP (rate limit)      |
| `GET`   | `/users`                         | Bearer         | `ADMIN` | Listar usuários (paginado, 20/página)                   |
| `GET`   | `/users/:userId`                 | Bearer         | `ADMIN` | Buscar um usuário por id                                |
| `PATCH` | `/users/:userId`                 | Bearer         | `ADMIN` | Editar usuário (username/email/role/is_verified)        |

> O JWT carrega um claim `role`, mas a **autorização lê o papel do banco** (por
> id do usuário), não do token. Promover ou rebaixar passa a valer já na próxima
> requisição — sem novo login. O `GET /auth/me` também retorna o `role` lido
> fresh do banco.

### Exemplos de resposta

`POST /auth/login` → `200` (também define o cookie httpOnly `refreshToken`):

```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

`GET /auth/me` → `200` (`is_verified` alimenta o banner de "e-mail não
verificado"; `role` alimenta a UI de RBAC — ambos lidos fresh do banco, não do
token):

```json
{
	"user": {
		"id": "3fa2...c9",
		"username": "fulano",
		"is_verified": false,
		"role": "MEMBER"
	}
}
```

Uma validação com falha retorna `400` com os problemas; um token inválido ou
revogado retorna `401`; a ausência do papel `ADMIN` retorna `403`.

> As **regras de validação de entrada** (tamanhos, formatos, `username`/
> `identifier`, `MIN_TEXT_LENGTH`) são definidas pelo schema Zod de cada rota.
> Os schemas Zod são a fonte única de verdade — veja **Regras de validação
> (entrada)** em [PROJECT-pt-BR.md](PROJECT-pt-BR.md#44-regras-de-validação-entrada)
> para o índice rota → controller.

### Gate de verificação de e-mail (`REQUIRE_EMAIL_VERIFICATION`)

Por padrão (`false`) a verificação é um **soft gate** — qualquer um loga e usa a
API, e `is_verified` só importa onde uma rota exige. Defina a flag como `true`
para forçar.

Exatamente **uma** rota é bloqueada: `POST /gyms/:gymId/check-ins`. Um usuário
autenticado mas não verificado recebe `403 { "message": "Email not verified." }`
ali; toda outra rota se comporta igual a `false`. O gate checa só `is_verified`
(papel é irrelevante — o ADMIN do seed é verificado, então nunca trava) e o lê
**fresh do banco**, então verificar no meio da sessão libera o usuário na hora —
sem relogar.

O que um usuário autenticado e **não verificado** acessa com a flag ligada:

| Rota                                                           | Acesso não verificado                                 |
| -------------------------------------------------------------- | ----------------------------------------------------- |
| `POST /gyms/:gymId/check-ins`                                  | ❌ `403 Email not verified.` — a única rota bloqueada |
| `GET /auth/me`                                                 | ✅ retorna `is_verified: false`                       |
| `POST /auth/logout` · `PATCH /auth/refresh`                    | ✅                                                    |
| `POST /users/send-verification` · `/users/resend-verification` | ✅ (necessário para verificar)                        |
| `POST /users/verify-email/otp` · `GET /users/verify-email`     | ✅ (é como se verifica)                               |
| `GET /gyms/search` · `/gyms/nearby`                            | ✅                                                    |
| `GET /check-ins/history` · `/check-ins/metrics`                | ✅ (vazio até existir um check-in)                    |
| `POST /gyms`                                                   | ✅ se `ADMIN` (papel ≠ verificação)                   |
| `GET /hello` e rotas públicas (login / cadastro / reset)       | ✅                                                    |

**Frontend:** leia `is_verified` do `GET /auth/me`, mostre um banner "confirme
seu e-mail" enquanto for `false`, e desabilite a ação de check-in (ou trate o
`403`). Refaça o fetch de `/auth/me` após o usuário verificar — o banner some sem
relogar.

Smoke test com a flag ligada (DB limpa, servidor reiniciado com
`REQUIRE_EMAIL_VERIFICATION=true`):

```sh
BASE=http://localhost:3333

# cadastra + loga um usuário não verificado
curl -s -X POST "$BASE/users" -H 'Content-Type: application/json' \
  -d '{"username":"fulano","email":"fulano@example.com","password":"Fulano@123"}'
TOKEN=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"identifier":"fulano@example.com","password":"Fulano@123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# /auth/me → is_verified:false  (frontend mostra o banner)
curl -s "$BASE/auth/me" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# check-in sem verificar → 403 Email not verified.
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/gyms/any/check-ins" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"latitude":0,"longitude":0}'                       # espera 403

# rotas de leitura seguem funcionando sem verificar
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/gyms/search?q=" \
  -H "Authorization: Bearer $TOKEN"                        # espera 200
```

## Usuário ADMIN

Não existe endpoint para criar admins. O ADMIN único é provisionado pelo
**seed**, que lê `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` e é
**idempotente** (executar novamente nunca sobrescreve um admin existente):

```sh
pnpm seeddb
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

Com o servidor rodando (`pnpm dev`) e o ADMIN criado (`pnpm seeddb`),
execute o bloco abaixo. Ele percorre todos os grupos de rotas — rotas públicas,
RBAC, busca/proximidade de academias, check-ins (criar/histórico/métricas/
validar), gestão de conta (perfil, troca de e-mail, listar/editar admin), refresh
e revogação de token. Os passos que precisam de um token/OTP de uso único
(verificação de e-mail, reset de senha, confirmação de troca de e-mail) imprimem
o curl para rodar após copiar o valor do log do servidor. As senhas de
cadastro/reset devem atender ao `PASSWORD_MIN_LENGTH` (padrão 8) **e** à política
de complexidade `PASSWORD_PATTERN` (padrão: uma maiúscula, uma minúscula, um
número e um caractere especial).

```sh
BASE="http://127.0.0.1:3333"

# 1. Healthcheck
echo "=== 1. GET /hello ===" && curl -s "$BASE/hello" && echo

# 2. Cadastrar um MEMBER normal (username 3-30 [a-z0-9_]; senha: mín 8 + maiúscula/minúscula/número/especial)
echo -e "\n=== 2. POST /users ===" && \
MEMBER_ID=$(curl -s -X POST "$BASE/users" -H "Content-Type: application/json" \
  -d '{"username":"fulano","email":"fulano@email.com","password":"Fulano@123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])") && \
echo "Member id: $MEMBER_ID"

# 2b. Login para obter um token, enviar e-mail de verificação e então verificar via link/OTP impresso no log do servidor
echo -e "\n=== 2b. POST /users/send-verification (veja o link + OTP no log do servidor) ===" && \
TOKEN_TMP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"fulano@email.com","password":"Fulano@123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/users/send-verification" -H "Authorization: Bearer $TOKEN_TMP" && \
echo "(copie o token do log do servidor e rode:)" && \
echo "  curl '$BASE/users/verify-email?token=<cole-o-token>'"

# 2c. Testar bloqueio: senha errada N vezes -> esperado 429 na última tentativa
echo -e "\n=== 2c. Teste de bloqueio de login (6 tentativas com senha errada) ===" && \
for i in 1 2 3 4 5 6; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"identifier":"fulano@email.com","password":"wrong"}')
  echo "Tentativa $i: $STATUS"
done

# 3. Login como MEMBER por USERNAME (identifier aceita e-mail OU username)
echo -e "\n=== 3. POST /auth/login (member, por username) ===" && \
TOKEN=$(curl -s -c /tmp/cookies.txt -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"fulano","password":"Fulano@123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "Token: ${TOKEN:0:40}..."

# 4. Perfil autenticado
echo -e "\n=== 4. GET /auth/me ===" && \
curl -s "$BASE/auth/me" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 5. Renovar o access token via cookie de refresh
echo -e "\n=== 5. PATCH /auth/refresh ===" && \
curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt -X PATCH "$BASE/auth/refresh" | python3 -m json.tool

# 6. Criar academia como MEMBER -> esperado 403 (papel ADMIN obrigatório)
echo -e "\n=== 6. POST /gyms (esperado 403 - MEMBER) ===" && \
curl -s -X POST "$BASE/gyms" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Academia Teste","description":"Teste","phone":"9999-8888","latitude":-25.4677004,"longitude":-49.304584}' | \
  python3 -m json.tool

# 7. Logout -> revoga o token atual (denylist)
echo -e "\n=== 7. POST /auth/logout ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/auth/logout" -H "Authorization: Bearer $TOKEN"

# 8. Reusar o token revogado -> esperado 401 (token na denylist)
echo -e "\n=== 8. GET /auth/me com token revogado (esperado 401) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  "$BASE/auth/me" -H "Authorization: Bearer $TOKEN"

# 9. Login como ADMIN (identifier = ADMIN_USERNAME ou ADMIN_EMAIL)
echo -e "\n=== 9. POST /auth/login (admin) ===" && \
ADMIN_TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin@12345"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "Admin token: ${ADMIN_TOKEN:0:40}..."

# 10. Criar academia como ADMIN -> esperado 201
echo -e "\n=== 10. POST /gyms (ADMIN - esperado 201) ===" && \
GYM_ID=$(curl -s -X POST "$BASE/gyms" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"title":"Academia SOLID","description":"Treino funcional","phone":"9999-8888","latitude":-25.4677004,"longitude":-49.304584}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['gym']['id'])") && \
echo "Gym id: $GYM_ID"

# 10a. Buscar academias por título (paginado, 20/página)
echo -e "\n=== 10a. GET /gyms/search ===" && \
curl -s "$BASE/gyms/search?query=Academia&page=1" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# 10b. Academias próximas a uma coordenada. O frontend fornece a lat/long do
#      usuário via API de Geolocalização do navegador; raio de 10km, sem paginação.
echo -e "\n=== 10b. GET /gyms/nearby ===" && \
curl -s "$BASE/gyms/nearby?latitude=-25.4677004&longitude=-49.304584" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# 10c. Fazer check-in na academia (precisa estar dentro do raio das coordenadas) -> 201
echo -e "\n=== 10c. POST /gyms/:gymId/check-ins ===" && \
CHECKIN_ID=$(curl -s -X POST "$BASE/gyms/$GYM_ID/check-ins" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"latitude":-25.4677004,"longitude":-49.304584}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['checkIn']['id'])") && \
echo "Check-in id: $CHECKIN_ID"

# 10c-i. Segundo check-in no mesmo dia -> esperado 409 (um check-in por dia)
echo -e "\n=== 10c-i. POST /gyms/:gymId/check-ins de novo (esperado 409) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/gyms/$GYM_ID/check-ins" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"latitude":-25.4677004,"longitude":-49.304584}'

# 10c-ii. Check-in a ~10 km -> esperado 400 (a distância é checada antes da regra
#         por dia, então é 400 mesmo já existindo o check-in de hoje)
echo -e "\n=== 10c-ii. POST /gyms/:gymId/check-ins longe demais (esperado 400) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/gyms/$GYM_ID/check-ins" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"latitude":-25.4349676,"longitude":-49.1669678}'

# 10d. Histórico de check-ins (paginado) + total de métricas
echo -e "\n=== 10d. GET /check-ins/history + /check-ins/metrics ===" && \
curl -s "$BASE/check-ins/history?page=1" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool && \
curl -s "$BASE/check-ins/metrics" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# 10e. Validar o check-in (ADMIN) -> 200
echo -e "\n=== 10e. PATCH /check-ins/:checkInId/validate (ADMIN) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X PATCH "$BASE/check-ins/$CHECKIN_ID/validate" -H "Authorization: Bearer $ADMIN_TOKEN"

# 10e-i. Validar após a janela de 20 minutos -> 409 (LateCheckInValidationError).
#        Não vai como curl ao vivo aqui — precisa do created_at do check-in
#        envelhecido além dos 20 min; coberto pela suíte e2e
#        (check-ins/validate-controller.spec.ts).

# 11. Redefinição de senha: solicite um reset (sempre 202, mesmo para emails
#     desconhecidos), copie o token impresso no log do servidor e redefina.
echo -e "\n=== 11. POST /users/forgot-password (sempre 202) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/users/forgot-password" -H "Content-Type: application/json" \
  -d '{"email":"fulano@email.com"}' && \
echo "(copie o token de reset do log do servidor e rode:)" && \
echo "  curl -X POST '$BASE/users/reset-password' -H 'Content-Type: application/json' \\" && \
echo "    -d '{\"token\":\"<cole-o-token>\",\"newPassword\":\"Newpass@1\"}'"

# 12. Admin edita a academia (PATCH /gyms/:gymId) -> esperado 200
echo -e "\n=== 12. PATCH /gyms/:gymId (ADMIN - esperado 200) ===" && \
curl -s -X PATCH "$BASE/gyms/$GYM_ID" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"title":"Academia SOLID (renomeada)","phone":"1111-2222"}' | python3 -m json.tool

# 13. Admin lista usuários (GET /users) -> esperado 200
echo -e "\n=== 13. GET /users (ADMIN - esperado 200) ===" && \
curl -s "$BASE/users?page=1" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# 13b. Admin busca um usuário por id (GET /users/:userId) -> esperado 200
echo -e "\n=== 13b. GET /users/:userId (ADMIN - esperado 200) ===" && \
curl -s "$BASE/users/$MEMBER_ID" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# 14. Editar o próprio username (PATCH /auth/me) -> esperado 200
echo -e "\n=== 14. PATCH /auth/me (próprio - esperado 200) ===" && \
curl -s -X PATCH "$BASE/auth/me" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"username":"admin_renomeado"}' | python3 -m json.tool

# 15. Admin promove o member a ADMIN (PATCH /users/:userId) -> esperado 200
echo -e "\n=== 15. PATCH /users/:userId (ADMIN promove member - esperado 200) ===" && \
curl -s -X PATCH "$BASE/users/$MEMBER_ID" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role":"ADMIN"}' | python3 -m json.tool

# 16. Troca do próprio e-mail (pattern A): solicita uma confirmação ao NOVO
#     endereço. O endereço ANTIGO segue válido até confirmar; nada muda ainda.
echo -e "\n=== 16. POST /auth/me/email (próprio - esperado 204) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/auth/me/email" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"email":"admin-novo@example.com"}' && \
echo "(copie o link token / OTP do log do servidor e confirme com um dos dois:)" && \
echo "  curl '$BASE/users/confirm-email-change?token=<cole-o-token>'        # link público" && \
echo "  curl -X POST '$BASE/auth/me/email/confirm' -H 'Content-Type: application/json' \\" && \
echo "    -H 'Authorization: Bearer \$ADMIN_TOKEN' -d '{\"code\":\"<cole-o-otp>\"}'  # OTP"
```

## Licença

Distribuído sob a [Licença MIT](LICENSE).
