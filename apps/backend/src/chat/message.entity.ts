import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from "typeorm";
import { Index } from "typeorm";
import { User } from "../users/user.entity";
import { Conversation } from "./conversation.entity";

export interface IAttachedFile {
  id?: string;
  mime_type: string;
  data?: string;
  extracted_text?: string;
  text_chunks?: { index: number; text: string }[];
  name: string;
  size?: number;
}

@Entity("messages")
@Index(["conversationId", "createdAt"])
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "mediumtext" })
  content!: string;

  @Column()
  sender!: "user" | "bot";

  @Column()
  model!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Index()
  @Column()
  conversationId!: number;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "conversationId" })
  conversation!: Conversation;

  @Index()
  @Column()
  userId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user!: User;

  @Index()
  @Column({ nullable: true })
  requestId!: string;

  @Column({ default: "text" })
  type!: "text" | "video";

  // meta + base64
  @Column({ type: "json", nullable: true })
  files!: IAttachedFile[] | null;

  @Column({ type: "json", nullable: true })
  activity!: string[] | null;

  @Column({ type: "json", nullable: true })
  sources!: string[] | null;

  @Index("IDX_messages_alternative_to")
  @Column({ type: "int", nullable: true })
  alternativeToMessageId!: number | null;
}
