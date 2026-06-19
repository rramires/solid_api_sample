import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { env } from '@/env'
import { verifiedCache } from '@/lib/verified-cache'
import { CannotChangeOwnRoleError } from '@/use-cases/errors/cannot-change-own-role-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'
import { makeUpdateUserUseCase } from '@/use-cases/factories/make-update-user-use-case'

export async function updateController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const paramsSchema = z.object({
		userId: z.uuid(),
	})
	const { userId } = paramsSchema.parse(request.params)

	// Admin whitelist. `.strict()` blocks unknown keys; the first refine forces
	// at least one field; the second forbids verifying a brand-new email in the
	// same call (a changed email is unproven, so is_verified must stay/become
	// false — it would be contradictory to set it true here).
	const bodySchema = z
		.object({
			username: z
				.string()
				.min(env.MIN_TEXT_LENGTH)
				.max(30)
				.regex(/^[a-zA-Z0-9_]+$/, 'letters, numbers, underscore only')
				.transform((s) => s.toLowerCase())
				.optional(),
			email: z.email().optional(),
			role: z.enum(['ADMIN', 'MEMBER']).optional(),
			is_verified: z.boolean().optional(),
		})
		.strict()
		.refine(
			(data) =>
				data.username !== undefined ||
				data.email !== undefined ||
				data.role !== undefined ||
				data.is_verified !== undefined,
			{ message: 'Provide at least one field to update.' },
		)
		.refine(
			(data) => !(data.email !== undefined && data.is_verified === true),
			{
				message:
					'Cannot verify a newly-changed email in the same request.',
			},
		)
	const { username, email, role, is_verified } = bodySchema.parse(
		request.body,
	)

	const updateUserUseCase = makeUpdateUserUseCase()
	try {
		const { user, verifiedCacheStale } = await updateUserUseCase.execute({
			actorId: request.user.sub,
			userId,
			username,
			email,
			role,
			is_verified,
		})

		// Drop the cached verification status so the middleware re-reads the DB.
		if (verifiedCacheStale) {
			verifiedCache.invalidate(userId)
		}

		return reply.status(200).send({ user })
	} catch (err) {
		if (err instanceof ResourceNotFoundError) {
			return reply.status(404).send({ message: err.message })
		}
		if (err instanceof UserAlreadyExistsError) {
			return reply.status(409).send({ message: err.message })
		}
		if (err instanceof CannotChangeOwnRoleError) {
			return reply.status(400).send({ message: err.message })
		}
		throw err
	}
}
