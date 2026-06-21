import 'dotenv/config'

import { z } from 'zod'

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']),
	PORT: z.coerce.number().default(3333),
	JWT_SECRET: z.string().min(20, 'Minimum 20 characters'),
	// MySQL connection string consumed by the Prisma adapter (src/lib/prisma.ts).
	DATABASE_URL: z.url('Must be a valid connection URL'),
	CORS_ORIGIN: z.string().optional(),
	PASSWORD_MIN_LENGTH: z.coerce.number().int().min(8).max(72).default(8),
	// Password complexity regex (length comes from PASSWORD_MIN_LENGTH above).
	// Default requires an uppercase, a lowercase, a number and a special char.
	// Validated at boot (must compile) and exposed as a RegExp.
	PASSWORD_PATTERN: z
		.string()
		.default('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$')
		.refine((p) => {
			try {
				new RegExp(p)
				return true
			} catch {
				return false
			}
		}, 'Must be a valid regular expression')
		.transform((p) => new RegExp(p)),
	// Minimum length for "name-of-things" text fields (username, gym title,
	// search query). Floor of 3 — boot fails if set lower.
	MIN_TEXT_LENGTH: z.coerce.number().int().min(3).default(3),
	BODY_LIMIT: z.coerce.number().int().positive().default(16_384),
	LOG_LEVEL: z
		.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
		.default('info'),
	// Reverse-proxy trust. 'false' | 'true' | specific IP string.
	TRUST_PROXY: z.string().optional(),
	// Under-pressure thresholds.
	MAX_EVENT_LOOP_DELAY: z.coerce.number().optional().default(1000),
	MAX_HEAP_USED_BYTES: z.coerce.number().optional().default(209_715_200),
	// Login lockout settings.
	LOGIN_MAX_ATTEMPTS: z.coerce
		.number()
		.int()
		.positive()
		.optional()
		.default(5),
	LOGIN_LOCKOUT_MINUTES: z.coerce
		.number()
		.int()
		.positive()
		.optional()
		.default(15),
	// Email verification settings.
	APP_URL: z.url().optional().default('http://localhost:3333'),
	VERIFICATION_EXPIRES_HOURS: z.coerce
		.number()
		.int()
		.positive()
		.optional()
		.default(24),
	// When true, protected routes return 403 for unverified users.
	// Env values are strings; z.coerce.boolean() treats every non-empty string
	// (including 'false') as true. Parse the two valid tokens explicitly so
	// REQUIRE_EMAIL_VERIFICATION=false actually disables the gate.
	REQUIRE_EMAIL_VERIFICATION: z
		.enum(['true', 'false'])
		.default('false')
		.transform((value) => value === 'true'),
	// Password-reset token/OTP validity in minutes (default: 60).
	RESET_EXPIRES_MINUTES: z.coerce
		.number()
		.int()
		.positive()
		.optional()
		.default(60),
	// ADMIN seed credentials. Required so the app fails fast on misconfiguration.
	// Username rules mirror the register controller: 3–30, [a-zA-Z0-9_], lowercased.
	ADMIN_USERNAME: z
		.string()
		.regex(/^[a-zA-Z0-9_]+$/, 'letters, numbers, underscore only')
		.min(3)
		.max(30)
		.transform((s) => s.toLowerCase()),
	ADMIN_EMAIL: z.email(),
	// Strong password policy: min 10 chars, with upper, lower, number and special.
	ADMIN_PASSWORD: z
		.string()
		.min(10)
		.max(72)
		.regex(/[a-z]/, 'Must contain a lowercase letter')
		.regex(/[A-Z]/, 'Must contain an uppercase letter')
		.regex(/[0-9]/, 'Must contain a number')
		.regex(/[^A-Za-z0-9]/, 'Must contain a special character')
		// bcrypt counts BYTES: enforce the true 72-byte ceiling, not just chars.
		.refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'Password too long'),
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
	console.error('Invalid environment variables: ', z.treeifyError(_env.error))
	throw new Error('Invalid environment variables.')
}

export const env = _env.data
