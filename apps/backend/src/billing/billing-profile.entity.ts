import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../users/user.entity";

/** Billing details are stored encrypted; only the processor customer id is plain. */
@Entity("billing_profiles")
export class BillingProfile {
  @PrimaryColumn()
  userId!: number;

  @OneToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user?: User;

  @Column({ type: "text", nullable: true })
  payload!: string | null;

  @Index("IDX_billing_stripe_customer", { unique: true })
  @Column({ type: "varchar", length: 64, nullable: true })
  stripeCustomerId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
