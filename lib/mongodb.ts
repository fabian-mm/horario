import { Db, MongoClient } from "mongodb";
import { setServers } from "node:dns";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "bitacora";
const customDnsServers = process.env.MONGODB_DNS_SERVERS?.split(",").map((server) => server.trim()).filter(Boolean);

if (customDnsServers?.length) setServers(customDnsServers);

if (!uri) {
  throw new Error("El entorno requiere MONGODB_URI para conectar MongoDB.");
}

let clientPromise: Promise<MongoClient> | undefined;
let indexesCreated = false;

function getClientPromise() {
  if (process.env.NODE_ENV !== "development") {
    clientPromise ??= new MongoClient(uri!, { appName: "bitacora-del-navegante" }).connect();
    return clientPromise;
  }
  const globalAny = globalThis as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
  if (!globalAny._mongoClientPromise) {
    globalAny._mongoClientPromise = new MongoClient(uri!, { appName: "bitacora-del-navegante" }).connect();
  }
  return globalAny._mongoClientPromise;
}

async function ensureIndexes(db: Db) {
  if (indexesCreated) return;
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ id: 1 }, { unique: true }),
    db.collection("missions").createIndex({ userId: 1, id: 1 }, { unique: true }),
    db.collection("missions").createIndex({ userId: 1, date: 1, time: 1 }),
  ]);
  indexesCreated = true;
}

export async function getDb() {
  const client = await getClientPromise();
  const db = client.db(dbName);
  await ensureIndexes(db);
  return db;
}
