import 'dotenv/config'

import { z } from 'zod'

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']),
	PORT: z.coerce.number().default(3333),
	JWT_SECRET: z.string().min(20, 'Minimum 20 characters'),
	CORS_ORIGIN: z.string().optional(),
	PASSWORD_MIN_LENGTH: z.coerce.number().int().min(8).max(72).default(8),
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
	LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().optional().default(5),
	LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().optional().default(15),
	// Email verification settings.
	BASE_URL: z.string().url().optional().default('http://localhost:3333'),
	VERIFICATION_EXPIRES_HOURS: z.coerce.number().int().positive().optional().default(24),
	// When true, protected routes return 403 for unverified users.
	REQUIRE_EMAIL_VERIFICATION: z.coerce.boolean().optional().default(false),
	// ADMIN seed credentials. Required so the app fails fast on misconfiguration.
	ADMIN_NAME: z.string().min(1).max(255),
	ADMIN_EMAIL: z.email(),
	// Strong password policy: min 10 chars, with upper, lower, number and special.
	ADMIN_PASSWORD: z
		.string()
		.min(10)
		.max(72)
		.regex(/[a-z]/, 'Must contain a lowercase letter')
		.regex(/[A-Z]/, 'Must contain an uppercase letter')
		.regex(/[0-9]/, 'Must contain a number')
		.regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
	console.error('Invalid environment variables: ', z.treeifyError(_env.error))
	throw new Error('Invalid environment variables.')
}

export const env = _env.data
