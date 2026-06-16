import { FastifyReply, FastifyRequest } from 'fastify'

import { tokenDenylist } from '@/lib/token-denylist'

export async function logoutController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const { jti, exp } = request.user

	// Revoke the current access token until it would have expired anyway, so the
	// denylist entry can be pruned afterwards. `exp` is a UNIX timestamp (seconds).
	await tokenDenylist.revoke(jti, new Date(exp * 1000))

	// Revoke the refresh token too, when the cookie was sent — otherwise a stolen
	// refresh cookie would stay valid for its full 7 days after logout.
	const refreshCookie = request.cookies.refreshToken
	if (refreshCookie) {
		try {
			const refresh = request.server.jwt.verify<{
				jti: string
				exp: number
			}>(refreshCookie)
			await tokenDenylist.revoke(
				refresh.jti,
				new Date(refresh.exp * 1000),
			)
		} catch {
			// expired/invalid refresh cookie — nothing to revoke
		}
	}

	return reply.clearCookie('refreshToken', { path: '/' }).status(204).send()
}
