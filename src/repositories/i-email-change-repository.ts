import { EmailChange } from '@/prisma-client'

export interface IEmailChangeRepository {
	create(data: {
		userId: string
		newEmail: string
		linkToken: string
		otpCode: string
		expiresAt: Date
	}): Promise<EmailChange>
	findByLinkToken(token: string): Promise<EmailChange | null>
	findLatestByUserId(userId: string): Promise<EmailChange | null>
	incrementAttempts(id: string): Promise<void>
	markUsed(id: string): Promise<void>
	deleteExpiredByUserId(userId: string): Promise<void>
}
