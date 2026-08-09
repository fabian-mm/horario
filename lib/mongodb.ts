import { Db, MongoClient } from "mongodb";
import { setServers } from "node:dns";

const cleanEnvironmentValue = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const quoted = (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return quoted ? trimmed.slice(1, -1).trim() : trimmed;
};

const uri = cleanEnvironmentValue(process.env.MONGODB_URI);
const dbName = cleanEnvironmentValue(process.env.MONGODB_DB) ?? "bitacora";
const customDnsServers = process.env.MONGODB_DNS_SERVERS?.split(",").map((server) => server.trim()).filter(Boolean);
const isVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);

let clientPromise: Promise<MongoClient> | undefined;
let indexesPromise: Promise<void> | undefined;

function connectClient() {
  if (!uri) throw new Error("MONGODB_URI_MISSING");
  if (!/^mongodb(?:\+srv)?:\/\//.test(uri)) throw new Error("MONGODB_URI_INVALID_SCHEME");
  if (customDnsServers?.length && !isVercel) setServers(customDnsServers);
  return new MongoClient(uri, {
    appName: "bitacora-del-navegante",
    connectTimeoutMS: 10_000,
    maxIdleTimeMS: 30_000,
    maxPoolSize: 10,
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

export type DatabaseIssue = "authentication" | "authorization" | "configuration" | "dns" | "network" | "tls" | "unavailable";

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
  if (/mongodb_uri_missing|mongodb_uri_invalid|mongoparseerror|invalid scheme|invalid connection string|uri malformed/.test(signals)) return "configuration";
  if (/bad auth|authentication failed|authfailed|atlaserror|\b8000\b|\b18\b/.test(signals)) return "authentication";
  if (/not authorized|unauthorized|requires authentication|command createindexes requires|\b13\b/.test(signals)) return "authorization";
  if (/tls|ssl|certificate|self signed|alert handshake/.test(signals)) return "tls";
  if (/enotfound|eservfail|dns|querysrv|querytxt/.test(signals)) return "dns";
  if (/econnrefused|econnreset|etimedout|server selection|topology/.test(signals)) return "network";
  return "unavailable";
}

export function logDatabaseError(context: string, error: unknown) {
  const record = typeof error === "object" && error ? error as Record<string, unknown> : {};
  console.error("[mongodb]", {
    code: record.code ? String(record.code) : undefined,
    codeName: record.codeName ? String(record.codeName) : undefined,
    context,
    issue: getDatabaseIssue(error),
    name: record.name ? String(record.name) : undefined,
    runtime: isVercel ? "vercel" : "node",
  });
}

export function getDatabaseErrorMessage(error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return "El servicio de datos no está disponible en este momento. Intenta nuevamente en unos minutos.";
  }
  switch (getDatabaseIssue(error)) {
    case "configuration":
      return "MONGODB_URI no está configurada correctamente en este despliegue. Revisa el valor en Vercel y vuelve a desplegar.";
    case "authentication":
      return "MongoDB rechazó las credenciales configuradas. Revisa el usuario y la contraseña de MONGODB_URI y reinicia la aplicación.";
    case "authorization":
      return "El usuario de MongoDB no tiene permisos suficientes sobre la base de datos configurada.";
    case "tls":
      return "MongoDB rechazó la conexión segura. Revisa que la URI sea la cadena actual de Atlas.";
    case "dns":
      return "No se pudo localizar el clúster de MongoDB. Revisa la dirección incluida en MONGODB_URI.";
    case "network":
      return "No se pudo alcanzar MongoDB. Revisa la conexión y que Atlas permita el acceso desde esta red.";
    default:
      return "MongoDB no está disponible en este momento. Intenta nuevamente.";
  }
}

export function getPublicDatabaseIssue(error: unknown) {
  return process.env.NODE_ENV === "production" ? undefined : getDatabaseIssue(error);
}

async function ensureIndexes(db: Db) {
  if (indexesPromise) return indexesPromise;
  indexesPromise = Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ id: 1 }, { unique: true }),
    db.collection("missions").createIndex({ userId: 1, id: 1 }, { unique: true }),
    db.collection("missions").createIndex({ userId: 1, date: 1, time: 1 }),
    db.collection("weeklyQuests").createIndex({ userId: 1, id: 1 }, { unique: true }),
    db.collection("subjects").createIndex({ userId: 1, id: 1 }, { unique: true }),
    db.collection("subjects").createIndex({ userId: 1, normalizedName: 1 }, { unique: true }),
    db.collection("activityTypes").createIndex({ userId: 1, id: 1 }, { unique: true }),
    db.collection("activityTypes").createIndex({ userId: 1, normalizedName: 1 }, { unique: true }),
    db.collection("missionTypes").createIndex({ userId: 1, id: 1 }, { unique: true }),
    db.collection("missionTypes").createIndex({ userId: 1, normalizedName: 1 }, { unique: true }),
    db.collection("userMigrations").createIndex({ userId: 1, key: 1 }, { unique: true }),
  ]).then(() => undefined);
  indexesPromise.catch(() => { indexesPromise = undefined; });
  return indexesPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  const db = client.db(dbName);
  await ensureIndexes(db);
  return db;
}
