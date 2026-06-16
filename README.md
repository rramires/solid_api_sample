# solid_api_sample

GymPass style API built with SOLID principles.

> 🇧🇷 Versão em português: [README-pt-BR.md](README-pt-BR.md)

## Architecture

For the full architecture reference (request lifecycle, security model, data
layer, CI/CD and operational concerns) see:

- [PROJECT.md](PROJECT.md) — English
- [PROJECT-pt-BR.md](PROJECT-pt-BR.md) — Português

[![Unit Tests](https://github.com/rramires/solid_api_sample/actions/workflows/run-unit-tests.yml/badge.svg)](https://github.com/rramires/solid_api_sample/actions/workflows/run-unit-tests.yml)
[![E2E Tests](https://github.com/rramires/solid_api_sample/actions/workflows/run-e2e-tests.yml/badge.svg)](https://github.com/rramires/solid_api_sample/actions/workflows/run-e2e-tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Stack:** Node.js · Fastify · TypeScript 6 · Prisma 7 · MySQL · Vitest

## Features

- **SOLID, layered architecture** — controllers, use-cases, and repository
  interfaces with both Prisma and in-memory implementations.
- **JWT auth with refresh tokens** — short-lived access token plus an
  httpOnly refresh cookie.
- **RBAC** — `MEMBER` / `ADMIN` roles enforced per route.
- **Token revocation & rotation** — logout revokes both the access and the
  refresh token; refresh tokens are single-use (rotated on every refresh) via a
  hybrid (in-memory + database) `jti` denylist.
- **Global session invalidation** — a password reset invalidates every token
  issued beforehand, via a `password_changed_at` registry.
- **Rate limiting** — global limits plus stricter limits on auth routes.
- **Security hardening** — Helmet headers, per-environment CORS, configurable
  password policy, request body size cap, and login timing equalization to
  prevent user enumeration.
- **Operability** — fail-fast env validation, structured `pino` logging, and
  graceful shutdown.
- **Per-account login lockout** — after N failed attempts the account is locked
  for a configurable period (in-memory today, drop-in Redis replacement via
  `ILoginAttemptTracker`).
- **Email verification** — link + OTP flow with a pluggable email provider seam
  (`IEmailProvider`); OTP attempts are capped and resends are throttled;
  `ConsoleEmailProvider` logs to stdout in dev. `is_verified` is read from the
  database (through a cache), never trusted from a stale JWT claim.
- **Password reset** — anti-enumeration `forgot-password` (always answers
  `202`) plus link- or OTP-based `reset-password`; tokens are stored as SHA-256
  hashes, single-use and attempt-capped, and a successful reset triggers a
  global logout.
- **Event-loop protection** — `@fastify/under-pressure` returns `503`
  automatically when event-loop lag or heap usage exceeds configured thresholds.
- **Tested** — unit suite (no DB) and isolated-database e2e suite, both in CI.

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

| Command              | Description                      |
| -------------------- | -------------------------------- |
| `pnpm dev`           | Start dev server with hot-reload |
| `pnpm build`         | Production build (tsup)          |
| `pnpm start`         | Run production build             |
| `pnpm migrate`       | Run/create Prisma migrations     |
| `pnpm seed-adm-role` | Seed the ADMIN user (idempotent) |
| `pnpm test`          | Unit tests                       |
| `pnpm test:e2e`      | E2E tests (requires MySQL)       |
| `pnpm lint`          | Run ESLint                       |
| `pnpm lint:fix`      | Fix lint errors                  |
| `pnpm compile`       | TypeScript type-check            |
| `pnpm showdb`        | Open Prisma Studio (port 5555)   |

## Environment variables

Copy `.env.example` to `.env` and fill in the values. The app **fails fast** at
boot if any variable is invalid (Zod validation in `src/env`).

| Variable                     | Required | Default                 | Description                                                                                  |
| ---------------------------- | -------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| `NODE_ENV`                   | yes      | –                       | `development` \| `test` \| `production`                                                      |
| `PORT`                       | no       | `3333`                  | HTTP port                                                                                    |
| `JWT_SECRET`                 | yes      | –                       | Signing secret, min 20 chars (use GitHub Secrets / a vault in CI/prod)                       |
| `DATABASE_URL`               | yes      | –                       | e.g. `mysql://root:docker123@localhost:3306/gympass-db`                                      |
| `CORS_ORIGIN`                | no       | –                       | Comma-separated allowed origins (production only)                                            |
| `PASSWORD_MIN_LENGTH`        | no       | `8`                     | Minimum registration password length (8–72)                                                  |
| `MIN_TEXT_LENGTH`            | no       | `3`                     | Minimum length for text "name-of-things" fields (username, gym title, search); floor of 3    |
| `BODY_LIMIT`                 | no       | `16384`                 | Max request body size, in bytes                                                              |
| `LOG_LEVEL`                  | no       | `info`                  | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` \| `silent`                     |
| `ADMIN_USERNAME`             | yes      | –                       | Seed ADMIN username (3–30, letters/numbers/underscore, stored lowercase)                     |
| `ADMIN_EMAIL`                | yes      | –                       | Seed ADMIN email (login)                                                                     |
| `ADMIN_PASSWORD`             | yes      | –                       | Seed ADMIN password: min 10 chars with upper, lower, number and special (e.g. `Admin@12345`) |
| `TRUST_PROXY`                | no       | –                       | `false` \| `true` \| proxy IP; enable when behind Nginx/Cloudflare/ALB                       |
| `MAX_EVENT_LOOP_DELAY`       | no       | `1000`                  | Event-loop lag threshold in ms before returning 503                                          |
| `MAX_HEAP_USED_BYTES`        | no       | `209715200`             | Heap threshold in bytes before returning 503 (default 200 MB)                                |
| `LOGIN_MAX_ATTEMPTS`         | no       | `5`                     | Failed login attempts before account lockout                                                 |
| `LOGIN_LOCKOUT_MINUTES`      | no       | `15`                    | Account lockout duration in minutes                                                          |
| `APP_URL`                    | no       | `http://localhost:3333` | Public URL used in verification emails                                                       |
| `VERIFICATION_EXPIRES_HOURS` | no       | `24`                    | Verification link/OTP validity in hours                                                      |
| `REQUIRE_EMAIL_VERIFICATION` | no       | `false`                 | When `true`, unverified users are blocked on protected routes                                |
| `RESET_EXPIRES_MINUTES`      | no       | `60`                    | Password-reset link/OTP validity in minutes                                                  |

## API routes

| Method  | Route                            | Auth           | Role    | Description                                          |
| ------- | -------------------------------- | -------------- | ------- | ---------------------------------------------------- |
| `GET`   | `/hello`                         | –              | –       | Healthcheck                                          |
| `POST`  | `/users`                         | –              | –       | Register a user (rate-limited)                       |
| `POST`  | `/auth/login`                    | –              | –       | Login → access token + refresh cookie (rate-limited) |
| `PATCH` | `/auth/refresh`                  | refresh cookie | –       | Rotate the access token                              |
| `GET`   | `/auth/me`                       | Bearer         | –       | Authenticated user profile                           |
| `POST`  | `/auth/logout`                   | Bearer         | –       | Revoke the current token (denylist)                  |
| `GET`   | `/gyms/search`                   | Bearer         | –       | Search gyms by title                                 |
| `GET`   | `/gyms/nearby`                   | Bearer         | –       | Gyms near a coordinate                               |
| `POST`  | `/gyms`                          | Bearer         | `ADMIN` | Create a gym                                         |
| `GET`   | `/check-ins/history`             | Bearer         | –       | Paginated check-in history                           |
| `GET`   | `/check-ins/metrics`             | Bearer         | –       | Total check-ins count                                |
| `POST`  | `/gyms/:gymId/check-ins`         | Bearer         | –       | Create a check-in                                    |
| `PATCH` | `/check-ins/:checkInId/validate` | Bearer         | `ADMIN` | Validate a check-in                                  |
| `POST`  | `/users/send-verification`       | Bearer         | –       | Send verification email (link + OTP)                 |
| `GET`   | `/users/verify-email`            | –              | –       | Verify email via link token (`?token=`)              |
| `POST`  | `/users/verify-email/otp`        | Bearer         | –       | Verify email via OTP code                            |
| `POST`  | `/users/resend-verification`     | Bearer         | –       | Resend verification email                            |
| `POST`  | `/users/forgot-password`         | –              | –       | Request a reset; always `202` (rate-limited)         |
| `POST`  | `/users/reset-password`          | –              | –       | Reset via link token or email + OTP (rate-limited)   |

> The `role` (`MEMBER` \| `ADMIN`) is embedded in the JWT at login time.
> Promoting a user does **not** affect tokens already issued — a new login is
> required to obtain a token carrying the new role.

### Example responses

`POST /auth/login` → `200` (also sets the `refreshToken` httpOnly cookie):

```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

`GET /auth/me` → `200`:

```json
{ "user": { "id": "3fa2...c9", "username": "fulano" } }
```

A failed validation returns `400` with the issues; an unauthorized or revoked
token returns `401`; a missing `ADMIN` role returns `403`.

> **Input validation rules** (field lengths, formats, `username`/`identifier`
> shapes, `MIN_TEXT_LENGTH`) are defined by each route's Zod schema. The Zod
> schemas are the single source of truth — see **Input validation (request)** in
> [PROJECT.md](PROJECT.md#44-input-validation-request) for the route → controller
> index.

## ADMIN user

There is no endpoint to create admins. The single ADMIN is provisioned by the
**seed**, which reads `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` and is
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

# 2. Register a regular MEMBER (username 3-30 [a-z0-9_], password >= 8 chars)
echo -e "\n=== 2. POST /users ===" && \
curl -s -X POST "$BASE/users" -H "Content-Type: application/json" \
  -d '{"username":"fulano","email":"fulano@email.com","password":"password123"}' | python3 -m json.tool

# 2b. Login to get a token, send verification email, then verify via the link/OTP printed to the server log
echo -e "\n=== 2b. POST /users/send-verification (check server log for link + OTP) ===" && \
TOKEN_TMP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"fulano@email.com","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/users/send-verification" -H "Authorization: Bearer $TOKEN_TMP" && \
echo "(copy the token from the server log and run:)" && \
echo "  curl '$BASE/users/verify-email?token=<paste-token>'"

# 2c. Test lockout: try wrong password N times -> expected 429 on the last attempt
echo -e "\n=== 2c. Login lockout test (6 attempts with wrong password) ===" && \
for i in 1 2 3 4 5 6; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"identifier":"fulano@email.com","password":"wrong"}')
  echo "Attempt $i: $STATUS"
done

# 3. Login as MEMBER by USERNAME (identifier accepts email OR username)
echo -e "\n=== 3. POST /auth/login (member, by username) ===" && \
TOKEN=$(curl -s -c /tmp/cookies.txt -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"fulano","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "Token: ${TOKEN:0:40}..."

# 4. Authenticated profile
echo -e "\n=== 4. GET /auth/me ===" && \
curl -s "$BASE/auth/me" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 5. Refresh the access token via the refresh cookie
echo -e "\n=== 5. PATCH /auth/refresh ===" && \
curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt -X PATCH "$BASE/auth/refresh" | python3 -m json.tool

# 6. Create a gym as MEMBER -> expected 401 (role ADMIN required)
echo -e "\n=== 6. POST /gyms (expected 401 - MEMBER) ===" && \
curl -s -X POST "$BASE/gyms" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Gym","description":"Test","phone":"9999-8888","latitude":-25.4677004,"longitude":-49.304584}' | \
  python3 -m json.tool

# 7. Logout -> revokes the current token (denylist)
echo -e "\n=== 7. POST /auth/logout ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/auth/logout" -H "Authorization: Bearer $TOKEN"

# 8. Reuse the revoked token -> expected 401 (token is denylisted)
echo -e "\n=== 8. GET /auth/me with revoked token (expected 401) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  "$BASE/auth/me" -H "Authorization: Bearer $TOKEN"

# 9. Login as the seeded ADMIN (identifier = ADMIN_USERNAME or ADMIN_EMAIL)
echo -e "\n=== 9. POST /auth/login (admin) ===" && \
ADMIN_TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin@12345"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "Admin token: ${ADMIN_TOKEN:0:40}..."

# 10. Create a gym as ADMIN -> expected 201
echo -e "\n=== 10. POST /gyms (ADMIN - expected 201) ===" && \
curl -s -X POST "$BASE/gyms" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"title":"Academia SOLID","description":"Treino funcional","phone":"9999-8888","latitude":-25.4677004,"longitude":-49.304584}' | \
  python3 -m json.tool

# 11. Password reset: request a reset (always 202, even for unknown emails),
#     then copy the token printed to the server log and reset the password.
echo -e "\n=== 11. POST /users/forgot-password (always 202) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/users/forgot-password" -H "Content-Type: application/json" \
  -d '{"email":"fulano@email.com"}' && \
echo "(copy the reset token from the server log and run:)" && \
echo "  curl -X POST '$BASE/users/reset-password' -H 'Content-Type: application/json' \\" && \
echo "    -d '{\"token\":\"<paste-token>\",\"newPassword\":\"newpass123\"}'"
```

## License

Released under the [MIT License](LICENSE).
