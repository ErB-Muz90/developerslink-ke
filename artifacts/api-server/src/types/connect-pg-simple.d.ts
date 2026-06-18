declare module "connect-pg-simple" {
  import session from "express-session";
  import { Pool } from "pg";

  interface PgStoreOptions {
    pool?: Pool;
    conString?: string;
    conObject?: Record<string, unknown>;
    tableName?: string;
    schemaName?: string;
    createTableIfMissing?: boolean;
    ttl?: number;
    pruneSessionInterval?: number;
    errorLog?: (...args: unknown[]) => void;
  }

  interface PgStore extends session.Store {
    new (options?: PgStoreOptions): PgStore;
  }

  function connectPgSimple(session: typeof import("express-session")): PgStore;

  export default connectPgSimple;
}
