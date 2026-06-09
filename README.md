# solid_api_sample

GymPass style API built with SOLID principles.

**Stack:** Node.js · Fastify · TypeScript 6 · Prisma 7 · MySQL · Vitest

## Setup

```sh
cp .env.example .env  # then fill in the values (see Environment variables)
pnpm install
pnpm compose:up       # start MySQL in Docker
pnpm migrate          # run migrations
pnpm seed-adm-role    # create the ADMIN user from ADMIN_* env vars
pnpm dev              # start dev server
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with hot-reload |
| `pnpm build` | Production build (tsup) |
| `pnpm start` | Run production build |
| `pnpm migrate` | Run/create Prisma migrations |
| `pnpm seed-adm-role` | Seed the ADMIN user (idempotent) |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | E2E tests (requires MySQL) |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix lint errors |
| `pnpm compile` | TypeScript type-check |
| `pnpm showdb` | Open Prisma Studio (port 5555) |

## Environment variables

Copy `.env.example` to `.env` and fill in the values. The app **fails fast** at
boot if any variable is invalid (Zod validation in `src/env`).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | yes | – | `development` \| `test` \| `production` |
| `PORT` | no | `3333` | HTTP port |
| `JWT_SECRET` | yes | – | Signing secret, min 20 chars (use GitHub Secrets / a vault in CI/prod) |
| `DATABASE_URL` | yes | – | e.g. `mysql://root:docker123@localhost:3306/gympass-db` |
| `CORS_ORIGIN` | no | – | Comma-separated allowed origins (production only) |
| `PASSWORD_MIN_LENGTH` | no | `8` | Minimum registration password length (8–72) |
| `BODY_LIMIT` | no | `16384` | Max request body size, in bytes |
| `LOG_LEVEL` | no | `info` | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` \| `silent` |
| `ADMIN_NAME` | yes | – | Seed ADMIN display name |
| `ADMIN_EMAIL` | yes | – | Seed ADMIN email (login) |
| `ADMIN_PASSWORD` | yes | – | Seed ADMIN password: min 10 chars with upper, lower, number and special (e.g. `Admin@12345`) |

## API routes

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| `GET` | `/hello` | – | – | Healthcheck |
| `POST` | `/users` | – | – | Register a user (rate-limited) |
| `POST` | `/sessions` | – | – | Login → access token + refresh cookie (rate-limited) |
| `PATCH` | `/token/refresh` | refresh cookie | – | Rotate the access token |
| `GET` | `/me` | Bearer | – | Authenticated user profile |
| `POST` | `/logout` | Bearer | – | Revoke the current token (denylist) |
| `GET` | `/gyms/search` | Bearer | – | Search gyms by title |
| `GET` | `/gyms/nearby` | Bearer | – | Gyms near a coordinate |
| `POST` | `/gyms` | Bearer | `ADMIN` | Create a gym |
| `GET` | `/check-ins/history` | Bearer | – | Paginated check-in history |
| `GET` | `/check-ins/metrics` | Bearer | – | Total check-ins count |
| `POST` | `/gyms/:gymId/check-ins` | Bearer | – | Create a check-in |
| `PATCH` | `/check-ins/:checkInId/validate` | Bearer | `ADMIN` | Validate a check-in |

> The `role` (`MEMBER` \| `ADMIN`) is embedded in the JWT at login time.
> Promoting a user does **not** affect tokens already issued — a new login is
> required to obtain a token carrying the new role.

## ADMIN user

There is no endpoint to create admins. The single ADMIN is provisioned by the
**seed**, which reads `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` and is
**idempotent** (re-running it never resets an existing admin):

```sh
pnpm seed-adm-role
```

## Tests

- `pnpm test` — unit tests (use-cases, in-memory repositories, no database).
- `pnpm test:e2e` — HTTP/end-to-end tests. Requires MySQL running; each test
  file runs against an isolated database created on the fly.

## Final verification

```sh
pnpm compile   # type-check, no errors
pnpm lint      # ESLint, no errors
pnpm test      # unit suite
pnpm test:e2e  # e2e suite (MySQL up)
```

### Manual route smoke test

With the server running (`pnpm dev`) and the ADMIN seeded
(`pnpm seed-adm-role`), run the block below. It exercises the public routes,
RBAC, token refresh and token revocation. Registration passwords must be at
least `PASSWORD_MIN_LENGTH` (default 8) characters.

```sh
BASE="http://127.0.0.1:3333"

# 1. Healthcheck
echo "=== 1. GET /hello ===" && curl -s "$BASE/hello" && echo

# 2. Register a regular MEMBER (password >= 8 chars)
echo -e "\n=== 2. POST /users ===" && \
curl -s -X POST "$BASE/users" -H "Content-Type: application/json" \
  -d '{"name":"Fulano","email":"fulano@email.com","password":"password123"}' | python3 -m json.tool

# 3. Login as MEMBER (captures token + refresh cookie)
echo -e "\n=== 3. POST /sessions (member) ===" && \
TOKEN=$(curl -s -c /tmp/cookies.txt -X POST "$BASE/sessions" \
  -H "Content-Type: application/json" \
  -d '{"email":"fulano@email.com","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "Token: ${TOKEN:0:40}..."

# 4. Authenticated profile
echo -e "\n=== 4. GET /me ===" && \
curl -s "$BASE/me" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 5. Refresh the access token via the refresh cookie
echo -e "\n=== 5. PATCH /token/refresh ===" && \
curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt -X PATCH "$BASE/token/refresh" | python3 -m json.tool

# 6. Create a gym as MEMBER -> expected 401 (role ADMIN required)
echo -e "\n=== 6. POST /gyms (expected 401 - MEMBER) ===" && \
curl -s -X POST "$BASE/gyms" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Gym","description":"Test","phone":"9999-8888","latitude":-25.4677004,"longitude":-49.304584}' | \
  python3 -m json.tool

# 7. Logout -> revokes the current token (denylist)
echo -e "\n=== 7. POST /logout ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/logout" -H "Authorization: Bearer $TOKEN"

# 8. Reuse the revoked token -> expected 401 (token is denylisted)
echo -e "\n=== 8. GET /me with revoked token (expected 401) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  "$BASE/me" -H "Authorization: Bearer $TOKEN"

# 9. Login as the seeded ADMIN (use your ADMIN_EMAIL / ADMIN_PASSWORD)
echo -e "\n=== 9. POST /sessions (admin) ===" && \
ADMIN_TOKEN=$(curl -s -X POST "$BASE/sessions" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@12345"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "Admin token: ${ADMIN_TOKEN:0:40}..."

# 10. Create a gym as ADMIN -> expected 201
echo -e "\n=== 10. POST /gyms (ADMIN - expected 201) ===" && \
curl -s -X POST "$BASE/gyms" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"title":"Academia SOLID","description":"Treino funcional","phone":"9999-8888","latitude":-25.4677004,"longitude":-49.304584}' | \
  python3 -m json.tool
```

## Architecture

See [PROJECT.md](PROJECT.md) for the full architecture reference: request
lifecycle, security model (RBAC, rate limiting, token denylist), data layer,
and operational concerns (fail-fast env, logging, graceful shutdown).
