import { EmailVerification } from '@/prisma-client'

export interface IEmailVerificationRepository {
	create(data: {
		userId: string
		linkToken: string
		otpCode: string
		expiresAt: Date
	}): Promise<EmailVerification>
	findByLinkToken(token: string): Promise<EmailVerification | null>
	findByOtpCode(userId: string, code: string): Promise<EmailVerification | null>
	findLatestByUserId(userId: string): Promise<EmailVerification | null>
	markUsed(id: string): Promise<void>
	deleteExpiredByUserId(userId: string): Promise<void>
}
