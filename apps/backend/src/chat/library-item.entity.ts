import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("chat_library_items")
@Index("IDX_chat_library_user_created", ["userId", "createdAt"])
export class ChatLibraryItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 20 })
  /** "place": a saved map place; content holds {lat, lng, address?, kind?}. */
  type!: "image" | "video" | "audio" | "document" | "place";

  @Column({ type: "text", nullable: true })
  url!: string | null;

  @Column({ type: "mediumtext", nullable: true })
  content!: string | null;

  @Column({ type: "int", nullable: true })
  sourceMessageId!: number | null;

  @Column({ default: false })
  isFavorite!: boolean;

  @Column({ type: "int", nullable: true })
  folderId!: number | null;

  /** The chat that generated this media, for "Open source chat". */
  @Column({ type: "int", nullable: true })
  conversationId!: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}
