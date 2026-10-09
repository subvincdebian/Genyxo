import * as dotenv from "dotenv";
import * as path from "path";
import { DataSource, DataSourceOptions } from "typeorm";

dotenv.config();

function buildDataSourceOptions(): DataSourceOptions {
  const isProduction =
    process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  const tidbHost = process.env.MYSQL_TIDB_HOST;
  const replicaHost = process.env.MYSQL_REPLICA_HOST;

  const baseConfig = {
    entities: [path.join(__dirname, "../**/*.entity{.ts,.js}")],
    migrations: [path.join(__dirname, "./migrations/*{.ts,.js}")],
    migrationsTableName: "typeorm_migrations",
    synchronize: false,
    logging: !isProduction && process.env.DB_LOGGING === "true",
    charset: "utf8mb4",
    timezone: "Z",
    extra: {
      connectionLimit: process.env.VERCEL ? 3 : 100,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      waitForConnections: true,
      queueLimit: 0,
      connectTimeout: 20000,
      idleTimeout: 60000,
      maxIdle: 50,
      decimalNumbers: true,
      maxPreparedStatements: 16000,
    },
  };

  // 1. TiDB Cloud Configuration
  if (tidbHost) {
    return {
      type: "mysql",
      ...baseConfig,
      host: tidbHost,
      port: parseInt(process.env.MYSQL_TIDB_PORT || "4000", 10),
      username: process.env.MYSQL_TIDB_USERNAME,
      password: process.env.MYSQL_TIDB_PASSWORD,
      database: process.env.MYSQL_TIDB_DATABASE || "test",
      ssl: {
        rejectUnauthorized: true,
      },
    };
  }

  // 2. Read / Write Replication Split (if replica is configured)
  if (replicaHost) {
    const masterHost = process.env.MYSQLHOST || "localhost";
    const masterPort = parseInt(process.env.MYSQLPORT || "3306", 10);
    const masterUser = process.env.MYSQLUSER || "root";
    const masterPassword = process.env.MYSQLPASSWORD || "";
    const database = process.env.MYSQLDATABASE || "genyxo";

    return {
      type: "mysql",
      ...baseConfig,
      replication: {
        master: {
          host: masterHost,
          port: masterPort,
          username: masterUser,
          password: masterPassword,
          database,
        },
        slaves: [
          {
            host: replicaHost,
            port: parseInt(
              process.env.MYSQL_REPLICA_PORT || String(masterPort),
              10,
            ),
            username: process.env.MYSQL_REPLICA_USER || masterUser,
            password: process.env.MYSQL_REPLICA_PASSWORD || masterPassword,
            database,
          },
        ],
      },
    };
  }

  // 3. Standard Single-Instance MySQL (Local, Railway, Docker)
  return {
    type: "mysql",
    ...baseConfig,
    host: process.env.MYSQLHOST || "localhost",
    port: parseInt(process.env.MYSQLPORT || "3306", 10),
    username: process.env.MYSQLUSER || "root",
    password: process.env.MYSQLPASSWORD || "",
    database: process.env.MYSQLDATABASE || "genyxo",
    ssl: process.env.MYSQL_SSL ? { rejectUnauthorized: false } : undefined,
  };
}

export default new DataSource(buildDataSourceOptions());
