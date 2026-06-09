import { FastifyReply, FastifyRequest } from 'fastify'

import { env } from '@/env'

// Only blocks unverified users when REQUIRE_EMAIL_VERIFICATION=true.
// Add this to any route that should require a verified email address.
export async function verifyEmailVerified(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (env.REQUIRE_EMAIL_VERIFICATION && !request.user.is_verified) {
		return reply.status(403).send({ message: 'Email not verified.' })
	}
}
