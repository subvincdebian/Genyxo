import { randomUUID } from "crypto";
import {
  BeforeInsert,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../users/user.entity";
import { Message } from "./message.entity";

@Entity("conversation")
@Index(["userId", "updatedAt"])
export class Conversation {
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Unguessable key for chat URLs (/c/<uuid>), as in ChatGPT. The numeric id
   * stays internal; every lookup by key is still scoped to the owner.
   * Nullable so rows from before this column get a key on first read.
   */
  @Index("IDX_conversation_public_id", { unique: true })
  @Column({ type: "char", length: 36, nullable: true })
  publicId!: string | null;

  @Column({ default: "New Chat" })
  title!: string;

  @Column({ type: "datetime", nullable: true })
  pinnedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  archivedAt!: Date | null;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  lastActivityAt!: Date;

  @Column({ length: 16, default: "fallback" })
  titleSource!: "fallback" | "generated" | "manual";

  @Column({ default: 0 })
  titleVersion!: number;

  @Column({ length: 16, default: "idle" })
  titleStatus!: "idle" | "queued" | "running" | "complete" | "failed";

  @Column({ default: 0 })
  titleAttempts!: number;

  @Column({ type: "datetime", nullable: true })
  titleLeaseUntil!: Date | null;

  @Column({ type: "int", nullable: true })
  presetId!: number | null;

  @Column({ type: "mediumtext", nullable: true })
  contextSummary!: string | null;

  @Column({ type: "int", default: 0 })
  summaryThroughMessageId!: number;

  @Index("IDX_conversation_project_id")
  @Column({ type: "int", nullable: true })
  projectId!: number | null;

  @Index()
  @Column()
  userId!: number;

  @ManyToOne(() => User, (user) => user.conversations)
  @JoinColumn({ name: "userId" })
  user!: User;

  @OneToMany(() => Message, (message) => message.conversation)
  messages!: Message[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  assignPublicId() {
    this.publicId ||= randomUUID();
  }
}
