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
- **RBAC** — `MEMBER` / `ADMIN` roles enforced per route; the role is read from
  the database at check time, never trusted from the JWT claim.
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
- **Account management** — admins list and edit users
  (`username`/`email`/`role`/`is_verified`) and edit gyms; a user edits their own
  `username` and changes their own email with confirmation (**pattern A**: the
  proven address stays until the new one is confirmed by link/OTP). An admin
  email change unverifies the account and sends a password reset to the new
  address; an admin can never demote themselves (always ≥1 admin).
- **Event-loop protection** — `@fastify/under-pressure` returns `503`
  automatically when event-loop lag or heap usage exceeds configured thresholds.
- **Tested** — unit suite (no DB) and isolated-database e2e suite, both in CI.

## Setup

```sh
cp .env.example .env  # then fill in the values (see Environment variables)
pnpm install
pnpm compose:up       # start MySQL in Docker
pnpm migrate          # run migrations
pnpm seeddb    # create the ADMIN user from ADMIN_* env vars
pnpm dev              # start dev server
```

## Scripts

| Command         | Description                                                        |
| --------------- | ------------------------------------------------------------------ |
| `pnpm dev`      | Start dev server with hot-reload                                   |
| `pnpm build`    | Production build (tsup)                                            |
| `pnpm start`    | Run production build                                               |
| `pnpm migrate`  | Run/create Prisma migrations                                       |
| `pnpm seeddb`   | Seed the ADMIN user (idempotent)                                   |
| `pnpm db:fresh` | Wipe + recreate the dev DB (compose down/up, migrate deploy, seed) |
| `pnpm test`     | Unit tests                                                         |
| `pnpm test:e2e` | E2E tests (requires MySQL)                                         |
| `pnpm lint`     | Run ESLint                                                         |
| `pnpm lint:fix` | Fix lint errors                                                    |
| `pnpm compile`  | TypeScript type-check                                              |
| `pnpm showdb`   | Open Prisma Studio (port 5555)                                     |
| `pnpm format`   | Format `src` with Prettier (write)                                 |
| `pnpm killapp`  | Free dev ports 3333/5555 + stop the server                         |

## Environment variables

Copy `.env.example` to `.env` and fill in the values. The app **fails fast** at
boot if any variable is invalid (Zod validation in `src/env`).

| Variable                     | Required | Default                    | Description                                                                                                                           |
| ---------------------------- | -------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                   | yes      | –                          | `development` \| `test` \| `production`                                                                                               |
| `PORT`                       | no       | `3333`                     | HTTP port                                                                                                                             |
| `JWT_SECRET`                 | yes      | –                          | Signing secret, min 20 chars (use GitHub Secrets / a vault in CI/prod)                                                                |
| `DATABASE_URL`               | yes      | –                          | e.g. `mysql://root:docker123@localhost:3306/gympass-db`                                                                               |
| `CORS_ORIGIN`                | no       | –                          | Comma-separated allowed origins (production only)                                                                                     |
| `PASSWORD_MIN_LENGTH`        | no       | `8`                        | Minimum register/reset password length (8–72)                                                                                         |
| `PASSWORD_PATTERN`           | no       | upper/lower/number/special | Password complexity regex for register/reset; see `.env.example` for the literal                                                      |
| `MIN_TEXT_LENGTH`            | no       | `3`                        | Minimum length for text "name-of-things" fields (username, gym title, search); floor of 3                                             |
| `BODY_LIMIT`                 | no       | `16384`                    | Max request body size, in bytes                                                                                                       |
| `LOG_LEVEL`                  | no       | `info`                     | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` \| `silent`                                                              |
| `ADMIN_USERNAME`             | yes      | –                          | Seed ADMIN username (3–30, letters/numbers/underscore, stored lowercase)                                                              |
| `ADMIN_EMAIL`                | yes      | –                          | Seed ADMIN email (login)                                                                                                              |
| `ADMIN_PASSWORD`             | yes      | –                          | Seed ADMIN password: min 10 chars with upper, lower, number and special (e.g. `Admin@12345`)                                          |
| `TRUST_PROXY`                | no       | –                          | `false` \| `true` \| proxy IP; enable when behind Nginx/Cloudflare/ALB                                                                |
| `MAX_EVENT_LOOP_DELAY`       | no       | `1000`                     | Event-loop lag threshold in ms before returning 503                                                                                   |
| `MAX_HEAP_USED_BYTES`        | no       | `209715200`                | Heap threshold in bytes before returning 503 (default 200 MB)                                                                         |
| `LOGIN_MAX_ATTEMPTS`         | no       | `5`                        | Failed login attempts before account lockout                                                                                          |
| `LOGIN_LOCKOUT_MINUTES`      | no       | `15`                       | Account lockout duration in minutes                                                                                                   |
| `APP_URL`                    | no       | `http://localhost:3333`    | Public URL used in verification emails                                                                                                |
| `VERIFICATION_EXPIRES_HOURS` | no       | `24`                       | Verification link/OTP validity in hours                                                                                               |
| `REQUIRE_EMAIL_VERIFICATION` | no       | `false`                    | When `true`, unverified users get `403` on `POST /gyms/:gymId/check-ins` (the only gated route — see _Email verification gate_ below) |
| `RESET_EXPIRES_MINUTES`      | no       | `60`                       | Password-reset link/OTP validity in minutes                                                                                           |

