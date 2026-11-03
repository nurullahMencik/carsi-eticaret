import path from "node:path";
import fs from "node:fs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

export const DEFAULT_DATABASE_URL = "file:./data/carsi.db";

type SqliteAdapter = Awaited<ReturnType<PrismaBetterSqlite3["connect"]>>;
type SqliteTransaction = Awaited<ReturnType<SqliteAdapter["startTransaction"]>>;

/** Minimal FIFO mutex. */
class Mutex {
  #tail: Promise<void> = Promise.resolve();
  #locked = false;

  async acquire(): Promise<() => void> {
    let release!: () => void;
    const next = new Promise<void>((resolve) => (release = resolve));
    const previous = this.#tail;
    this.#tail = previous.then(() => next);
    await previous;
    this.#locked = true;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.#locked = false;
      release();
    };
  }

  /** Resolves once no transaction holds the lock (queued transactions keep their turn). */
  async waitForIdle(): Promise<void> {
    while (this.#locked) await this.#tail;
  }
}

/**
 * better-sqlite3 uses a single connection per PrismaClient. The stock adapter serialises
 * interactive transactions with a mutex, but plain queries can still run on that same
 * connection *while* a transaction is open (between its awaits) and would silently become
 * part of it — and be rolled back with it. This wrapper makes plain queries wait until no
 * transaction is open, so every transaction is isolated within the process. Across
 * processes, SQLite's own file locking (with a busy timeout) applies.
 */
class SerializedSqliteAdapterFactory {
  readonly provider = "sqlite" as const;
  readonly adapterName: string;
  readonly #inner: PrismaBetterSqlite3;

  constructor(inner: PrismaBetterSqlite3) {
    this.#inner = inner;
    this.adapterName = inner.adapterName;
  }

  async connect(): Promise<SqliteAdapter> {
    const adapter = await this.#inner.connect();
    // WAL: readers never block the writer, and a writer waiting for the lock retries
    // (busy timeout) instead of failing. Ignored for in-memory databases.
    await adapter.executeScript("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;");
    return wrapAdapter(adapter);
  }

  async connectToShadowDb(): Promise<SqliteAdapter> {
    return wrapAdapter(await this.#inner.connectToShadowDb());
  }
}

function wrapAdapter(adapter: SqliteAdapter): SqliteAdapter {
  const mutex = new Mutex();
  const wrapped: SqliteAdapter = Object.create(adapter);
  wrapped.queryRaw = async (query) => {
    await mutex.waitForIdle();
    return adapter.queryRaw(query);
  };
  wrapped.executeRaw = async (query) => {
    await mutex.waitForIdle();
    return adapter.executeRaw(query);
  };
  wrapped.executeScript = async (script) => {
    const release = await mutex.acquire();
    try {
      return await adapter.executeScript(script);
    } finally {
      release();
    }
  };
  wrapped.startTransaction = async (isolationLevel) => {
    const release = await mutex.acquire();
    let tx: SqliteTransaction;
    try {
      tx = await adapter.startTransaction(isolationLevel);
    } catch (error) {
      release();
      throw error;
    }
    const wrappedTx: SqliteTransaction = Object.create(tx);
    wrappedTx.commit = async () => {
      try {
        await tx.commit();
      } finally {
        release();
      }
    };
    wrappedTx.rollback = async () => {
      try {
        await tx.rollback();
      } finally {
        release();
      }
    };
    return wrappedTx;
  };
  return wrapped;
}

/** "file:./data/carsi.db" -> absolute path (relative paths resolve from the project root / cwd). */
export function sqlitePathFromUrl(url: string): string {
  const raw = url.replace(/^file:/, "");
  if (raw === ":memory:") return raw;
  return path.isAbsolute(raw) ? raw : path.resolve(/*turbopackIgnore: true*/ process.cwd(), raw);
}

export function createPrismaClient(url: string = process.env.DATABASE_URL || DEFAULT_DATABASE_URL): PrismaClient {
  const file = sqlitePathFromUrl(url);
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  // `timeout` is better-sqlite3's busy timeout: writers wait for each other instead of failing.
  const adapter = new SerializedSqliteAdapterFactory(new PrismaBetterSqlite3({ url: file, timeout: 15_000 }));
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { __carsiPrisma?: PrismaClient };

export const db: PrismaClient = globalForPrisma.__carsiPrisma ?? createPrismaClient();
globalForPrisma.__carsiPrisma = db;

export type Db = PrismaClient;
export type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/** True for unique-constraint violations (Prisma P2002), regardless of the driver adapter. */
export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return code === "P2002" || /unique constraint/i.test(String((error as { message?: unknown }).message ?? ""));
}
