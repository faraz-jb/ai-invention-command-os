import { DatabaseSync } from "node:sqlite";
import { createRequire } from "module";

const nodeRequire = createRequire(import.meta.url);
const dbInit = nodeRequire("../../scripts/db-init.cjs") as {
  ensureDataDir: () => void;
  initSchema: (db: DatabaseSync) => void;
  seedIfEmpty: (db: DatabaseSync) => void;
  DB_PATH: string;
};

export class DbHandle {
  constructor(private raw: DatabaseSync) {}

  exec(sql: string) {
    this.raw.exec(sql);
  }

  prepare(sql: string) {
    return this.raw.prepare(sql);
  }

  transaction<T extends (...args: never[]) => unknown>(fn: T): T {
    return ((...args: Parameters<T>) => {
      this.raw.exec("BEGIN");
      try {
        const result = fn(...args);
        this.raw.exec("COMMIT");
        return result;
      } catch (err) {
        this.raw.exec("ROLLBACK");
        throw err;
      }
    }) as T;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __commandOsDb: DbHandle | undefined;
}

function createConnection(): DbHandle {
  dbInit.ensureDataDir();
  const raw = new DatabaseSync(dbInit.DB_PATH);
  dbInit.initSchema(raw);
  dbInit.seedIfEmpty(raw);
  dbInit.seedClientsIfEmpty(raw);
  return new DbHandle(raw);
}

export function getDb(): DbHandle {
  if (!global.__commandOsDb) {
    global.__commandOsDb = createConnection();
  }
  return global.__commandOsDb;
}
