import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']),
	PORT: z.coerce.number().default(3333),
	JWT_SECRET: z.string().min(20, 'Minimum 20 characters'),
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
	console.error('Invalid environment variables: ', _env.error.format())
	throw new Error('Invalid environment variables.')
}

export const env = _env.data
