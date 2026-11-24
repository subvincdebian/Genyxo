import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ChatProject } from "../project.entity";

export type KnowledgeKind = "file" | "url" | "gdrive" | "notion";
export type KnowledgeStatus = "processing" | "ready" | "failed";

/** One document in a project's knowledge base: a file, a web page or an imported page. */
@Entity("knowledge_sources")
@Index("IDX_knowledge_sources_project", ["userId", "projectId"])
export class KnowledgeSource {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  projectId!: number;

  @ManyToOne(() => ChatProject, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project?: ChatProject;

  @Column({ type: "varchar", length: 16 })
  kind!: KnowledgeKind;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  /** The page it came from (web, Drive, Notion); null for an upload. */
  @Column({ type: "varchar", length: 2048, nullable: true })
  url!: string | null;

  /** Drive file id or Notion page id, used to refresh it. */
  @Column({ type: "varchar", length: 255, nullable: true })
  externalId!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  mimeType!: string | null;

  @Column({ type: "int", default: 0 })
  size!: number;

  @Column({ type: "varchar", length: 16, default: "ready" })
  status!: KnowledgeStatus;

  @Column({ type: "varchar", length: 500, nullable: true })
  error!: string | null;

  @Column({ type: "int", default: 0 })
  pages!: number;

  @Column({ type: "int", default: 0 })
  chunks!: number;

  @Column({ type: "int", default: 0 })
  characters!: number;

  @Column({ type: "datetime", nullable: true })
  syncedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

/** A passage of a source, with the page it is on; full-text indexed. */
@Entity("knowledge_chunks")
@Index("IDX_knowledge_chunks_source", ["sourceId", "ordinal"])
@Index("IDX_knowledge_chunks_project", ["userId", "projectId"])
@Index("FTX_knowledge_chunks_text", ["text"], { fulltext: true })
export class KnowledgeChunk {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  sourceId!: number;

  @ManyToOne(() => KnowledgeSource, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sourceId" })
  source?: KnowledgeSource;

  @Column()
  userId!: number;

  @Column()
  projectId!: number;

  @Column({ type: "int" })
  ordinal!: number;

  /** 1-based page for PDFs; null where a document has no pages. */
  @Column({ type: "int", nullable: true })
  page!: number | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  heading!: string | null;

  @Column({ type: "text" })
  text!: string;
}
