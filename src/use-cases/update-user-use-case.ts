import { randomInt, randomUUID } from 'node:crypto'

import { env } from '@/env'
import { IEmailProvider } from '@/lib/email/i-email-provider'
import { Role } from '@/prisma-client'
import { IPasswordResetRepository } from '@/repositories/i-password-reset-repository'
import { IUsersRepository, PublicUser } from '@/repositories/i-users-repository'
import { sha256 } from '@/utils/sha256'

import { CannotChangeOwnRoleError } from './errors/cannot-change-own-role-error'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { UserAlreadyExistsError } from './errors/user-already-exists-error'

interface UpdateUserUseCaseRequest {
	actorId: string
	userId: string
	username?: string
	email?: string
	role?: Role
	is_verified?: boolean
}

interface UpdateUserUseCaseResponse {
	user: PublicUser
	// True when is_verified changed (directly or via an email change), so the
	// controller can drop the verified-cache entry for this user.
	verifiedCacheStale: boolean
}

export class UpdateUserUseCase {
	constructor(
		private usersRepository: IUsersRepository,
		private passwordResetRepository: IPasswordResetRepository,
		private emailProvider: IEmailProvider,
	) {}

	async execute({
		actorId,
		userId,
		username,
		email,
		role,
		is_verified,
	}: UpdateUserUseCaseRequest): Promise<UpdateUserUseCaseResponse> {
		// 404 before any mutation.
		const target = await this.usersRepository.findById(userId)
		if (!target) {
			throw new ResourceNotFoundError()
		}

		const data: {
			username?: string
			email?: string
			role?: Role
			is_verified?: boolean
		} = {}

		// username uniqueness (excluding the target itself).
		if (username !== undefined) {
			const owner = await this.usersRepository.findByUsername(username)
			if (owner && owner.id !== userId) {
				throw new UserAlreadyExistsError()
			}
			data.username = username
		}

		// Self-demotion guard: an admin can't strip their own ADMIN role. Since
		// only admins reach this route, blocking self-demotion alone guarantees at
		// least one admin always remains.
		if (role !== undefined) {
			if (userId === actorId && role === Role.MEMBER) {
				throw new CannotChangeOwnRoleError()
			}
			data.role = role
		}

		// Email change: a new address is unproven, so is_verified drops to false
		// and a password reset is sent to the NEW address (admin-driven, inline,
		// no cooldown). Same address provided = no-op.
		const emailChanged = email !== undefined && email !== target.email
		if (emailChanged) {
			const owner = await this.usersRepository.findByEmail(email)
			if (owner && owner.id !== userId) {
				throw new UserAlreadyExistsError()
			}
			data.email = email
			data.is_verified = false
		} else if (is_verified !== undefined) {
			data.is_verified = is_verified
		}

		const user = await this.usersRepository.update(userId, data)

		if (emailChanged) {
			const linkToken = randomUUID()
			const otpCode = String(randomInt(0, 1_000_000)).padStart(6, '0')
			await this.passwordResetRepository.deleteExpiredByUserId(userId)
			const expiresAt = new Date(
				Date.now() + env.RESET_EXPIRES_MINUTES * 60 * 1000,
			)
			await this.passwordResetRepository.create({
				userId,
				linkTokenHash: sha256(linkToken),
				otpCodeHash: sha256(otpCode),
				expiresAt,
			})
			await this.emailProvider.sendPasswordResetEmail({
				to: user.email,
				linkToken,
				otpCode,
				expiresInMinutes: env.RESET_EXPIRES_MINUTES,
			})
		}

		return {
			user,
			verifiedCacheStale: data.is_verified !== undefined,
		}
	}
}
