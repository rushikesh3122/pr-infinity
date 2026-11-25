/** Web fallback (for testing in a browser): same API as db.ts, stored in localStorage. */
const KEY = 'pri.docs.v1';
type Row = { collection: string; id: string; data: string };

const load = (): Record<string, string> => JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '{}');
const save = (all: Record<string, string>) => globalThis.localStorage?.setItem(KEY, JSON.stringify(all));
const k = (c: string, id: string) => `${c}\u0000${id}`;

export const store = {
  async all<T>(collection: string): Promise<T[]> {
    const all = load();
    return Object.entries(all).filter(([key]) => key.startsWith(`${collection}\u0000`)).map(([, v]) => JSON.parse(v) as T);
  },
  async get<T>(collection: string, id: string): Promise<T | null> {
    const v = load()[k(collection, id)];
    return v ? (JSON.parse(v) as T) : null;
  },
  async put<T extends object>(collection: string, id: string, doc: T): Promise<T> {
    const all = load();
    all[k(collection, id)] = JSON.stringify(doc);
    save(all);
    return doc;
  },
  async remove(collection: string, id: string): Promise<void> {
    const all = load();
    delete all[k(collection, id)];
    save(all);
  },
  async dump(): Promise<Row[]> {
    return Object.entries(load()).map(([key, data]) => {
      const [collection, id] = key.split('\u0000');
      return { collection, id, data };
    });
  },
  async replaceAll(rows: Row[]): Promise<void> {
    save(Object.fromEntries(rows.map((r) => [k(r.collection, r.id), r.data])));
  },
};
