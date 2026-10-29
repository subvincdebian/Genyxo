import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./user.entity";
@Entity("auth_sessions")
@Index(["userId", "expiresAt"])
export class AuthSession {
  @PrimaryColumn({ type: "varchar", length: 64 }) id!: string;
  @Column() userId!: number;
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;
  @Column({ default: 0 }) sessionVersion!: number;
  @Column({ type: "varchar", length: 512, default: "" }) userAgent!: string;
  @Column({ type: "varchar", length: 64, default: "" }) ip!: string;
  @Column({ type: "datetime" }) createdAt!: Date;
  @Column({ type: "datetime" }) lastUsedAt!: Date;
  @Column({ type: "datetime" }) expiresAt!: Date;
  @Column({ type: "datetime", nullable: true }) revokedAt!: Date | null;
}
