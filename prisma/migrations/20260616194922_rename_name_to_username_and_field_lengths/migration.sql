-- DropForeignKey
ALTER TABLE `check_ins` DROP FOREIGN KEY `check_ins_gym_id_fkey`;

-- DropForeignKey
ALTER TABLE `check_ins` DROP FOREIGN KEY `check_ins_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `email_verifications` DROP FOREIGN KEY `email_verifications_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `password_resets` DROP FOREIGN KEY `password_resets_user_id_fkey`;

-- DropIndex
DROP INDEX `check_ins_gym_id_fkey` ON `check_ins`;

-- DropIndex
DROP INDEX `check_ins_user_id_fkey` ON `check_ins`;

-- DropIndex
DROP INDEX `email_verifications_user_id_fkey` ON `email_verifications`;

-- DropIndex
DROP INDEX `password_resets_user_id_fkey` ON `password_resets`;

-- AlterTable
ALTER TABLE `check_ins` MODIFY `user_id` VARCHAR(36) NOT NULL,
    MODIFY `gym_id` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `email_verifications` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(36) NOT NULL,
    MODIFY `user_id` VARCHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `gyms` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(36) NOT NULL,
    MODIFY `title` VARCHAR(100) NOT NULL,
    MODIFY `description` VARCHAR(500) NULL,
    MODIFY `phone` VARCHAR(20) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `password_resets` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(36) NOT NULL,
    MODIFY `user_id` VARCHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    DROP COLUMN `name`,
    ADD COLUMN `username` VARCHAR(30) NOT NULL,
    MODIFY `id` VARCHAR(36) NOT NULL,
    MODIFY `email` VARCHAR(254) NOT NULL,
    MODIFY `password_hash` VARCHAR(60) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- CreateIndex
CREATE UNIQUE INDEX `users_username_key` ON `users`(`username`);

-- AddForeignKey
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_gym_id_fkey` FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_verifications` ADD CONSTRAINT `email_verifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_resets` ADD CONSTRAINT `password_resets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
