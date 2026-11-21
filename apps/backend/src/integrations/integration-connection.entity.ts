import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/** One linked account per user and plugin. Tokens are AES-GCM ciphertext. */
@Entity("integration_connections")
@Index("UQ_integration_owner_plugin", ["userId", "pluginId"], { unique: true })
export class IntegrationConnection {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @Column({ length: 40 }) pluginId!: string;
  @Column({ length: 200, nullable: true, type: "varchar" })
  accountLabel!: string | null;
  @Column({ type: "json", nullable: true }) scopes!: string[] | null;
  @Column({ type: "text" }) encryptedAccessToken!: string;
  @Column({ type: "text", nullable: true })
  encryptedRefreshToken!: string | null;
  @Column({ type: "datetime", nullable: true }) expiresAt!: Date | null;
  /** Provider ids the tools need, such as the Notion workspace or GitHub login. */
  @Column({ type: "json", nullable: true }) metadata!: Record<
    string,
    unknown
  > | null;
  @Column({ length: 16, default: "connected" }) status!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
