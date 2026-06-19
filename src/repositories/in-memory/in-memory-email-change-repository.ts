import { randomUUID } from 'node:crypto'

import { EmailChange } from '@/prisma-client'

import { IEmailChangeRepository } from '../i-email-change-repository'

export class InMemoryEmailChangeRepository implements IEmailChangeRepository {
	public items: EmailChange[] = []

	async create(data: {
		userId: string
		newEmail: string
		linkToken: string
		otpCode: string
		expiresAt: Date
	}): Promise<EmailChange> {
		const record: EmailChange = {
			id: randomUUID(),
			user_id: data.userId,
			new_email: data.newEmail,
			link_token: data.linkToken,
			otp_code: data.otpCode,
			attempts: 0,
			expires_at: data.expiresAt,
			used_at: null,
			created_at: new Date(),
		}
		this.items.push(record)
		return record
	}

	async findByLinkToken(token: string): Promise<EmailChange | null> {
		return this.items.find((r) => r.link_token === token) ?? null
	}

	async findLatestByUserId(userId: string): Promise<EmailChange | null> {
		const records = this.items
			.filter((r) => r.user_id === userId)
			.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
		return records[0] ?? null
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

	async deleteExpiredByUserId(userId: string): Promise<void> {
		const now = new Date()
		this.items = this.items.filter(
			(r) => !(r.user_id === userId && r.expires_at <= now),
		)
	}
}
