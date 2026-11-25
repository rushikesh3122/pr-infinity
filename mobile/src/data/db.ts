import * as SQLite from 'expo-sqlite';

/**
 * On-device document store backed by SQLite. Each record is a JSON document in a
 * collection (leads, invoices, settings, counters, assets). SQLite has no practical
 * size limit here and survives app updates; it is removed only if the app is uninstalled.
 */
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('pr-infinity.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS docs (
          collection TEXT NOT NULL,
          id TEXT NOT NULL,
          data TEXT NOT NULL,
          PRIMARY KEY (collection, id)
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

export const store = {
  async all<T>(collection: string): Promise<T[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ data: string }>('SELECT data FROM docs WHERE collection = ?', [collection]);
    return rows.map((r) => JSON.parse(r.data) as T);
  },
  async get<T>(collection: string, id: string): Promise<T | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM docs WHERE collection = ? AND id = ?', [collection, id]);
    return row ? (JSON.parse(row.data) as T) : null;
  },
  async put<T extends object>(collection: string, id: string, doc: T): Promise<T> {
    const db = await getDb();
    await db.runAsync('INSERT OR REPLACE INTO docs (collection, id, data) VALUES (?, ?, ?)', [collection, id, JSON.stringify(doc)]);
    return doc;
  },
  async remove(collection: string, id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM docs WHERE collection = ? AND id = ?', [collection, id]);
  },
  async dump(): Promise<{ collection: string; id: string; data: string }[]> {
    const db = await getDb();
    return db.getAllAsync('SELECT collection, id, data FROM docs', []);
  },
  async replaceAll(rows: { collection: string; id: string; data: string }[]): Promise<void> {
    const db = await getDb();
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM docs', []);
      for (const r of rows) await txn.runAsync('INSERT INTO docs (collection, id, data) VALUES (?, ?, ?)', [r.collection, r.id, r.data]);
    });
  },
};
