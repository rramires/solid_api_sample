import { z } from 'zod'

import { env } from '@/env'

// Shared request password schema for register + reset, so the two never drift.
// Length comes from PASSWORD_MIN_LENGTH; complexity from PASSWORD_PATTERN — both
// env-driven. 72 is the bcrypt input ceiling (anti-DoS): bcrypt counts BYTES,
// not chars, so .max(72) is a cheap pre-filter and the refine enforces the true
// 72-byte limit (multibyte chars can exceed it).
export const passwordSchema = z
	.string()
	.min(env.PASSWORD_MIN_LENGTH)
	.max(72)
	.regex(env.PASSWORD_PATTERN, 'Password does not meet the complexity policy')
	.refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'Password too long')
