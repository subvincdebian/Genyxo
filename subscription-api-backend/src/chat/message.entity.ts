import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Index } from 'typeorm';
import { User } from '../users/user.entity';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'mediumtext' })
  content!: string;

  @Column()
  sender!: 'user' | 'bot';

  @Column()
  model!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column()
  @Index()
  conversationId!: number;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation!: Conversation;

  @Column()
  @Index()
  userId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Index()
  @Column({ nullable: true })
  requestId!: string;

  @Column({ default: 'text' })
  type!: 'text' | 'video';
}
