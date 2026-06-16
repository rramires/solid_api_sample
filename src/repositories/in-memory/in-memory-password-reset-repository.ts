import { randomUUID } from 'node:crypto'

import { PasswordReset } from '@/prisma-client'

import { IPasswordResetRepository } from '../i-password-reset-repository'

export class InMemoryPasswordResetRepository implements IPasswordResetRepository {
	public items: PasswordReset[] = []

	async create(data: {
		userId: string
		linkTokenHash: string
		otpCodeHash: string
		expiresAt: Date
	}): Promise<PasswordReset> {
		const record: PasswordReset = {
			id: randomUUID(),
			user_id: data.userId,
			link_token_hash: data.linkTokenHash,
			otp_code_hash: data.otpCodeHash,
			attempts: 0,
			expires_at: data.expiresAt,
			used_at: null,
			created_at: new Date(),
		}
		this.items.push(record)
		return record
	}

	async findByLinkTokenHash(hash: string): Promise<PasswordReset | null> {
		return this.items.find((r) => r.link_token_hash === hash) ?? null
	}

	async findActiveByUserId(userId: string): Promise<PasswordReset | null> {
		const now = new Date()
		return (
			this.items
				.filter(
					(r) =>
						r.user_id === userId &&
						!r.used_at &&
						r.expires_at >= now,
				)
				.sort(
					(a, b) => b.created_at.getTime() - a.created_at.getTime(),
				)[0] ?? null
		)
	}

	async incrementAttempts(id: string): Promise<void> {
		const record = this.items.find((r) => r.id === id)
		if (record) {
			record.attempts += 1
		}
	}

	async markUsed(id: string): Promise<void> {
		const record = this.items.find((r) => r.id === id)
		if (record) {
			record.used_at = new Date()
		}
	}

	async invalidateAllByUserId(userId: string): Promise<void> {
		const now = new Date()
		for (const record of this.items) {
			if (record.user_id === userId && !record.used_at) {
				record.used_at = now
			}
		}
	}

	async deleteExpiredByUserId(userId: string): Promise<void> {
		const now = new Date()
		this.items = this.items.filter(
			(r) => !(r.user_id === userId && r.expires_at <= now),
		)
	}
}
