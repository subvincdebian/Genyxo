import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type MediaKind = "image" | "video" | "speech" | "music";
export type MediaStatus = "pending" | "ready" | "failed";

/**
 * An image, video or audio clip a chat model generated for a user. The id is
 * a random UUID and doubles as the capability in /api/chat/media/<id>, so the
 * file loads in <img>/<video> tags without a bearer token.
 */
@Entity("generated_media")
@Index("IDX_generated_media_owner", ["userId", "createdAt"])
export class GeneratedMedia {
  @PrimaryColumn({ length: 36 }) id!: string;
  @Column() userId!: number;
  @Column({ type: "int", nullable: true }) conversationId!: number | null;
  @Column({ length: 12 }) kind!: MediaKind;
  @Column({ length: 12, default: "pending" }) status!: MediaStatus;
  @Column({ length: 80, nullable: true, type: "varchar" })
  mimeType!: string | null;
  @Column({ type: "text" }) prompt!: string;
  /** Which model made it, e.g. "gemini-3.1-flash-image" or "fal-ai/veo3.1/fast". */
  @Column({ length: 80 }) provider!: string;
  /** Provider job id while a long generation (video) is running. */
  @Column({ length: 120, nullable: true, type: "varchar" })
  jobId!: string | null;
  @Column({ type: "longblob", nullable: true, select: false })
  data!: Buffer | null;
  @Column({ type: "int", default: 0 }) cost!: number;
  @Column({ length: 300, nullable: true, type: "varchar" })
  error!: string | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
