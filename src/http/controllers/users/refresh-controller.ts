import { randomUUID } from 'node:crypto'

import { FastifyReply,FastifyRequest } from 'fastify'

export async function refreshController(request: FastifyRequest, reply: FastifyReply) {
	// Check if valid request cookie exists
	await request.jwtVerify({ onlyCookie: true })

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
