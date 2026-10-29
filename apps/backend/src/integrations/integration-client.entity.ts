import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/** An OAuth client Genyxo registered itself at an MCP authorization server. */
@Entity("integration_clients")
@Index("UQ_integration_client", ["issuer", "redirectUri"], { unique: true })
export class IntegrationClient {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ length: 255 }) issuer!: string;
  @Column({ length: 255 }) redirectUri!: string;
  @Column({ length: 255 }) clientId!: string;
  @Column({ type: "text", nullable: true })
  encryptedClientSecret!: string | null;
  @Column({ length: 40, default: "none" }) authMethod!: string;
  @CreateDateColumn() createdAt!: Date;
}
