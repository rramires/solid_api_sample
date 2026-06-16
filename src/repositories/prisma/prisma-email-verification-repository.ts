import { prisma } from '@/lib/prisma'

import { IEmailVerificationRepository } from '../i-email-verification-repository'

export class PrismaEmailVerificationRepository implements IEmailVerificationRepository {
	async create(data: {
		userId: string
		linkToken: string
		otpCode: string
		expiresAt: Date
	}) {
		return prisma.emailVerification.create({
			data: {
				user_id: data.userId,
				link_token: data.linkToken,
				otp_code: data.otpCode,
				expires_at: data.expiresAt,
			},
		})
	}

	async findByLinkToken(token: string) {
		return prisma.emailVerification.findUnique({
			where: { link_token: token },
		})
	}

	async findLatestByUserId(userId: string) {
		return prisma.emailVerification.findFirst({
			where: { user_id: userId },
			orderBy: { created_at: 'desc' },
		})
	}

	async incrementAttempts(id: string) {
		await prisma.emailVerification.update({
			where: { id },
			data: { attempts: { increment: 1 } },
		})
	}

	async markUsed(id: string) {
		await prisma.emailVerification.update({
			where: { id },
			data: { used_at: new Date() },
		})
	}

	async deleteExpiredByUserId(userId: string) {
		await prisma.emailVerification.deleteMany({
			where: {
				user_id: userId,
				expires_at: { lte: new Date() },
			},
		})
	}
}
