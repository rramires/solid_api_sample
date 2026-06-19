import { beforeEach, describe, expect, it } from 'vitest'

import { IEmailProvider } from '@/lib/email/i-email-provider'
import { Role } from '@/prisma-client'
import { InMemoryPasswordResetRepository } from '@/repositories/in-memory/in-memory-password-reset-repository'
import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'
import { sha256 } from '@/utils/sha256'

import { CannotChangeOwnRoleError } from './errors/cannot-change-own-role-error'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { UserAlreadyExistsError } from './errors/user-already-exists-error'
import { UpdateUserUseCase } from './update-user-use-case'

class CapturingEmailProvider implements IEmailProvider {
	public resets: { to: string; linkToken: string; otpCode: string }[] = []
	async sendVerificationEmail() {}
	async sendEmailChangeConfirmation() {}
	async sendEmailChangeAlert() {}
	async sendPasswordResetEmail(params: {
		to: string
		linkToken: string
		otpCode: string
		expiresInMinutes: number
	}) {
		this.resets.push({
			to: params.to,
			linkToken: params.linkToken,
			otpCode: params.otpCode,
		})
	}
}

let usersRepository: InMemoryUsersRepository
let resetRepository: InMemoryPasswordResetRepository
let emailProvider: CapturingEmailProvider
let sut: UpdateUserUseCase

async function makeUser(
	overrides: Partial<{ username: string; email: string; role: Role }> = {},
) {
	return usersRepository.create({
		username: overrides.username ?? 'someone',
		email: overrides.email ?? 'someone@example.com',
		password_hash: 'hash',
		role: overrides.role ?? Role.MEMBER,
		is_verified: true,
	})
}

describe('Update User Use Case', () => {
	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository()
		resetRepository = new InMemoryPasswordResetRepository()
		emailProvider = new CapturingEmailProvider()
		sut = new UpdateUserUseCase(
			usersRepository,
			resetRepository,
			emailProvider,
		)
	})

	it('should change a target user username', async () => {
		const admin = await makeUser({ username: 'admin', role: Role.ADMIN })
		const target = await makeUser({
			username: 'target',
			email: 'target@example.com',
		})

		const { user } = await sut.execute({
			actorId: admin.id,
			userId: target.id,
			username: 'renamed',
		})

		expect(user.username).toEqual('renamed')
	})

	it('should reject a username taken by another user', async () => {
		const admin = await makeUser({ username: 'admin', role: Role.ADMIN })
		await makeUser({ username: 'taken', email: 'taken@example.com' })
		const target = await makeUser({
			username: 'target',
			email: 'target@example.com',
		})

		await expect(
			sut.execute({
				actorId: admin.id,
				userId: target.id,
				username: 'taken',
			}),
		).rejects.toBeInstanceOf(UserAlreadyExistsError)
	})

	it('should unverify and send a reset to the new email on email change', async () => {
		const admin = await makeUser({ username: 'admin', role: Role.ADMIN })
		const target = await makeUser({
			username: 'target',
			email: 'old@example.com',
		})

		const { user, verifiedCacheStale } = await sut.execute({
			actorId: admin.id,
			userId: target.id,
			email: 'new@example.com',
		})

		expect(user.email).toEqual('new@example.com')
		expect(user.is_verified).toBe(false)
		expect(verifiedCacheStale).toBe(true)
		// Reset created (hashes only) and sent to the NEW address.
		expect(resetRepository.items).toHaveLength(1)
		expect(emailProvider.resets).toHaveLength(1)
		expect(emailProvider.resets[0].to).toEqual('new@example.com')
		expect(resetRepository.items[0].link_token_hash).toEqual(
			sha256(emailProvider.resets[0].linkToken),
		)
	})

	it('should reject an email taken by another user', async () => {
		const admin = await makeUser({ username: 'admin', role: Role.ADMIN })
		await makeUser({ username: 'other', email: 'taken@example.com' })
		const target = await makeUser({
			username: 'target',
			email: 'target@example.com',
		})

		await expect(
			sut.execute({
				actorId: admin.id,
				userId: target.id,
				email: 'taken@example.com',
			}),
		).rejects.toBeInstanceOf(UserAlreadyExistsError)
	})

	it('should promote a member to admin', async () => {
		const admin = await makeUser({ username: 'admin', role: Role.ADMIN })
		const target = await makeUser({
			username: 'target',
			email: 'target@example.com',
			role: Role.MEMBER,
		})

		const { user } = await sut.execute({
			actorId: admin.id,
			userId: target.id,
			role: Role.ADMIN,
		})

		expect(user.role).toEqual(Role.ADMIN)
	})

	it('should block an admin from demoting themselves', async () => {
		const admin = await makeUser({ username: 'admin', role: Role.ADMIN })

		await expect(
			sut.execute({
				actorId: admin.id,
				userId: admin.id,
				role: Role.MEMBER,
			}),
		).rejects.toBeInstanceOf(CannotChangeOwnRoleError)
	})

	it('should allow demoting another admin', async () => {
		const admin = await makeUser({ username: 'admin', role: Role.ADMIN })
		const otherAdmin = await makeUser({
			username: 'admin2',
			email: 'admin2@example.com',
			role: Role.ADMIN,
		})

		const { user } = await sut.execute({
			actorId: admin.id,
			userId: otherAdmin.id,
			role: Role.MEMBER,
		})

		expect(user.role).toEqual(Role.MEMBER)
	})

	it('should set is_verified directly and flag the cache stale', async () => {
		const admin = await makeUser({ username: 'admin', role: Role.ADMIN })
		const target = await makeUser({
			username: 'target',
			email: 'target@example.com',
		})

		const { user, verifiedCacheStale } = await sut.execute({
			actorId: admin.id,
			userId: target.id,
			is_verified: false,
		})

		expect(user.is_verified).toBe(false)
		expect(verifiedCacheStale).toBe(true)
		// No email change → no reset emitted.
		expect(emailProvider.resets).toHaveLength(0)
	})

	it('should throw ResourceNotFoundError for an unknown user', async () => {
		const admin = await makeUser({ username: 'admin', role: Role.ADMIN })

		await expect(
			sut.execute({
				actorId: admin.id,
				userId: 'non-existent',
				username: 'x',
			}),
		).rejects.toBeInstanceOf(ResourceNotFoundError)
	})
})
