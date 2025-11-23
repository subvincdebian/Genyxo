import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  BeforeInsert,
  OneToMany
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Transaction } from './transaction.entity';
import { Message } from '../chat/message.entity';
import { Role } from './role.enum';

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

  @OneToMany(() => Message, (message) => message.user) 
  messages: Message[];

  @BeforeInsert()
  async hashPassword() {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
  }
}
