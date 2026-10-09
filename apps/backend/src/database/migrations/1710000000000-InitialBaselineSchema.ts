import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialBaselineSchema1710000000000 implements MigrationInterface {
  name = "InitialBaselineSchema1710000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Users Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`email\` varchar(255) NOT NULL,
        \`password\` varchar(255) NULL,
        \`name\` varchar(255) NULL,
        \`avatar\` longtext NULL,
        \`role\` enum('user', 'admin') NOT NULL DEFAULT 'user',
        \`isEmailVerified\` tinyint(1) NOT NULL DEFAULT 0,
        \`verificationToken\` varchar(255) NULL,
        \`resetPasswordToken\` varchar(255) NULL,
        \`resetPasswordExpires\` datetime NULL,
        \`credits\` int NOT NULL DEFAULT 50,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`googleId\` varchar(255) NULL,
        \`facebookId\` varchar(255) NULL,
        \`lastIp\` varchar(64) NULL,
        \`affiliateCode\` varchar(64) NULL,
        \`referredById\` int NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_users_email\` (\`email\`),
        UNIQUE KEY \`UQ_users_affiliateCode\` (\`affiliateCode\`),
        KEY \`IDX_users_name\` (\`name\`),
        KEY \`IDX_users_credits\` (\`credits\`),
        KEY \`IDX_users_createdAt\` (\`createdAt\`),
        KEY \`IDX_users_referredById\` (\`referredById\`),
        CONSTRAINT \`FK_users_referredBy\` FOREIGN KEY (\`referredById\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Conversations Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`conversations\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`title\` varchar(255) NOT NULL DEFAULT 'New Chat',
        \`userId\` int NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_conversations_userId\` (\`userId\`),
        KEY \`IDX_conversations_user_updated\` (\`userId\`, \`updatedAt\`),
        CONSTRAINT \`FK_conversations_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Messages Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`messages\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`content\` mediumtext NOT NULL,
        \`sender\` enum('user', 'bot') NOT NULL,
        \`model\` varchar(100) NOT NULL,
        \`conversationId\` int NOT NULL,
        \`userId\` int NOT NULL,
        \`requestId\` varchar(255) NULL,
        \`type\` varchar(32) NOT NULL DEFAULT 'text',
        \`files\` json NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_messages_conversationId\` (\`conversationId\`),
        KEY \`IDX_messages_userId\` (\`userId\`),
        KEY \`IDX_messages_requestId\` (\`requestId\`),
        KEY \`IDX_messages_conv_created\` (\`conversationId\`, \`createdAt\`),
        CONSTRAINT \`FK_messages_conversation\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversations\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_messages_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Transactions Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`transactions\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`packId\` int NULL,
        \`externalId\` varchar(255) NULL,
        \`amount\` decimal(10,2) NOT NULL,
        \`creditsAmount\` int NOT NULL,
        \`status\` enum('PENDING', 'WAITING', 'CONFIRMING', 'APPROVED', 'DECLINED', 'PARTIALLY_PAID') NOT NULL DEFAULT 'PENDING',
        \`provider\` varchar(100) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`userId\` int NOT NULL,
        \`type\` enum('PURCHASE', 'SPEND', 'REFUND') NOT NULL DEFAULT 'PURCHASE',
        \`description\` varchar(255) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_transactions_externalId\` (\`externalId\`),
        KEY \`IDX_transactions_createdAt\` (\`createdAt\`),
        KEY \`IDX_transactions_userId\` (\`userId\`),
        KEY \`IDX_transactions_user_created\` (\`userId\`, \`createdAt\`),
        CONSTRAINT \`FK_transactions_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Notifications Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`notifications\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`message\` text NOT NULL,
        \`type\` enum('SYSTEM', 'SUPPORT', 'INFO') NOT NULL DEFAULT 'SYSTEM',
        \`isRead\` tinyint(1) NOT NULL DEFAULT 0,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_notifications_userId\` (\`userId\`),
        KEY \`IDX_notifications_user_read\` (\`userId\`, \`isRead\`),
        KEY \`IDX_notifications_user_created\` (\`userId\`, \`createdAt\`),
        CONSTRAINT \`FK_notifications_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Support Tickets Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`support_tickets\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`subject\` varchar(255) NOT NULL,
        \`message\` text NOT NULL,
        \`adminResponse\` text NULL,
        \`status\` enum('OPEN', 'IN_PROGRESS', 'CLOSED') NOT NULL DEFAULT 'OPEN',
        \`priority\` enum('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
        \`userId\` int NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_support_userId\` (\`userId\`),
        KEY \`IDX_support_user_created\` (\`userId\`, \`createdAt\`),
        KEY \`IDX_support_status_priority\` (\`status\`, \`priority\`, \`createdAt\`),
        CONSTRAINT \`FK_support_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Audit Logs Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`id\` varchar(36) NOT NULL,
        \`actorId\` int NULL,
        \`userId\` int NULL,
        \`action\` varchar(100) NOT NULL,
        \`resource\` varchar(100) NOT NULL,
        \`resourceId\` varchar(255) NULL,
        \`oldValues\` json NULL,
        \`newValues\` json NULL,
        \`ipAddress\` varchar(64) NULL,
        \`userAgent\` varchar(512) NULL,
        \`status\` varchar(32) NOT NULL DEFAULT 'SUCCESS',
        \`errorMessage\` text NULL,
        \`metadata\` json NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_audit_actorId\` (\`actorId\`),
        KEY \`IDX_audit_userId\` (\`userId\`),
        KEY \`IDX_audit_action\` (\`action\`),
        KEY \`IDX_audit_createdAt\` (\`createdAt\`),
        KEY \`IDX_audit_actor_created\` (\`actorId\`, \`createdAt\`),
        KEY \`IDX_audit_user_created\` (\`userId\`, \`createdAt\`),
        KEY \`IDX_audit_action_created\` (\`action\`, \`createdAt\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`audit_logs\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`support_tickets\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`notifications\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`transactions\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`messages\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`conversations\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`users\`;`);
  }
}
