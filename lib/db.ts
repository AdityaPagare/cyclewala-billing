/* MongoDB connection, shared by the whole server process (and kept across dev hot-reloads).
 *
 *   MONGODB_URI   the connection string (MongoDB Atlas free tier works)
 *   MONGODB_DB    database name, default "cyclewala_billing"
 *
 * Collections: business, parties, items, invoices, payments, staff, attendance, payroll — see lib/types.ts.
 */
import { MongoClient, type Db } from "mongodb";

export const dbConfigured = () => !!process.env.MONGODB_URI;

const g = globalThis as unknown as { __cwbMongo?: Promise<Db> };

export function db(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return Promise.reject(new Error("MONGODB_URI is not set"));
  g.__cwbMongo ??= new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8_000 })
    .connect()
    .then((c) => c.db(process.env.MONGODB_DB || "cyclewala_billing"))
    .catch((err) => {
      g.__cwbMongo = undefined;
      throw err;
    });
  return g.__cwbMongo;
}
