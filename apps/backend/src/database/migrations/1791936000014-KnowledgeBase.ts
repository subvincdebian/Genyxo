import { MigrationInterface, QueryRunner } from "typeorm";

/** Project knowledge bases: sources and their full-text indexed passages. */
export class KnowledgeBase1791936000014 implements MigrationInterface {
  name = "KnowledgeBase1791936000014";
  async up(q: QueryRunner) {
    await q.query(
      "CREATE TABLE IF NOT EXISTS knowledge_sources (id int NOT NULL AUTO_INCREMENT, userId int NOT NULL, projectId int NOT NULL, kind varchar(16) NOT NULL, title varchar(255) NOT NULL, url varchar(2048) NULL, externalId varchar(255) NULL, mimeType varchar(120) NULL, size int NOT NULL DEFAULT 0, status varchar(16) NOT NULL DEFAULT 'ready', error varchar(500) NULL, pages int NOT NULL DEFAULT 0, chunks int NOT NULL DEFAULT 0, characters int NOT NULL DEFAULT 0, syncedAt datetime NULL, createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (id), INDEX IDX_knowledge_sources_project (userId, projectId), CONSTRAINT FK_knowledge_sources_project FOREIGN KEY (projectId) REFERENCES chat_projects(id) ON DELETE CASCADE) ENGINE=InnoDB",
    );
    await q.query(
      "CREATE TABLE IF NOT EXISTS knowledge_chunks (id int NOT NULL AUTO_INCREMENT, sourceId int NOT NULL, userId int NOT NULL, projectId int NOT NULL, ordinal int NOT NULL, page int NULL, heading varchar(255) NULL, text text NOT NULL, PRIMARY KEY (id), INDEX IDX_knowledge_chunks_source (sourceId, ordinal), INDEX IDX_knowledge_chunks_project (userId, projectId), FULLTEXT INDEX FTX_knowledge_chunks_text (text), CONSTRAINT FK_knowledge_chunks_source FOREIGN KEY (sourceId) REFERENCES knowledge_sources(id) ON DELETE CASCADE) ENGINE=InnoDB",
    );
  }
  async down(q: QueryRunner) {
    await q.query("DROP TABLE IF EXISTS knowledge_chunks");
    await q.query("DROP TABLE IF EXISTS knowledge_sources");
  }
}
