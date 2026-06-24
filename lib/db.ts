import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { PredictionRow } from "./scoring";

export interface User {
  id: string;
  name: string;
  ip: string | null;
  createdAt: number;
}

export interface Prediction extends PredictionRow {
  updatedAt: number;
}

export interface Store {
  getUserById(id: string): Promise<User | null>;
  getUserByIp(ip: string): Promise<User | null>;
  createUser(name: string, ip: string | null): Promise<User>;
  updateUserName(id: string, name: string): Promise<void>;
  allUserNames(): Promise<Record<string, string>>;
  upsertPrediction(
    userId: string,
    matchId: string,
    home: number,
    away: number,
  ): Promise<void>;
  getPredictionsForUser(userId: string): Promise<Prediction[]>;
  getAllPredictions(): Promise<Prediction[]>;
  getOverrides(): Promise<Record<string, [number, number]>>;
  setOverride(matchId: string, home: number, away: number): Promise<void>;
  clearOverride(matchId: string): Promise<void>;
  /** Last-good match feed, persisted so feed outages never change match IDs. */
  getMatchCache(): Promise<{ json: unknown; updatedAt: number } | null>;
  setMatchCache(json: unknown): Promise<void>;
}

const DB_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  "";

/* -------------------------------------------------------------------------- */
/* Postgres-backed store                                                      */
/* -------------------------------------------------------------------------- */

class PostgresStore implements Store {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pool: any;
  private ready: Promise<void>;

  constructor(connectionString: string) {
    // Lazy require so the file store path never needs `pg`.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg");
    const ssl = /localhost|127\.0\.0\.1/.test(connectionString)
      ? false
      : { rejectUnauthorized: false };
    this.pool = new Pool({ connectionString, ssl });
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ip TEXT,
        created_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS predictions (
        user_id TEXT NOT NULL,
        match_id TEXT NOT NULL,
        home INT NOT NULL,
        away INT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, match_id)
      );
      CREATE TABLE IF NOT EXISTS score_overrides (
        match_id TEXT PRIMARY KEY,
        home INT NOT NULL,
        away INT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS match_cache (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `);
  }

  private async q<T = unknown>(text: string, params: unknown[] = []): Promise<T[]> {
    await this.ready;
    const res = await this.pool.query(text, params);
    return res.rows as T[];
  }

  async getUserById(id: string): Promise<User | null> {
    const rows = await this.q<{ id: string; name: string; ip: string | null; created_at: string }>(
      "SELECT id, name, ip, created_at FROM users WHERE id = $1",
      [id],
    );
    if (!rows[0]) return null;
    return { id: rows[0].id, name: rows[0].name, ip: rows[0].ip, createdAt: Number(rows[0].created_at) };
  }

  async getUserByIp(ip: string): Promise<User | null> {
    const rows = await this.q<{ id: string; name: string; ip: string | null; created_at: string }>(
      "SELECT id, name, ip, created_at FROM users WHERE ip = $1 ORDER BY created_at DESC LIMIT 1",
      [ip],
    );
    if (!rows[0]) return null;
    return { id: rows[0].id, name: rows[0].name, ip: rows[0].ip, createdAt: Number(rows[0].created_at) };
  }

  async createUser(name: string, ip: string | null): Promise<User> {
    const user: User = { id: randomUUID(), name, ip, createdAt: Date.now() };
    await this.q(
      "INSERT INTO users (id, name, ip, created_at) VALUES ($1,$2,$3,$4)",
      [user.id, user.name, user.ip, user.createdAt],
    );
    return user;
  }

  async updateUserName(id: string, name: string): Promise<void> {
    await this.q("UPDATE users SET name = $2 WHERE id = $1", [id, name]);
  }

  async allUserNames(): Promise<Record<string, string>> {
    const rows = await this.q<{ id: string; name: string }>("SELECT id, name FROM users");
    const out: Record<string, string> = {};
    for (const r of rows) out[r.id] = r.name;
    return out;
  }

  async upsertPrediction(userId: string, matchId: string, home: number, away: number): Promise<void> {
    await this.q(
      `INSERT INTO predictions (user_id, match_id, home, away, updated_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, match_id)
       DO UPDATE SET home = EXCLUDED.home, away = EXCLUDED.away, updated_at = EXCLUDED.updated_at`,
      [userId, matchId, home, away, Date.now()],
    );
  }

  async getPredictionsForUser(userId: string): Promise<Prediction[]> {
    const rows = await this.q<{ match_id: string; home: number; away: number; updated_at: string }>(
      "SELECT match_id, home, away, updated_at FROM predictions WHERE user_id = $1",
      [userId],
    );
    return rows.map((r) => ({
      userId,
      matchId: r.match_id,
      home: r.home,
      away: r.away,
      updatedAt: Number(r.updated_at),
    }));
  }

  async getAllPredictions(): Promise<Prediction[]> {
    const rows = await this.q<{ user_id: string; match_id: string; home: number; away: number; updated_at: string }>(
      "SELECT user_id, match_id, home, away, updated_at FROM predictions",
    );
    return rows.map((r) => ({
      userId: r.user_id,
      matchId: r.match_id,
      home: r.home,
      away: r.away,
      updatedAt: Number(r.updated_at),
    }));
  }

  async getOverrides(): Promise<Record<string, [number, number]>> {
    const rows = await this.q<{ match_id: string; home: number; away: number }>(
      "SELECT match_id, home, away FROM score_overrides",
    );
    const out: Record<string, [number, number]> = {};
    for (const r of rows) out[r.match_id] = [r.home, r.away];
    return out;
  }

  async setOverride(matchId: string, home: number, away: number): Promise<void> {
    await this.q(
      `INSERT INTO score_overrides (match_id, home, away) VALUES ($1,$2,$3)
       ON CONFLICT (match_id) DO UPDATE SET home = EXCLUDED.home, away = EXCLUDED.away`,
      [matchId, home, away],
    );
  }

  async clearOverride(matchId: string): Promise<void> {
    await this.q("DELETE FROM score_overrides WHERE match_id = $1", [matchId]);
  }

  async getMatchCache(): Promise<{ json: unknown; updatedAt: number } | null> {
    const rows = await this.q<{ data: unknown; updated_at: string }>(
      "SELECT data, updated_at FROM match_cache WHERE id = 'primary'",
    );
    if (!rows[0]) return null;
    return { json: rows[0].data, updatedAt: Number(rows[0].updated_at) };
  }

  async setMatchCache(json: unknown): Promise<void> {
    await this.q(
      `INSERT INTO match_cache (id, data, updated_at) VALUES ('primary',$1,$2)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
      [JSON.stringify(json), Date.now()],
    );
  }
}

