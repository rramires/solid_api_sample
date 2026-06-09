import 'dotenv/config'

import { z } from 'zod'

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']),
	PORT: z.coerce.number().default(3333),
	JWT_SECRET: z.string().min(20, 'Minimum 20 characters'),
	CORS_ORIGIN: z.string().optional(),
	PASSWORD_MIN_LENGTH: z.coerce.number().int().min(8).max(72).default(8),
	BODY_LIMIT: z.coerce.number().int().positive().default(16_384),
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
	console.error('Invalid environment variables: ', _env.error.format())
	throw new Error('Invalid environment variables.')
}

export const env = _env.data
