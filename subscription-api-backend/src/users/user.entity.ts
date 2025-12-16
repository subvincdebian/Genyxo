import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  BeforeInsert,
  OneToMany,
  JoinColumn,
  ManyToOne
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Transaction } from '../transactions/transaction.entity';
import { Message } from '../chat/message.entity';
import { Conversation } from '../chat/conversation.entity';
import { Role } from './role.enum';
import { SupportTicket } from '../support/support.entity';
import { Notification } from '../notifications/notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: 'varchar', length: 255 })
  email: string;

  @Column({ nullable: true, select: false, type: 'varchar' })
  password: string;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'longtext', nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true, select: false, type: 'varchar', length: 255 })
  verificationToken: string | null;

  @Column({ nullable: true, select: false, type: 'varchar', length: 255 })
  googleId: string;

  @Column({ nullable: true, select: false, type: 'varchar', length: 255 })
  facebookId: string;

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

  @Column({ type: 'int', nullable: true })
  referrerId: number | null;

  @Column({ default: 0, type: 'decimal', precision: 10, scale: 2 })
  referralBalance: number;

  @Column({ nullable: true, unique: true, type: 'varchar', length: 255 })
  referralCode: string;

  @ManyToOne(() => User, user => user.referrals)
  @JoinColumn({ name: 'referrerId' })
  referrer: User;

  @OneToMany(() => User, user => user.referrer)
  referrals: User[];

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
        const salt = await bcrypt.genSalt();
        this.password = await bcrypt.hash(this.password, salt);
    }
  }
}
