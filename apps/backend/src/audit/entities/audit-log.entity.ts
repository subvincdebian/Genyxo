import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export enum AuditAction {
  // Auth
  AUTH_LOGIN = "AUTH_LOGIN",
  AUTH_LOGOUT = "AUTH_LOGOUT",
  AUTH_PASSWORD_CHANGE = "AUTH_PASSWORD_CHANGE",
  AUTH_PASSWORD_RESET = "AUTH_PASSWORD_RESET",

  // Administration & Roles
  USER_ROLE_UPDATED = "USER_ROLE_UPDATED",
  USER_PROFILE_UPDATED = "USER_PROFILE_UPDATED",
  USER_BLOCKED = "USER_BLOCKED",

  // Financial & Credits
  CREDITS_MANUAL_ADD = "CREDITS_MANUAL_ADD",
  TRANSACTION_APPROVED = "TRANSACTION_APPROVED",
  TRANSACTION_DECLINED = "TRANSACTION_DECLINED",
  TRANSACTION_CREATED = "TRANSACTION_CREATED",

  // Support
  TICKET_RESOLVED = "TICKET_RESOLVED",
}

@Entity("audit_logs")
@Index(["actorId", "createdAt"])
@Index(["userId", "createdAt"])
@Index(["action", "createdAt"])
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "int", nullable: true })
  actorId?: number | null;

  @Index()
  @Column({ type: "int", nullable: true })
  userId?: number | null;

  @Index()
  @Column({ type: "varchar", length: 100 })
  action!: string;

  @Column({ type: "varchar", length: 100 })
  resource!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  resourceId?: string | null;

  @Column({ type: "json", nullable: true })
  oldValues?: Record<string, any> | null;

  @Column({ type: "json", nullable: true })
  newValues?: Record<string, any> | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  ipAddress?: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  userAgent?: string | null;

  @Column({ type: "varchar", length: 32, default: "SUCCESS" })
  status!: "SUCCESS" | "FAILURE";

  @Column({ type: "text", nullable: true })
  errorMessage?: string | null;

  @Column({ type: "json", nullable: true })
  metadata?: Record<string, any> | null;

  @Index()
  @CreateDateColumn({ type: "datetime", precision: 6 })
  createdAt!: Date;
}
