import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum TransactionStatus {
  PENDING = 'PENDING',
  WAITING = 'WAITING', // Коли юзер перейшов, але ще не оплатив
  CONFIRMING = 'CONFIRMING', // Транзакція в мережі, чекаємо підтверджень
  APPROVED = 'APPROVED', // Успіх!
  DECLINED = 'DECLINED', // Помилка або тайм-аут
  PARTIALLY_PAID = 'PARTIALLY_PAID' // Якщо скинули менше ніж треба
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  externalId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number; // Сума в доларах/гривнях

  @Column()
  creditsAmount: number; // Скільки кредитів нараховано

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus; // 'PENDING', 'SUCCESS', 'FAILED'

  @Column()
  provider: string; // 'CRYPTO', 'WAYFORPAY', 'PAYPAL', 'NOWPAYMENTS

  @CreateDateColumn()
  createdAt: Date;

  // Зв'язок: Одна транзакція належить одному користувачу
  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'userId' })
  user: User;
}