## API routes

| Method  | Route                            | Auth           | Role    | Description                                                        |
| ------- | -------------------------------- | -------------- | ------- | ------------------------------------------------------------------ |
| `GET`   | `/hello`                         | –              | –       | Healthcheck                                                        |
| `POST`  | `/users`                         | –              | –       | Register a user (rate-limited)                                     |
| `POST`  | `/auth/login`                    | –              | –       | Login → access token + refresh cookie (rate-limited)               |
| `PATCH` | `/auth/refresh`                  | refresh cookie | –       | Rotate the access token                                            |
| `GET`   | `/auth/me`                       | Bearer         | –       | Authenticated user profile                                         |
| `POST`  | `/auth/logout`                   | Bearer         | –       | Revoke the current token (denylist)                                |
| `PATCH` | `/auth/me`                       | Bearer         | –       | Edit own username                                                  |
| `POST`  | `/auth/me/email`                 | Bearer         | –       | Request own email change (confirmation to new email)               |
| `POST`  | `/auth/me/email/confirm`         | Bearer         | –       | Confirm own email change via OTP                                   |
| `GET`   | `/gyms/search`                   | Bearer         | –       | Search gyms by title                                               |
| `GET`   | `/gyms/nearby`                   | Bearer         | –       | Gyms near a coordinate                                             |
| `POST`  | `/gyms`                          | Bearer         | `ADMIN` | Create a gym                                                       |
| `PATCH` | `/gyms/:gymId`                   | Bearer         | `ADMIN` | Edit a gym (title/description/phone)                               |
| `GET`   | `/check-ins/history`             | Bearer         | –       | Paginated check-in history                                         |
| `GET`   | `/check-ins/metrics`             | Bearer         | –       | Total check-ins count                                              |
| `POST`  | `/gyms/:gymId/check-ins`         | Bearer         | –       | Create a check-in (`400` too far · `409` already checked in today) |
| `PATCH` | `/check-ins/:checkInId/validate` | Bearer         | `ADMIN` | Validate a check-in (`409` past the 20-min window)                 |
| `POST`  | `/users/send-verification`       | Bearer         | –       | Send verification email (link + OTP)                               |
| `GET`   | `/users/verify-email`            | –              | –       | Verify email via link token (`?token=`)                            |
| `POST`  | `/users/verify-email/otp`        | Bearer         | –       | Verify email via OTP code                                          |
| `GET`   | `/users/confirm-email-change`    | –              | –       | Confirm an email change via link token (`?token=`)                 |
| `POST`  | `/users/resend-verification`     | Bearer         | –       | Resend verification email                                          |
| `POST`  | `/users/forgot-password`         | –              | –       | Request a reset; always `202` (rate-limited)                       |
| `POST`  | `/users/reset-password`          | –              | –       | Reset via link token or email + OTP (rate-limited)                 |
| `GET`   | `/users`                         | Bearer         | `ADMIN` | List users (paginated, 20/page)                                    |
| `GET`   | `/users/:userId`                 | Bearer         | `ADMIN` | Fetch a single user by id                                          |
| `PATCH` | `/users/:userId`                 | Bearer         | `ADMIN` | Edit a user (username/email/role/is_verified)                      |

