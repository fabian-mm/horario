import { Db, MongoClient } from "mongodb";
import { setServers } from "node:dns";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "bitacora";
const customDnsServers = process.env.MONGODB_DNS_SERVERS?.split(",").map((server) => server.trim()).filter(Boolean);

if (!uri) {
  throw new Error("El entorno requiere MONGODB_URI para conectar MongoDB.");
}

let clientPromise: Promise<MongoClient> | undefined;
let indexesCreated = false;

function connectClient() {
  if (customDnsServers?.length) setServers(customDnsServers);
  return new MongoClient(uri!, {
    appName: "bitacora-del-navegante",
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
  }).connect();
}

function getClientPromise() {
  if (process.env.NODE_ENV !== "development") {
    if (!clientPromise) {
      const connection = connectClient();
      clientPromise = connection;
      connection.catch(() => {
        if (clientPromise === connection) clientPromise = undefined;
      });
    }
    return clientPromise;
  }
  const globalAny = globalThis as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
  if (!globalAny._mongoClientPromise) {
    const connection = connectClient();
    globalAny._mongoClientPromise = connection;
    connection.catch(() => {
      if (globalAny._mongoClientPromise === connection) globalAny._mongoClientPromise = undefined;
    });
  }
  return globalAny._mongoClientPromise;
}

export type DatabaseIssue = "authentication" | "dns" | "network" | "unavailable";

function getErrorSignals(error: unknown) {
  const signals: string[] = [];
  const visited = new Set<unknown>();

  const visit = (value: unknown, depth: number) => {
    if (!value || depth > 5 || visited.has(value)) return;
    visited.add(value);

    if (value instanceof Map) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof value !== "object") {
      signals.push(String(value));
      return;
    }

    const record = value as Record<string, unknown>;
    ["name", "code", "codeName", "message"].forEach((key) => {
      if (record[key] !== undefined) signals.push(String(record[key]));
    });
    ["cause", "reason", "error", "servers"].forEach((key) => visit(record[key], depth + 1));
  };

  visit(error, 0);
  return signals.join(" ").toLowerCase();
}

export function getDatabaseIssue(error: unknown): DatabaseIssue {
  const signals = getErrorSignals(error);
  if (/bad auth|authentication failed|authfailed|atlaserror|\b8000\b|\b18\b/.test(signals)) return "authentication";
  if (/enotfound|eservfail|dns|querysrv|querytxt/.test(signals)) return "dns";
  if (/econnrefused|econnreset|etimedout|server selection|topology/.test(signals)) return "network";
  return "unavailable";
}

export function getDatabaseErrorMessage(error: unknown) {
  switch (getDatabaseIssue(error)) {
    case "authentication":
      return "MongoDB rechazó las credenciales configuradas. Revisa el usuario y la contraseña de MONGODB_URI y reinicia la aplicación.";
    case "dns":
      return "No se pudo localizar el clúster de MongoDB. Revisa MONGODB_DNS_SERVERS o la dirección del clúster.";
    case "network":
      return "No se pudo alcanzar MongoDB. Revisa la conexión y que Atlas permita el acceso desde esta red.";
    default:
      return "MongoDB no está disponible en este momento. Intenta nuevamente.";
  }
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
