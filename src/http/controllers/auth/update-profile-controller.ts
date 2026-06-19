import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { env } from '@/env'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'
import { makeUpdateProfileUseCase } from '@/use-cases/factories/make-update-profile-use-case'

export async function updateProfileController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	// Self-service: acts on request.user.sub, never an id from the URL. The
	// whitelist is `username` only — role/is_verified/email/password can never
	// be set here (privilege-escalation defense). Mirrors register's rules
	// (3-30 chars, [a-zA-Z0-9_], stored lowercase).
	const bodySchema = z
		.object({
			username: z
				.string()
				.min(env.MIN_TEXT_LENGTH)
				.max(30)
				.regex(/^[a-zA-Z0-9_]+$/, 'letters, numbers, underscore only')
				.transform((s) => s.toLowerCase()),
		})
		.strict()
	const { username } = bodySchema.parse(request.body)

	const updateProfileUseCase = makeUpdateProfileUseCase()
	try {
		const { user } = await updateProfileUseCase.execute({
			userId: request.user.sub,
			username,
		})

		return reply.status(200).send({
			user: {
				id: user.id,
				username: user.username,
				is_verified: user.is_verified,
				role: user.role,
			},
		})
	} catch (err) {
		if (err instanceof UserAlreadyExistsError) {
			return reply.status(409).send({ message: err.message })
		}
		throw err
	}
}
