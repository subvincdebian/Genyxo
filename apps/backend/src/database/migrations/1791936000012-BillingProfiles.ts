import { MigrationInterface, QueryRunner } from "typeorm";
export class BillingProfiles1791936000012 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(
      "CREATE TABLE IF NOT EXISTS billing_profiles (userId int NOT NULL PRIMARY KEY, payload text NULL, stripeCustomerId varchar(64) NULL, createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX IDX_billing_stripe_customer (stripeCustomerId), CONSTRAINT FK_billing_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB",
    );
  }
  async down(q: QueryRunner) {
    await q.query("DROP TABLE billing_profiles");
  }
}