> The JWT carries a `role` claim, but **authorization reads the role from the
> database** (by user id), not from the token. A promotion or demotion takes
> effect on the very next request — no re-login needed. `GET /auth/me` likewise
> returns the `role` read fresh from the DB.

### Example responses

`POST /auth/login` → `200` (also sets the `refreshToken` httpOnly cookie):

```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

`GET /auth/me` → `200` (`is_verified` drives an "unverified email" banner; `role`
drives RBAC UI — both read fresh from the DB, not the token):

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

A failed validation returns `400` with the issues; an unauthorized or revoked
token returns `401`; a missing `ADMIN` role returns `403`.

> **Input validation rules** (field lengths, formats, `username`/`identifier`
> shapes, `MIN_TEXT_LENGTH`) are defined by each route's Zod schema. The Zod
> schemas are the single source of truth — see **Input validation (request)** in
> [PROJECT.md](PROJECT.md#44-input-validation-request) for the route → controller
> index.

### Email verification gate (`REQUIRE_EMAIL_VERIFICATION`)

By default (`false`) verification is a **soft gate** — anyone can log in and use
the API, and `is_verified` only matters where a route opts in. Set the flag to
`true` to enforce it.

Exactly **one** route is gated: `POST /gyms/:gymId/check-ins`. An authenticated
but unverified user gets `403 { "message": "Email not verified." }` there; every
other route behaves exactly as with `false`. The gate checks `is_verified` only
(role is irrelevant — the seeded ADMIN is verified, so it is never locked out)
and reads it **fresh from the DB**, so verifying mid-session unblocks the user
immediately — no re-login.

What an authenticated, **unverified** user can reach with the flag on:

| Route                                                          | Unverified access                                   |
| -------------------------------------------------------------- | --------------------------------------------------- |
| `POST /gyms/:gymId/check-ins`                                  | ❌ `403 Email not verified.` — the only gated route |
| `GET /auth/me`                                                 | ✅ returns `is_verified: false`                     |
| `POST /auth/logout` · `PATCH /auth/refresh`                    | ✅                                                  |
| `POST /users/send-verification` · `/users/resend-verification` | ✅ (needed to verify)                               |
| `POST /users/verify-email/otp` · `GET /users/verify-email`     | ✅ (this is how you verify)                         |
| `GET /gyms/search` · `/gyms/nearby`                            | ✅                                                  |
| `GET /check-ins/history` · `/check-ins/metrics`                | ✅ (empty until a check-in exists)                  |
| `POST /gyms`                                                   | ✅ when `ADMIN` (role ≠ verification)               |
| `GET /hello` and public routes (login / register / reset)      | ✅                                                  |

**Frontend:** read `is_verified` from `GET /auth/me`, show a "confirm your email"
banner while it is `false`, and disable the check-in action (or handle the
`403`). Re-fetch `/auth/me` after the user verifies — the banner clears without a
re-login.

Smoke test with the flag on (clean DB, server restarted with
`REQUIRE_EMAIL_VERIFICATION=true`):

```sh
BASE=http://localhost:3333

# register + log in an unverified user
curl -s -X POST "$BASE/users" -H 'Content-Type: application/json' \
  -d '{"username":"fulano","email":"fulano@example.com","password":"Fulano@123"}'
TOKEN=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"identifier":"fulano@example.com","password":"Fulano@123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# /auth/me → is_verified:false  (frontend shows the banner)
curl -s "$BASE/auth/me" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# check-in while unverified → 403 Email not verified.
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/gyms/any/check-ins" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"latitude":0,"longitude":0}'                       # expect 403

