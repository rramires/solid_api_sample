// https://github.com/fastify/fastify-jwt?tab=readme-ov-file#typescript-1
import '@fastify/jwt'

import { Role } from '@/prisma-client'

declare module '@fastify/jwt' {
	export interface FastifyJWT {
		user: {
			sub: string
			role: Role
			// Unique token id used by the revocation denylist.
			jti: string
			// Expiration as a UNIX timestamp (seconds).
			exp: number
			// Issued-at as a UNIX timestamp (seconds). Compared against the user's
			// last password change for global session invalidation.
			iat: number
		}
	}
}
