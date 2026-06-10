import { PasswordReset } from '@/prisma-client'

export interface IPasswordResetRepository {
	create(data: {
		userId: string
		linkTokenHash: string
		otpCodeHash: string
		expiresAt: Date
	}): Promise<PasswordReset>
	findByLinkTokenHash(hash: string): Promise<PasswordReset | null>
	// Latest still-usable (unused, unexpired) reset for the user.
	findActiveByUserId(userId: string): Promise<PasswordReset | null>
	incrementAttempts(id: string): Promise<void>
	markUsed(id: string): Promise<void>
	invalidateAllByUserId(userId: string): Promise<void>
	deleteExpiredByUserId(userId: string): Promise<void>
}
