import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type WorkspaceKind =
  | "memory"
  | "preset"
  | "preset-selection"
  | "folder"
  | "library-hidden"
  | "connection"
  | "preferences"
  | "request"
  | "task"
  | "share";

@Entity("chat_workspace_records")
@Index("IDX_workspace_owner_kind", ["userId", "kind"])
@Index("UQ_workspace_owner_key", ["userId", "kind", "recordKey"], {
  unique: true,
})
export class WorkspaceRecord {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @Column({ length: 24 }) kind!: WorkspaceKind;
  @Column({ length: 64 }) recordKey!: string;
  @Column({ type: "json" }) data!: Record<string, any>;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
