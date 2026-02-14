import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Index } from 'typeorm';
import { User } from '../users/user.entity';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  content!: string;

  @Column()
  sender!: 'user' | 'bot';

  @Column()
  model!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Index()
  @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
  conversation!: Conversation;

  @ManyToOne(() => User)
  user!: User;

  @Index()
  @Column({ nullable: true })
  requestId!: string;

  @Column({ default: 'text' })
  type!: 'text' | 'video';
}