/* -------------------------------------------------------------------------- */
/* File-backed store (development fallback)                                   */
/* -------------------------------------------------------------------------- */

interface FileData {
  users: User[];
  predictions: Prediction[];
  overrides: Record<string, [number, number]>;
  matchCache?: { json: unknown; updatedAt: number } | null;
}

class FileStore implements Store {
  private file = path.join(process.cwd(), ".data", "store.json");
  private data: FileData = {
    users: [],
    predictions: [],
    overrides: {},
    matchCache: null,
  };
  private loaded = false;
  private writing: Promise<void> = Promise.resolve();

  private async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(this.file, "utf8");
      const parsed = JSON.parse(raw) as Partial<FileData>;
      this.data = {
        users: parsed.users ?? [],
        predictions: parsed.predictions ?? [],
        overrides: parsed.overrides ?? {},
        matchCache: parsed.matchCache ?? null,
      };
    } catch {
      this.data = {
        users: [],
        predictions: [],
        overrides: {},
        matchCache: null,
      };
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    this.writing = this.writing.then(async () => {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      await fs.writeFile(this.file, JSON.stringify(this.data, null, 2));
    });
    return this.writing;
  }

  async getUserById(id: string): Promise<User | null> {
    await this.load();
    return this.data.users.find((u) => u.id === id) ?? null;
  }

  async getUserByIp(ip: string): Promise<User | null> {
    await this.load();
    const matches = this.data.users
      .filter((u) => u.ip === ip)
      .sort((a, b) => b.createdAt - a.createdAt);
    return matches[0] ?? null;
  }

  async createUser(name: string, ip: string | null): Promise<User> {
    await this.load();
    const user: User = { id: randomUUID(), name, ip, createdAt: Date.now() };
    this.data.users.push(user);
    await this.persist();
    return user;
  }

  async updateUserName(id: string, name: string): Promise<void> {
    await this.load();
    const u = this.data.users.find((x) => x.id === id);
    if (u) {
      u.name = name;
      await this.persist();
    }
  }

  async allUserNames(): Promise<Record<string, string>> {
    await this.load();
    const out: Record<string, string> = {};
    for (const u of this.data.users) out[u.id] = u.name;
    return out;
  }

  async upsertPrediction(userId: string, matchId: string, home: number, away: number): Promise<void> {
    await this.load();
    const existing = this.data.predictions.find(
      (p) => p.userId === userId && p.matchId === matchId,
    );
    if (existing) {
      existing.home = home;
      existing.away = away;
      existing.updatedAt = Date.now();
    } else {
      this.data.predictions.push({ userId, matchId, home, away, updatedAt: Date.now() });
    }
    await this.persist();
  }

  async getPredictionsForUser(userId: string): Promise<Prediction[]> {
    await this.load();
    return this.data.predictions.filter((p) => p.userId === userId);
  }

  async getAllPredictions(): Promise<Prediction[]> {
    await this.load();
    return [...this.data.predictions];
  }

  async getOverrides(): Promise<Record<string, [number, number]>> {
    await this.load();
    return { ...this.data.overrides };
  }

  async setOverride(matchId: string, home: number, away: number): Promise<void> {
    await this.load();
    this.data.overrides[matchId] = [home, away];
    await this.persist();
  }

  async clearOverride(matchId: string): Promise<void> {
    await this.load();
    delete this.data.overrides[matchId];
    await this.persist();
  }

  async getMatchCache(): Promise<{ json: unknown; updatedAt: number } | null> {
    await this.load();
    return this.data.matchCache ?? null;
  }

  async setMatchCache(json: unknown): Promise<void> {
    await this.load();
    this.data.matchCache = { json, updatedAt: Date.now() };
    await this.persist();
  }
}

/* -------------------------------------------------------------------------- */

declare global {
  // eslint-disable-next-line no-var
  var __wcStore: Store | undefined;
}

export function getStore(): Store {
  if (!globalThis.__wcStore) {
    globalThis.__wcStore = DB_URL ? new PostgresStore(DB_URL) : new FileStore();
  }
  return globalThis.__wcStore;
}

export const usingPostgres = Boolean(DB_URL);
