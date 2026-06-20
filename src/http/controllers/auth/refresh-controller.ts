import { randomUUID } from 'node:crypto'

import { FastifyReply, FastifyRequest } from 'fastify'

import { tokenDenylist } from '@/lib/token-denylist'
import { Role } from '@/prisma-client/enums'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { makeGetUserProfileUseCase } from '@/use-cases/factories/make-get-user-profile-use-case'

export async function refreshController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	// Check if valid request cookie exists
	await request.jwtVerify({ onlyCookie: true })

	// Reject refresh tokens already rotated (single-use) or revoked via logout —
	// a stolen refresh cookie must not survive its first reuse.
	if (await tokenDenylist.isRevoked(request.user.jti)) {
		return reply.status(401).send({ message: 'Unauthorized.' })
	}
	// Single-use: rotating consumes the presented refresh token.
	await tokenDenylist.revoke(
		request.user.jti,
		new Date(request.user.exp * 1000),
	)

	// Re-read the role from the DB (not the stale refresh-token claim) so the
	// rotated tokens carry the user's current role — consistent with login and
	// with verifyUserRole's DB-backed authorization. The claim is never trusted
	// for access control, but keeping it fresh avoids a stale lie in the token.
	let role: Role
	try {
		const { user } = await makeGetUserProfileUseCase().execute({
			userId: request.user.sub,
		})
		role = user.role
	} catch (err) {
		if (err instanceof ResourceNotFoundError) {
			// Valid refresh cookie but the user no longer exists: force re-auth.
			return reply.status(401).send({ message: 'Unauthorized.' })
		}
		throw err
	}

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
