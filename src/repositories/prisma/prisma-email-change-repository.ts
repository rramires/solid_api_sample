import { prisma } from '@/lib/prisma'

import { IEmailChangeRepository } from '../i-email-change-repository'

export class PrismaEmailChangeRepository implements IEmailChangeRepository {
	async create(data: {
		userId: string
		newEmail: string
		linkToken: string
		otpCode: string
		expiresAt: Date
	}) {
		return prisma.emailChange.create({
			data: {
				user_id: data.userId,
				new_email: data.newEmail,
				link_token: data.linkToken,
				otp_code: data.otpCode,
				expires_at: data.expiresAt,
			},
		})
	}

	async findByLinkToken(token: string) {
		return prisma.emailChange.findUnique({
			where: { link_token: token },
		})
	}

	async findLatestByUserId(userId: string) {
		return prisma.emailChange.findFirst({
			where: { user_id: userId },
			orderBy: { created_at: 'desc' },
		})
	}

	async incrementAttempts(id: string) {
		await prisma.emailChange.update({
			where: { id },
			data: { attempts: { increment: 1 } },
		})
	}

	async markUsed(id: string) {
		await prisma.emailChange.update({
			where: { id },
			data: { used_at: new Date() },
		})
	}

	async deleteExpiredByUserId(userId: string) {
		await prisma.emailChange.deleteMany({
			where: {
				user_id: userId,
				expires_at: { lte: new Date() },
			},
		})
	}
}
