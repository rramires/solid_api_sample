import { FastifyReply, FastifyRequest } from 'fastify'

import { tokenDenylist } from '@/lib/token-denylist'

export async function logoutController(request: FastifyRequest, reply: FastifyReply) {
	const { jti, exp } = request.user

	// Revoke the current access token until it would have expired anyway, so the
	// denylist entry can be pruned afterwards. `exp` is a UNIX timestamp (seconds).
	await tokenDenylist.revoke(jti, new Date(exp * 1000))

	return reply.clearCookie('refreshToken', { path: '/' }).status(204).send()
}
