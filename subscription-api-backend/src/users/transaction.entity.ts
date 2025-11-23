import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number; // Сума в доларах/гривнях

  @Column()
  creditsAmount: number; // Скільки кредитів нараховано

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus; // 'PENDING', 'SUCCESS', 'FAILED'

  @Column()
  provider: string; // 'CRYPTO', 'WAYFORPAY', 'PAYPAL'

  @CreateDateColumn()
  createdAt: Date;

  // Зв'язок: Одна транзакція належить одному користувачу
  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'userId' })
  user: User;
}
