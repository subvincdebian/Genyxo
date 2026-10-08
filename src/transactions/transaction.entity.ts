import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../users/user.entity";

export enum TransactionStatus {
  PENDING = "PENDING",
  WAITING = "WAITING", // Коли юзер перейшов, але ще не оплатив
  CONFIRMING = "CONFIRMING", // Транзакція в мережі, чекаємо підтверджень
  APPROVED = "APPROVED", // Успіх!
  DECLINED = "DECLINED", // Помилка або тайм-аут
  PARTIALLY_PAID = "PARTIALLY_PAID", // Якщо скинули менше ніж треба
}

export enum TransactionType {
  PURCHASE = "PURCHASE", // Пополнение баланса
  SPEND = "SPEND", // Трата на ИИ
  REFUND = "REFUND", // Возврат при ошибке
}

export class ColumnNumericTransformer {
  to(data: number): number {
    return data;
  }
  from(data: string): number {
    return parseFloat(data);
  }
}

@Entity("transactions")
@Index(["userId", "createdAt"])
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", nullable: true })
  packId?: number;

  @Column({ nullable: true })
  externalId?: string;

  @Column("decimal", {
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  amount!: number;

  @Column({ type: "int" })
  creditsAmount!: number;

  @Column({
    type: "enum",
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status!: TransactionStatus;

  @Column()
  provider!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column()
  userId!: number;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: "userId" })
  user?: User;

  @Column({
    type: "enum",
    enum: TransactionType,
    default: TransactionType.PURCHASE,
  })
  type!: TransactionType;

  @Column({ nullable: true })
  description?: string;
}
