import { randomUUID } from 'node:crypto'

import { FastifyReply,FastifyRequest } from 'fastify'

import { tokenDenylist } from '@/lib/token-denylist'

export async function refreshController(request: FastifyRequest, reply: FastifyReply) {
	// Check if valid request cookie exists
	await request.jwtVerify({ onlyCookie: true })

	// Reject refresh tokens already rotated (single-use) or revoked via logout —
	// a stolen refresh cookie must not survive its first reuse.
	if (await tokenDenylist.isRevoked(request.user.jti)) {
		return reply.status(401).send({ message: 'Unauthorized.' })
	}
	// Single-use: rotating consumes the presented refresh token.
	await tokenDenylist.revoke(request.user.jti, new Date(request.user.exp * 1000))

	const { role } = request.user

	// JWT
	const token = await reply.jwtSign(
		{
			role,
			// jti enables per-token revocation via the denylist.
			jti: randomUUID(),
		},
		{
			sign: {
				sub: request.user.sub,
			},
		},
	)
	//
	const refreshToken = await reply.jwtSign(
		{
			role,
			jti: randomUUID(),
		},
		{
			sign: {
				sub: request.user.sub,
				expiresIn: '7d',
			},
		},
	)
	return reply
		.status(200)
		.setCookie('refreshToken', refreshToken, {
			path: '/',
			secure: true,
			sameSite: true,
			httpOnly: true,
		})
		.send({
			token,
		})
}
