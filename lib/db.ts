import bcrypt from "bcryptjs";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import citySeeds from "@/data/canadian-cities.json";
import { logger } from "@/lib/logger";

declare global {
  var __simsanPool: Pool | undefined;
  var __simsanSchemaReady: Promise<void> | undefined;
}

const serviceSeeds = [
  "Roof moss removal",
  "Gutter cleaning from inside",
  "Gutter cleaning from outside",
  "Window washing",
  "Awning washing",
  "Skylights washing",
  "Vinyl sidings soft wash",
  "Stucco pressure washing",
  "Sidewalk pressure washing",
  "Driveway pressure washing",
  "Front stairs pressure washing",
  "Backyard pressure washing",
  "Downspout fixing",
  "Leak fixing",
  "Tile replacement",
  "Tile repair",
  "Back patio pressure washing",
  "Garage roof moss removal",
  "Garage gutter cleaning from inside",
  "Garage gutter cleaning from outside",
  "Painting",
];

function schemaName() {
  const schema = process.env.DB_SCHEMA || "public";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new Error("DB_SCHEMA must be a valid PostgreSQL identifier");
  }
  return schema;
}

function createPool() {
  const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined;
  if (process.env.DATABASE_URL) {
    return new Pool({ connectionString: process.env.DATABASE_URL, ssl });
  }
  const missing = ["DB_HOST", "DB_USERNAME", "DB_PASSWORD", "DB_NAME"].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing database environment variables: ${missing.join(", ")}`);
  return new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl,
  });
}

export function pool() {
  global.__simsanPool ??= createPool();
  return global.__simsanPool;
}

async function initializeDatabase() {
  const startedAt = Date.now();
  logger.info("database.initialization.started", { schema: schemaName() });
  const db = pool();
  const schema = schemaName();
  const qSchema = `"${schema}"`;
  await db.query(`CREATE SCHEMA IF NOT EXISTS ${qSchema}`);
  await db.query(`SET search_path TO ${qSchema}`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${qSchema}."user" (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR NOT NULL,
      last_name VARCHAR NOT NULL,
      email VARCHAR NOT NULL UNIQUE,
      mobile_no VARCHAR NOT NULL,
      password VARCHAR NOT NULL,
      is_login VARCHAR NOT NULL DEFAULT '0',
      is_active INTEGER NOT NULL DEFAULT 1,
      roles VARCHAR NOT NULL DEFAULT 'sub_admin',
      "createdBy" VARCHAR NOT NULL,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      verified_at TIMESTAMPTZ,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_at TIMESTAMPTZ,
      deleted_by INTEGER,
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ${qSchema}.service (
      "serviceId" SERIAL PRIMARY KEY,
      "serviceName" VARCHAR NOT NULL UNIQUE,
      "isActive" INTEGER NOT NULL DEFAULT 1,
      price VARCHAR NOT NULL DEFAULT '0',
      priority INTEGER DEFAULT 0,
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "createdBy" VARCHAR NOT NULL DEFAULT 'default',
      "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
      "deletedBy" VARCHAR
    );
    CREATE TABLE IF NOT EXISTS ${qSchema}.form (
      "formId" SERIAL PRIMARY KEY,
      "invoiceUuid" UUID NOT NULL,
      type VARCHAR NOT NULL,
      "customerName" VARCHAR NOT NULL,
      "invoiceNumber" VARCHAR NOT NULL,
      "customerEmail" VARCHAR NOT NULL,
      "customerPhone" VARCHAR,
      "customerAddress" VARCHAR NOT NULL,
      "customerPostalCode" VARCHAR NOT NULL,
      "customerCity" VARCHAR NOT NULL,
      "customerProvince" VARCHAR NOT NULL,
      "customerCountry" VARCHAR NOT NULL DEFAULT 'Canada',
      total VARCHAR NOT NULL,
      discount VARCHAR NOT NULL DEFAULT '0',
      discount_percent VARCHAR NOT NULL DEFAULT '0',
      is_taxable BOOLEAN NOT NULL,
      final_amount VARCHAR NOT NULL,
      is_invoice_generated BOOLEAN DEFAULT FALSE,
      invoice_id VARCHAR,
      invoice_path VARCHAR,
      comment VARCHAR,
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "createdBy" VARCHAR NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ${qSchema}.form_to_services (
      id SERIAL PRIMARY KEY,
      "formId" INTEGER NOT NULL REFERENCES ${qSchema}.form("formId") ON DELETE CASCADE,
      "serviceId" INTEGER NOT NULL REFERENCES ${qSchema}.service("serviceId"),
      price VARCHAR NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ${qSchema}.configurations (
      id SERIAL PRIMARY KEY,
      key VARCHAR NOT NULL,
      value VARCHAR NOT NULL,
      "isImage" BOOLEAN NOT NULL DEFAULT FALSE,
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "createdBy" VARCHAR NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ${qSchema}.location (
      "locationId" SERIAL PRIMARY KEY,
      city VARCHAR NOT NULL,
      city_ascii VARCHAR NOT NULL,
      province_id VARCHAR NOT NULL,
      province_name VARCHAR NOT NULL,
      lat VARCHAR NOT NULL DEFAULT '',
      lng VARCHAR NOT NULL DEFAULT '',
      population VARCHAR NOT NULL DEFAULT '',
      density VARCHAR NOT NULL DEFAULT '',
      timezone VARCHAR NOT NULL DEFAULT '',
      ranking INTEGER NOT NULL DEFAULT 1,
      postal VARCHAR(4000) NOT NULL DEFAULT '',
      city_id VARCHAR NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ${qSchema}.contact (
      id SERIAL PRIMARY KEY,
      name VARCHAR NOT NULL,
      email VARCHAR NOT NULL,
      phone VARCHAR NOT NULL,
      service VARCHAR NOT NULL,
      address VARCHAR,
      message VARCHAR NOT NULL,
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ${qSchema}.user_verification (
      id SERIAL PRIMARY KEY,
      "userIdId" INTEGER REFERENCES ${qSchema}."user"(id) ON DELETE CASCADE,
      token VARCHAR NOT NULL,
      type VARCHAR NOT NULL,
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ${qSchema}.admin_session (
      id BIGSERIAL PRIMARY KEY,
      token_hash CHAR(64) NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES ${qSchema}."user"(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS admin_session_expires_idx ON ${qSchema}.admin_session(expires_at);
    CREATE INDEX IF NOT EXISTS form_type_created_idx ON ${qSchema}.form(type, "createdAt" DESC);
  `);

  const users = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${qSchema}."user"`);
  if (users.rows[0].count === "0") {
    const email = process.env.DEFAULT_ADMIN_EMAIL || "admin@simsanfrasermain.com";
    const password = process.env.DEFAULT_ADMIN_PASSWORD || "admin@123";
    await db.query(
      `INSERT INTO ${qSchema}."user" (first_name,last_name,email,mobile_no,password,roles,"createdBy",is_verified,verified_at)
       VALUES ('Admin','User',$1,'0000000000',$2,'admin','bootstrap',TRUE,NOW())`,
      [email.toLowerCase(), await bcrypt.hash(password, 12)],
    );
    logger.warn("database.bootstrap_admin.created", { email, usingDefaultPassword: !process.env.DEFAULT_ADMIN_PASSWORD });
  }

  const services = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${qSchema}.service`);
  if (services.rows[0].count === "0") {
    for (const [index, name] of serviceSeeds.entries()) {
      await db.query(`INSERT INTO ${qSchema}.service ("serviceName",priority) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [name, index + 1]);
    }
  }

  const locations = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${qSchema}.location`);
  if (locations.rows[0].count === "0") {
    await db.query(
      `INSERT INTO ${qSchema}.location (city,city_ascii,province_id,province_name,lat,lng,population,density,timezone,ranking,postal,city_id)
       SELECT city,city_ascii,province_id,province_name,lat,lng,population,density,timezone,ranking,postal,city_id
       FROM jsonb_to_recordset($1::jsonb) AS seed(city text,city_ascii text,province_id text,province_name text,lat text,lng text,population text,density text,timezone text,ranking integer,postal text,city_id text)`,
      [JSON.stringify(citySeeds)],
    );
  }
  logger.info("database.initialization.completed", { schema, durationMs: Date.now() - startedAt });
}

export async function ensureDatabase() {
  global.__simsanSchemaReady ??= initializeDatabase();
  return global.__simsanSchemaReady;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  await ensureDatabase();
  const startedAt = Date.now();
  try {
    const result = await pool().query<T>(text, values);
    const durationMs = Date.now() - startedAt;
    if (durationMs >= Number(process.env.SLOW_QUERY_MS || 500)) {
      logger.warn("database.query.slow", { operation: text.trim().split(/\s+/, 1)[0]?.toUpperCase(), durationMs, rowCount: result.rowCount });
    }
    return result;
  } catch (error) {
    logger.error("database.query.failed", error, { operation: text.trim().split(/\s+/, 1)[0]?.toUpperCase() });
    throw error;
  }
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  await ensureDatabase();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("database.transaction.rolled_back", error);
    throw error;
  } finally {
    client.release();
  }
}

export function table(name: string) {
  if (!/^[a-z_]+$/.test(name)) throw new Error("Invalid table name");
  return `"${schemaName()}"."${name}"`;
}
