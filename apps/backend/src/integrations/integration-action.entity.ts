import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type IntegrationActionStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "cancelled";

/**
 * A write action a model proposed. It runs only when its owner confirms it,
 * with exactly the arguments shown on the confirmation card.
 */
@Entity("integration_actions")
@Index("IDX_integration_action_owner", ["userId", "createdAt"])
export class IntegrationAction {
  @PrimaryColumn({ length: 36 }) id!: string;
  @Column() userId!: number;
  @Column({ type: "int", nullable: true }) conversationId!: number | null;
  @Column({ type: "int", nullable: true }) messageId!: number | null;
  @Column({ length: 40 }) pluginId!: string;
  @Column({ length: 64 }) tool!: string;
  @Column({ type: "json" }) args!: Record<string, unknown>;
  @Column({ type: "json" }) preview!: Record<string, unknown>;
  @Column({ length: 16, default: "pending" }) status!: IntegrationActionStatus;
  @Column({ type: "json", nullable: true }) result!: Record<
    string,
    unknown
  > | null;
  @Column({ type: "datetime" }) expiresAt!: Date;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
