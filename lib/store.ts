/* One small data layer for every module.
 *
 *   - MongoDB when MONGODB_URI is set (production).
 *   - Otherwise plain JSON files under ./data (or DATA_DIR) so the app runs on any machine with no database.
 *
 * Both give the same few operations on a named collection of documents with a string `_id`. The shop's data is
 * small (hundreds of parties, thousands of invoices), so lists are read whole and filtered in code. If it ever
 * grows past that, add indexed queries here without touching the modules.
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { db, dbConfigured } from "@/lib/db";

export type Doc = { _id: string };

const DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), "data");

export interface Collection<T extends Doc> {
  all(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  insert(doc: Omit<T, "_id"> & { _id?: string }): Promise<T>;
  /** merge `patch` into the document; null when it does not exist */
  update(id: string, patch: Partial<T>): Promise<T | null>;
  remove(id: string): Promise<boolean>;
}

/* ---------------- files ---------------- */

const fileOf = (name: string) => path.join(DIR, `${name}.json`);
const readFile = <T>(name: string): T[] => {
  try {
    return JSON.parse(fs.readFileSync(fileOf(name), "utf8")) as T[];
  } catch {
    return [];
  }
};
const writeFile = (name: string, rows: unknown[]) => {
  fs.mkdirSync(DIR, { recursive: true });
  const f = fileOf(name);
  const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
  fs.renameSync(tmp, f); // never leaves a half-written file
};

function fileCollection<T extends Doc>(name: string): Collection<T> {
  return {
    async all() {
      return readFile<T>(name);
    },
    async get(id) {
      return readFile<T>(name).find((r) => r._id === id) ?? null;
    },
    async insert(doc) {
      const row = { ...doc, _id: doc._id ?? randomUUID() } as T;
      writeFile(name, [...readFile<T>(name), row]);
      return row;
    },
    async update(id, patch) {
      const rows = readFile<T>(name);
      const i = rows.findIndex((r) => r._id === id);
      if (i < 0) return null;
      rows[i] = { ...rows[i], ...patch, _id: id };
      writeFile(name, rows);
      return rows[i];
    },
    async remove(id) {
      const rows = readFile<T>(name);
      const rest = rows.filter((r) => r._id !== id);
      if (rest.length === rows.length) return false;
      writeFile(name, rest);
      return true;
    },
  };
}

/* ---------------- MongoDB ---------------- */

function mongoCollection<T extends Doc>(name: string): Collection<T> {
  // the documents carry a string _id, which the driver's default ObjectId typing does not know about
  const c = async () => (await db()).collection(name) as unknown as import("mongodb").Collection<Record<string, unknown>>;
  const clean = (r: unknown) => r as T;
  return {
    async all() {
      return (await (await c()).find().toArray()).map(clean);
    },
    async get(id) {
      const r = await (await c()).findOne({ _id: id as never });
      return r ? clean(r) : null;
    },
    async insert(doc) {
      const row = { ...doc, _id: doc._id ?? randomUUID() } as T;
      await (await c()).insertOne(row as never);
      return row;
    },
    async update(id, patch) {
      const { _id, ...rest } = patch as Record<string, unknown>;
      void _id;
      const r = await (await c()).findOneAndUpdate({ _id: id as never }, { $set: rest }, { returnDocument: "after" });
      return r ? clean(r) : null;
    },
    async remove(id) {
      return ((await (await c()).deleteOne({ _id: id as never })).deletedCount ?? 0) > 0;
    },
  };
}

export function col<T extends Doc>(name: string): Collection<T> {
  return dbConfigured() ? mongoCollection<T>(name) : fileCollection<T>(name);
}

export const newId = () => randomUUID();