# read-only routes still work unverified
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/gyms/search?q=" \
  -H "Authorization: Bearer $TOKEN"                        # expect 200
```

## ADMIN user

There is no endpoint to create admins. The single ADMIN is provisioned by the
**seed**, which reads `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` and is
**idempotent** (re-running it never resets an existing admin):

```sh
pnpm seeddb
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
(`pnpm seeddb`), run the block below. It walks every route group —
public routes, RBAC, gym search/nearby, check-ins (create/history/metrics/
validate), account management (profile, email change, admin list/edit), token
refresh and revocation. Steps that need a one-time token/OTP (email
verification, password reset, email-change confirm) print the curl to run after
copying the value from the server log. Register/reset passwords must meet
`PASSWORD_MIN_LENGTH` (default 8) **and** the `PASSWORD_PATTERN` complexity
policy (default: an uppercase, a lowercase, a number and a special character).

```sh
BASE="http://127.0.0.1:3333"

# 1. Healthcheck
echo "=== 1. GET /hello ===" && curl -s "$BASE/hello" && echo

# 2. Register a regular MEMBER (username 3-30 [a-z0-9_]; password: min 8 + upper/lower/number/special)
echo -e "\n=== 2. POST /users ===" && \
MEMBER_ID=$(curl -s -X POST "$BASE/users" -H "Content-Type: application/json" \
  -d '{"username":"fulano","email":"fulano@email.com","password":"Fulano@123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])") && \
echo "Member id: $MEMBER_ID"

# 2b. Login to get a token, send verification email, then verify via the link/OTP printed to the server log
echo -e "\n=== 2b. POST /users/send-verification (check server log for link + OTP) ===" && \
TOKEN_TMP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"fulano@email.com","password":"Fulano@123"}' | \
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
  -d '{"identifier":"fulano","password":"Fulano@123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "Token: ${TOKEN:0:40}..."

# 4. Authenticated profile
echo -e "\n=== 4. GET /auth/me ===" && \
curl -s "$BASE/auth/me" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 5. Refresh the access token via the refresh cookie
echo -e "\n=== 5. PATCH /auth/refresh ===" && \
curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt -X PATCH "$BASE/auth/refresh" | python3 -m json.tool

# 6. Create a gym as MEMBER -> expected 403 (role ADMIN required)
echo -e "\n=== 6. POST /gyms (expected 403 - MEMBER) ===" && \
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
GYM_ID=$(curl -s -X POST "$BASE/gyms" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"title":"Academia SOLID","description":"Treino funcional","phone":"9999-8888","latitude":-25.4677004,"longitude":-49.304584}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['gym']['id'])") && \
echo "Gym id: $GYM_ID"

# 10a. Search gyms by title (paginated, 20/page)
echo -e "\n=== 10a. GET /gyms/search ===" && \
curl -s "$BASE/gyms/search?query=Academia&page=1" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# 10b. Gyms near a coordinate. The frontend supplies the user's lat/long from the
#      browser Geolocation API; 10km radius, no pagination.
echo -e "\n=== 10b. GET /gyms/nearby ===" && \
curl -s "$BASE/gyms/nearby?latitude=-25.4677004&longitude=-49.304584" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# 10c. Check in at the gym (must be within range of the gym's coordinates) -> 201
echo -e "\n=== 10c. POST /gyms/:gymId/check-ins ===" && \
CHECKIN_ID=$(curl -s -X POST "$BASE/gyms/$GYM_ID/check-ins" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"latitude":-25.4677004,"longitude":-49.304584}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['checkIn']['id'])") && \
echo "Check-in id: $CHECKIN_ID"

# 10c-i. Second check-in the same day -> expected 409 (one check-in per day)
echo -e "\n=== 10c-i. POST /gyms/:gymId/check-ins again (expected 409) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/gyms/$GYM_ID/check-ins" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"latitude":-25.4677004,"longitude":-49.304584}'

# 10c-ii. Check-in ~10 km away -> expected 400 (distance is checked before the
#         per-day rule, so it is 400 even after today's check-in exists)
echo -e "\n=== 10c-ii. POST /gyms/:gymId/check-ins too far (expected 400) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/gyms/$GYM_ID/check-ins" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"latitude":-25.4349676,"longitude":-49.1669678}'

# 10d. Check-in history (paginated) + total metrics
echo -e "\n=== 10d. GET /check-ins/history + /check-ins/metrics ===" && \
curl -s "$BASE/check-ins/history?page=1" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool && \
curl -s "$BASE/check-ins/metrics" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# 10e. Validate the check-in (ADMIN) -> 200
echo -e "\n=== 10e. PATCH /check-ins/:checkInId/validate (ADMIN) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X PATCH "$BASE/check-ins/$CHECKIN_ID/validate" -H "Authorization: Bearer $ADMIN_TOKEN"

# 10e-i. Validating after the 20-minute window -> 409 (LateCheckInValidationError).
#        Not a live curl here — it needs the check-in's created_at aged past 20 min;
#        covered by the e2e suite (check-ins/validate-controller.spec.ts).

# 11. Password reset: request a reset (always 202, even for unknown emails),
#     then copy the token printed to the server log and reset the password.
echo -e "\n=== 11. POST /users/forgot-password (always 202) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/users/forgot-password" -H "Content-Type: application/json" \
  -d '{"email":"fulano@email.com"}' && \
echo "(copy the reset token from the server log and run:)" && \
echo "  curl -X POST '$BASE/users/reset-password' -H 'Content-Type: application/json' \\" && \
echo "    -d '{\"token\":\"<paste-token>\",\"newPassword\":\"Newpass@1\"}'"

# 12. Admin edits the gym (PATCH /gyms/:gymId) -> expected 200
echo -e "\n=== 12. PATCH /gyms/:gymId (ADMIN - expected 200) ===" && \
curl -s -X PATCH "$BASE/gyms/$GYM_ID" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"title":"Academia SOLID (renamed)","phone":"1111-2222"}' | python3 -m json.tool

# 13. Admin lists users (GET /users) -> expected 200
echo -e "\n=== 13. GET /users (ADMIN - expected 200) ===" && \
curl -s "$BASE/users?page=1" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# 13b. Admin fetches one user by id (GET /users/:userId) -> expected 200
echo -e "\n=== 13b. GET /users/:userId (ADMIN - expected 200) ===" && \
curl -s "$BASE/users/$MEMBER_ID" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# 14. Self edits own username (PATCH /auth/me) -> expected 200
echo -e "\n=== 14. PATCH /auth/me (self - expected 200) ===" && \
curl -s -X PATCH "$BASE/auth/me" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"username":"admin_renamed"}' | python3 -m json.tool

# 15. Admin promotes the member to ADMIN (PATCH /users/:userId) -> expected 200
echo -e "\n=== 15. PATCH /users/:userId (ADMIN promotes member - expected 200) ===" && \
curl -s -X PATCH "$BASE/users/$MEMBER_ID" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role":"ADMIN"}' | python3 -m json.tool

# 16. Self email change (pattern A): request a confirmation to the NEW address.
#     The OLD address stays valid until you confirm; nothing changes yet.
echo -e "\n=== 16. POST /auth/me/email (self - expected 204) ===" && \
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "$BASE/auth/me/email" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"email":"admin-new@example.com"}' && \
echo "(copy the link token / OTP from the server log, then confirm with either:)" && \
echo "  curl '$BASE/users/confirm-email-change?token=<paste-token>'        # public link" && \
echo "  curl -X POST '$BASE/auth/me/email/confirm' -H 'Content-Type: application/json' \\" && \
echo "    -H 'Authorization: Bearer \$ADMIN_TOKEN' -d '{\"code\":\"<paste-otp>\"}'  # OTP"
```

## License

Released under the [MIT License](LICENSE).
