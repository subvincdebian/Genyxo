import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  SUPPORT = 'SUPPORT',
  INFO = 'INFO'
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  userId!: number;

  @Column()
  title!: string;

  @Column('text')
  message!: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type!: NotificationType;

  @Column({ default: false })
  isRead!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'userId' })
  user?: User;
}
