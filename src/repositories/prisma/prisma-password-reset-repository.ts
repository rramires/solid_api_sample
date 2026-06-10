import { prisma } from '@/lib/prisma'

import { IPasswordResetRepository } from '../i-password-reset-repository'

export class PrismaPasswordResetRepository implements IPasswordResetRepository {
	async create(data: {
		userId: string
		linkTokenHash: string
		otpCodeHash: string
		expiresAt: Date
	}) {
		return prisma.passwordReset.create({
			data: {
				user_id: data.userId,
				link_token_hash: data.linkTokenHash,
				otp_code_hash: data.otpCodeHash,
				expires_at: data.expiresAt,
			},
		})
	}

	async findByLinkTokenHash(hash: string) {
		return prisma.passwordReset.findUnique({
			where: { link_token_hash: hash },
		})
	}

	async findActiveByUserId(userId: string) {
		return prisma.passwordReset.findFirst({
			where: {
				user_id: userId,
				used_at: null,
				expires_at: { gte: new Date() },
			},
			orderBy: { created_at: 'desc' },
		})
	}

	async incrementAttempts(id: string) {
		await prisma.passwordReset.update({
			where: { id },
			data: { attempts: { increment: 1 } },
		})
	}

	async markUsed(id: string) {
		await prisma.passwordReset.update({
			where: { id },
			data: { used_at: new Date() },
		})
	}

	async invalidateAllByUserId(userId: string) {
		await prisma.passwordReset.updateMany({
			where: { user_id: userId, used_at: null },
			data: { used_at: new Date() },
		})
	}

	async deleteExpiredByUserId(userId: string) {
		await prisma.passwordReset.deleteMany({
			where: { user_id: userId, expires_at: { lte: new Date() } },
		})
	}
}
