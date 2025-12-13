import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  BeforeInsert,
  OneToMany, 
  CreateDateColumn
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Transaction } from './transaction.entity';
import { Message } from '../chat/message.entity';
import { Conversation } from '../chat/conversation.entity';
import { Role } from './role.enum';
import { SupportTicket } from '../support/support.entity';
import { Notification } from '../notifications/notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'longtext', nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @Column({ default: 0, type: 'decimal', precision: 10, scale: 2 }) 
  credits: number;

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => SupportTicket, (ticket) => ticket.user)
  tickets: SupportTicket[];

  @OneToMany(() => Message, (message) => message.user) 
  messages: Message[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[];

  @Column({ nullable: true })
  referrerId: number | null;

  @Column('decimal', { precision: 10, scale: 2, default: 0, nullable: true })
  referralBalance: number;

  @BeforeInsert()
  async hashPassword() {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
  }
}
