import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { IAttachedFile } from "./message.entity";

@Entity("chat_projects")
@Index("IDX_chat_projects_user_updated", ["userId", "updatedAt"])
export class ChatProject {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: "text", nullable: true })
  instructions!: string | null;

  /** Sidebar glyph and tint (see project-appearance); null is the plain folder. */
  @Column({ type: "varchar", length: 24, nullable: true })
  icon!: string | null;

  @Column({ type: "varchar", length: 16, nullable: true })
  color!: string | null;

  @Column({ type: "json", nullable: true })
  files!: IAttachedFile[] | null;

  @Column({ type: "datetime", nullable: true })
  pinnedAt!: Date | null;

  @Column({ type: "int", nullable: true })
  presetId!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
