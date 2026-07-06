import type { IHotSearchStore, HotSearchItem, HotSearchStats } from "./hotSearchStore";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const MAX_ENTRIES = 30;
const DEFAULT_DB_DIR = "./data";
const DEFAULT_DB_PATH = "./data/hot-searches.db";
const LAMBDA = 0.05;
/** 热搜只展示最近 N 天内有搜索记录的词 */
const HOT_WINDOW_DAYS = 7;

function isForbidden(term: string): boolean {
  const forbiddenPatterns = [
    /政治|暴力|色情|赌博|毒品/i,
    /fuck|shit|bitch/i,
  ];
  return forbiddenPatterns.some((pattern) => pattern.test(term));
}

function normalize(term: string): string | null {
  let t = term.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return null;
  if (t.length > 20) return null;
  t = t.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
  );
  return t || null;
}

/**
 * SQLite 热搜存储实现（sql.js 纯 JS 版本）
 * 无需 native 编译，Docker/CF Workers/Node 均可运行
 */
export class SqliteHotSearchStore implements IHotSearchStore {
  private db: any;
  private dbPath: string;
  private dbDir: string;
  private isInitialized = false;
  private initFailed = false;
  private initPromise: Promise<void> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || DEFAULT_DB_PATH;
    this.dbDir = this.dbPath.substring(0, this.dbPath.lastIndexOf("/")) || DEFAULT_DB_DIR;
    this.initPromise = this.init()
      .then(() => {
        this.isInitialized = true;
        this.initPromise = null;
      })
      .catch((err) => {
        console.log("[SqliteHotSearchStore] ❌ 初始化失败:", err instanceof Error ? err.message : err);
        this.initFailed = true;
        this.initPromise = null;
        throw err;
      });
  }

  private async init(): Promise<void> {
    const initSqlJs = (await import("sql.js")).default;
    const SQL = await initSqlJs({
      locateFile: (file: string) => resolve(process.cwd(), "node_modules/sql.js/dist", file),
    });

    if (!existsSync(this.dbDir)) {
      mkdirSync(this.dbDir, { recursive: true });
    }

    // 从文件加载已有数据，或创建新数据库
    if (existsSync(this.dbPath)) {
      const buffer = readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS hot_searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term TEXT NOT NULL UNIQUE,
        score INTEGER NOT NULL DEFAULT 1,
        last_searched_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
    this.db.run("CREATE INDEX IF NOT EXISTS idx_score ON hot_searches(score DESC)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_last_searched ON hot_searches(last_searched_at DESC)");

    // 迁移 JSON 数据
    this.migrateFromJson();

    this.saveToDisk();
    console.log("[SqliteHotSearchStore] ✅ SQLite (sql.js) 存储已初始化");
  }

  private migrateFromJson(): void {
    if (this.dbPath !== DEFAULT_DB_PATH) return;
    const JSON_PATH = "./data/hot-searches.json";
    try {
      if (!existsSync(JSON_PATH)) return;

      const raw = readFileSync(JSON_PATH, "utf-8");
      const data = JSON.parse(raw);
      if (!data?.items?.length) return;

      const result = this.db.exec("SELECT COUNT(*) as c FROM hot_searches");
      const count = result[0]?.values[0]?.[0] ?? 0;
      if (count > 0) return;

      const stmt = this.db.prepare("INSERT OR IGNORE INTO hot_searches (term, score, last_searched_at, created_at) VALUES (?, ?, ?, ?)");
      for (const item of data.items) {
        const normalized = normalize(item.term);
        if (normalized && !isForbidden(normalized)) {
          stmt.run([normalized, item.score || 1, item.lastSearched || Date.now(), item.createdAt || Date.now()]);
        }
      }
      stmt.free();
      this.saveToDisk();
      console.log(`[SqliteHotSearchStore] ✅ 从 JSON 迁移了 ${data.items.length} 条数据`);
    } catch {}
  }

  // 热路径（每 500ms 防抖触发）：异步写入避免阻塞事件循环
  private saveToDisk(): void {
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      writeFile(this.dbPath, buffer).catch(() => {});
    } catch {}
  }

  // 同步写入：仅用于 close() 等需要确保数据落盘的场景
  private saveToDiskSync(): void {
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      writeFileSync(this.dbPath, buffer);
    } catch {}
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveToDisk(), 500);
  }

  private async waitForInit(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initFailed) return;
    if (this.initPromise) await this.initPromise;
  }

  async recordSearch(term: string, now: number): Promise<void> {
    await this.waitForInit();
    const normalized = normalize(term);
    if (!normalized) return;
    if (isForbidden(normalized)) return;

    const existing = this.db.exec("SELECT score FROM hot_searches WHERE term = ?", [normalized]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      this.db.run("UPDATE hot_searches SET score = score + 1, last_searched_at = ? WHERE term = ?", [now, normalized]);
    } else {
      this.db.run("INSERT INTO hot_searches (term, score, last_searched_at, created_at) VALUES (?, 1, ?, ?)", [normalized, now, now]);
    }

    this.cleanupOldEntries(MAX_ENTRIES);
    this.scheduleSave();
  }

  async getHotSearches(limit: number): Promise<HotSearchItem[]> {
    await this.waitForInit();
    const now = Date.now();
    const cutoff = now - HOT_WINDOW_DAYS * 86400000;
    const result = this.db.exec(`
      SELECT term, score, last_searched_at, created_at,
        score * exp(-0.05 * ((${now} - last_searched_at) / 86400000.0)) as decayed_score
      FROM hot_searches
      WHERE last_searched_at >= ${cutoff}
      ORDER BY decayed_score DESC
      LIMIT ${Math.min(limit, MAX_ENTRIES)}
    `);

    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map((row: any[], index: number) => {
      const obj: any = {};
      cols.forEach((col: string, i: number) => obj[col] = row[i]);
      return {
        term: obj.term,
        score: obj.score,
        lastSearched: obj.last_searched_at,
        createdAt: obj.created_at,
        rank: index + 1,
        displayScore: Math.round(obj.decayed_score * 100) / 100,
      };
    });
  }

  cleanupOldEntries(maxEntries: number): void {
    // 清理超过 7 天未搜索的旧词，释放空间
    const now = Date.now();
    const cutoff = now - HOT_WINDOW_DAYS * 86400000;
    this.db.run(`
      DELETE FROM hot_searches WHERE last_searched_at < ?
    `, [cutoff]);
    // 保留最多 maxEntries 条记录
    this.db.run(`
      DELETE FROM hot_searches WHERE id NOT IN (
        SELECT id FROM hot_searches ORDER BY score DESC, last_searched_at DESC LIMIT ?
      )
    `, [maxEntries]);
  }

  async clearHotSearches(): Promise<{ success: boolean; message: string }> {
    await this.waitForInit();
    this.db.run("DELETE FROM hot_searches");
    this.saveToDisk();
    return { success: true, message: "热搜记录已清除" };
  }

  async deleteHotSearch(term: string): Promise<{ success: boolean; message: string }> {
    await this.waitForInit();
    const before = this.db.exec("SELECT COUNT(*) as c FROM hot_searches WHERE term = ?", [term]);
    const had = before[0]?.values[0]?.[0] ?? 0;
    this.db.run("DELETE FROM hot_searches WHERE term = ?", [term]);
    if (had > 0) {
      this.saveToDisk();
      return { success: true, message: `热搜词 "${term}" 已删除` };
    }
    return { success: false, message: "热搜词不存在" };
  }

  async getStats(): Promise<HotSearchStats> {
    await this.waitForInit();
    const result = this.db.exec("SELECT COUNT(*) as c FROM hot_searches");
    const total = result[0]?.values[0]?.[0] ?? 0;
    const topTerms = await this.getHotSearches(10);
    return { total, topTerms };
  }

  getDbSize(): number {
    try {
      if (existsSync(this.dbPath)) {
        const { statSync } = require("node:fs");
        return Math.round((statSync(this.dbPath).size / (1024 * 1024)) * 100) / 100;
      }
    } catch {}
    return 0;
  }

  close(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.db) {
      this.saveToDiskSync(); // 同步写入确保数据落盘后再关闭
      this.db.close();
    }
  }
}
