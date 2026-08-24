import { Database } from "bun:sqlite";
import path from "path";
import fs from "fs";

const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "hydrogrid.db");
const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.run("PRAGMA journal_mode = WAL;");

// Initialize users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    provider TEXT NOT NULL DEFAULT 'password',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

// Initialize sessions table for opaque server-side session invalidation
db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Initialize persistent rate limits table
db.run(`
  CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 1,
    resetTime INTEGER NOT NULL
  )
`);

export interface UserRecord {
  id: string;
  fullName: string;
  username: string;
  email: string;
  passwordHash: string | null;
  role: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

// Dummy hash used to prevent timing-based user enumeration attacks
let dummyHash = "$argon2id$v=19$m=65536,t=2,p=1$ZHVtbXlzYWx0ZHVtbXlzYWx0$dummyhashdummyhashdummyhashdummyhashdummyhash";
(async () => {
  try {
    dummyHash = await Bun.password.hash("dummy_password_for_timing_protection", { algorithm: "argon2id" });
  } catch {
    // fallback dummy hash remains
  }
})();

export function findUserByUsernameOrEmail(identifier: string): UserRecord | null {
  const clean = identifier.trim().toLowerCase();
  const query = db.query<UserRecord, [string, string]>(
    "SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1"
  );
  return query.get(clean, clean);
}

export function findUserByUsername(username: string): UserRecord | null {
  const clean = username.trim().toLowerCase();
  const query = db.query<UserRecord, [string]>(
    "SELECT * FROM users WHERE LOWER(username) = ? LIMIT 1"
  );
  return query.get(clean);
}

export function findUserByEmail(email: string): UserRecord | null {
  const clean = email.trim().toLowerCase();
  const query = db.query<UserRecord, [string]>(
    "SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1"
  );
  return query.get(clean);
}

export function findUserById(id: string): UserRecord | null {
  const query = db.query<UserRecord, [string]>(
    "SELECT * FROM users WHERE id = ? LIMIT 1"
  );
  return query.get(id);
}

export function createUser(user: {
  fullName: string;
  username: string;
  email: string;
  passwordHash: string | null;
  role?: string;
  provider?: string;
}): UserRecord {
  const id = "usr_" + Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();
  const role = user.role || "user";
  const provider = user.provider || "password";

  db.run(
    "INSERT INTO users (id, fullName, username, email, passwordHash, role, provider, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, user.fullName, user.username.trim(), user.email.trim(), user.passwordHash, role, provider, now, now]
  );

  return {
    id,
    fullName: user.fullName,
    username: user.username.trim(),
    email: user.email.trim(),
    passwordHash: user.passwordHash,
    role,
    provider,
    createdAt: now,
    updatedAt: now,
  };
}

export function createSession(userId: string): string {
  const sessionId = "hg_sess_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.run(
    "INSERT INTO sessions (id, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?)",
    [sessionId, userId, expiresAt, createdAt]
  );

  return sessionId;
}

export function getSession(sessionId: string): { user: UserRecord; session: SessionRecord } | null {
  if (!sessionId) return null;
  const sessionQuery = db.query<SessionRecord, [string]>(
    "SELECT * FROM sessions WHERE id = ? LIMIT 1"
  );
  const session = sessionQuery.get(sessionId);
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    db.run("DELETE FROM sessions WHERE id = ?", [sessionId]);
    return null;
  }

  const user = findUserById(session.userId);
  if (!user) return null;

  return { user, session };
}

export function deleteSession(sessionId: string): void {
  if (sessionId) {
    db.run("DELETE FROM sessions WHERE id = ?", [sessionId]);
  }
}

/**
 * Persistent SQLite-backed rate limiting counter (IP + Identifier)
 */
export function checkPersistentRateLimit(key: string, maxAttempts = 5, windowMs = 900000): boolean {
  const now = Date.now();
  const query = db.query<{ key: string; count: number; resetTime: number }, [string]>(
    "SELECT * FROM rate_limits WHERE key = ? LIMIT 1"
  );
  const record = query.get(key);

  if (!record || now > record.resetTime) {
    db.run(
      "INSERT INTO rate_limits (key, count, resetTime) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count=1, resetTime=?",
      [key, now + windowMs, now + windowMs]
    );
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  db.run("UPDATE rate_limits SET count = count + 1 WHERE key = ?", [key]);
  return true;
}

export function getDummyHash(): string {
  return dummyHash;
}

// Bootstrapping demo admin account strictly at seed time
(async function seedAdmin() {
  const adminUsername = process.env.ADMIN_USERNAME || "admin2026";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin2026sih";

  const existingAdmin = findUserByUsernameOrEmail(adminUsername);
  if (!existingAdmin) {
    const adminPasswordHash = await Bun.password.hash(adminPassword, { algorithm: "argon2id" });
    createUser({
      fullName: "HydroGrid System Administrator",
      username: adminUsername,
      email: "admin@hydrogrid.internal",
      passwordHash: adminPasswordHash,
      role: "admin",
      provider: "password",
    });
  }
})();

export { db };
