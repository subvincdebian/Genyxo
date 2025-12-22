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

  @Column({ type: 'int', nullable: true })
  packId: number;

  @Column({ nullable: true })
  externalId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  creditsAmount: number;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column()
  provider: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'userId' })
  user: User;
}
