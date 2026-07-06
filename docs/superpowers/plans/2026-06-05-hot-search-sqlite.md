# Hot Search SQLite Migration + Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate hot search storage from JSON file to SQLite, add term normalization, time-decay ranking, and a Top 10 ranking component.

**Architecture:** Replace JsonFileHotSearchStore with SqliteHotSearchStore using better-sqlite3. Add normalize() at record entry. Fallback to MemoryHotSearchStore on CF Workers/Vercel. New HotRanking.vue component shows Top 10 with decayed scores.

**Tech Stack:** better-sqlite3, Nuxt 4, Vue 3, H3, Vitest

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `server/core/services/sqliteHotSearchStore.ts` | SQLite storage implementation |
| Create | `components/HotRanking.vue` | Top 10 ranking component |
| Create | `test/unit/sqliteHotSearch.test.ts` | SQLite store unit tests |
| Modify | `package.json` | Add better-sqlite3 + @types/better-sqlite3 |
| Modify | `server/core/services/hotSearchStore.ts` | Add rank/displayScore to HotSearchItem |
| Modify | `server/core/services/hotSearchService.ts` | Use SQLite, fallback to memory |
| Modify | `server/api/hot-searches.get.ts` | Return rank/displayScore |
| Modify | `pages/index/index.vue` | Add HotRanking component |
| Modify | `Dockerfile` | Add build tools for native module |
| Delete | `server/core/services/jsonFileHotSearchStore.ts` | No longer needed |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install better-sqlite3**

```bash
pnpm add better-sqlite3
pnpm add -D @types/better-sqlite3
```

- [ ] **Step 2: Verify installation**

Run: `ls node_modules/better-sqlite3/package.json`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add better-sqlite3 for hot search storage"
```

---

## Task 2: Update HotSearchItem Type

**Files:**
- Modify: `server/core/services/hotSearchStore.ts`

- [ ] **Step 1: Add rank and displayScore to HotSearchItem**

Read the file first, then replace the `HotSearchItem` interface:

```ts
export interface HotSearchItem {
  term: string;
  score: number;
  lastSearched: number;
  createdAt: number;
  rank?: number;
  displayScore?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/core/services/hotSearchStore.ts
git commit -m "feat: add rank and displayScore fields to HotSearchItem"
```

---

## Task 3: Create SQLite Hot Search Store

**Files:**
- Create: `server/core/services/sqliteHotSearchStore.ts`

- [ ] **Step 1: Create the SQLite store implementation**

Create the file with the following content:

```ts
import type { IHotSearchStore, HotSearchItem, HotSearchStats } from "./hotSearchStore";

const MAX_ENTRIES = 30;
const DB_DIR = "./data";
const DB_PATH = "./data/hot-searches.db";
const LAMBDA = 0.05; // 时间衰减系数，半衰期约 14 天

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
  // 丢弃 URL
  if (/^https?:\/\//i.test(t)) return null;
  // 丢弃过长的词
  if (t.length > 20) return null;
  // 全角转半角
  t = t.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
  );
  return t || null;
}

function computeDecayedScore(score: number, lastSearchedAt: number): number {
  const now = Date.now();
  const daysSince = (now - lastSearchedAt) / 86400000;
  return score * Math.exp(-LAMBDA * daysSince);
}

/**
 * SQLite 热搜存储实现
 * 使用 better-sqlite3 同步 API，WAL 模式支持并发读写
 */
export class SqliteHotSearchStore implements IHotSearchStore {
  private db: any;
  private isInitialized = false;
  private initFailed = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
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
    // 动态 import better-sqlite3，避免在不支持 native 的环境报错
    const Database = (await import("better-sqlite3")).default;

    const { mkdirSync, existsSync } = await import("fs");
    if (!existsSync(DB_DIR)) {
      mkdirSync(DB_DIR, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hot_searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term TEXT NOT NULL UNIQUE,
        score INTEGER NOT NULL DEFAULT 1,
        last_searched_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_score ON hot_searches(score DESC);
      CREATE INDEX IF NOT EXISTS idx_last_searched ON hot_searches(last_searched_at DESC);
    `);

    console.log("[SqliteHotSearchStore] ✅ SQLite 存储已初始化");
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

    const existing = this.db.prepare("SELECT score FROM hot_searches WHERE term = ?").get(normalized);
    if (existing) {
      this.db.prepare("UPDATE hot_searches SET score = score + 1, last_searched_at = ? WHERE term = ?").run(now, normalized);
    } else {
      this.db.prepare("INSERT INTO hot_searches (term, score, last_searched_at, created_at) VALUES (?, 1, ?, ?)").run(normalized, now, now);
    }

    await this.cleanupOldEntries(MAX_ENTRIES);
  }

  async getHotSearches(limit: number): Promise<HotSearchItem[]> {
    await this.waitForInit();
    const rows = this.db.prepare(`
      SELECT term, score, last_searched_at, created_at,
        score * exp(-0.05 * ((? - last_searched_at) / 86400000.0)) as decayed_score
      FROM hot_searches
      ORDER BY decayed_score DESC
      LIMIT ?
    `).all(Date.now(), Math.min(limit, MAX_ENTRIES));

    return rows.map((row: any, index: number) => ({
      term: row.term,
      score: row.score,
      lastSearched: row.last_searched_at,
      createdAt: row.created_at,
      rank: index + 1,
      displayScore: Math.round(row.decayed_score * 100) / 100,
    }));
  }

  async cleanupOldEntries(maxEntries: number): Promise<void> {
    this.db.prepare(`
      DELETE FROM hot_searches WHERE id NOT IN (
        SELECT id FROM hot_searches ORDER BY score DESC, last_searched_at DESC LIMIT ?
      )
    `).run(maxEntries);
  }

  async clearHotSearches(): Promise<{ success: boolean; message: string }> {
    await this.waitForInit();
    this.db.prepare("DELETE FROM hot_searches").run();
    return { success: true, message: "热搜记录已清除" };
  }

  async deleteHotSearch(term: string): Promise<{ success: boolean; message: string }> {
    await this.waitForInit();
    const result = this.db.prepare("DELETE FROM hot_searches WHERE term = ?").run(term);
    if (result.changes > 0) {
      return { success: true, message: `热搜词 "${term}" 已删除` };
    }
    return { success: false, message: "热搜词不存在" };
  }

  async getStats(): Promise<HotSearchStats> {
    await this.waitForInit();
    const total = this.db.prepare("SELECT COUNT(*) as count FROM hot_searches").get().count;
    const topTerms = await this.getHotSearches(10);
    return { total, topTerms };
  }

  getDbSize(): number {
    try {
      const { existsSync, statSync } = require("fs");
      if (existsSync(DB_PATH)) {
        return Math.round((statSync(DB_PATH).size / (1024 * 1024)) * 100) / 100;
      }
    } catch {}
    return 0;
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit server/core/services/sqliteHotSearchStore.ts 2>&1 || echo "Check errors above"`
Expected: No type errors (or only module resolution warnings which are expected)

- [ ] **Step 3: Commit**

```bash
git add server/core/services/sqliteHotSearchStore.ts
git commit -m "feat: add SQLite hot search store with term normalization and time-decay"
```

---

## Task 4: Update HotSearchService to Use SQLite

**Files:**
- Modify: `server/core/services/hotSearchService.ts`

- [ ] **Step 1: Update the service to try SQLite first, fallback to memory**

Read the file first, then replace the entire content:

```ts
import type { IHotSearchStore, HotSearchItem, HotSearchStats } from "./hotSearchStore";
import { MemoryHotSearchStore } from "./memoryHotSearchStore";

// 模块级共享内存存储
let sharedMemoryStore: MemoryHotSearchStore | null = null;

function getOrCreateSharedMemoryStore(): MemoryHotSearchStore {
  if (!sharedMemoryStore) {
    sharedMemoryStore = new MemoryHotSearchStore();
  }
  return sharedMemoryStore;
}

async function tryCreateSqliteStore(): Promise<IHotSearchStore | null> {
  try {
    const { SqliteHotSearchStore } = await import("./sqliteHotSearchStore");
    const store = new SqliteHotSearchStore();
    // 等待初始化完成
    await (store as any)["waitForInit"]?.();
    return store;
  } catch {
    return null;
  }
}

/**
 * 热搜服务
 * 优先 SQLite，降级到内存存储（CF Workers/Vercel 无 native 支持）
 */
export class HotSearchService {
  private store: IHotSearchStore;
  private storeType: "sqlite" | "memory";
  private initPromise: Promise<void> | null = null;

  constructor() {
    // 默认使用内存存储，等初始化完成后切换
    const memoryStore = getOrCreateSharedMemoryStore();
    this.store = memoryStore;
    this.storeType = "memory";
    this.initPromise = this.initializeWithFallback();
  }

  private async initializeWithFallback(): Promise<void> {
    const sqliteStore = await tryCreateSqliteStore();
    if (sqliteStore) {
      this.store = sqliteStore;
      this.storeType = "sqlite";
      console.log("[HotSearchService] ✅ 使用 SQLite 存储模式");
    } else {
      console.log("[HotSearchService] ⚠️ SQLite 不可用，使用内存存储模式");
    }
  }

  private async waitForInit(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
  }

  async recordSearch(term: string): Promise<void> {
    await this.waitForInit();
    const now = Date.now();
    await this.store.recordSearch(term, now);
  }

  async getHotSearches(limit: number = 30): Promise<HotSearchItem[]> {
    await this.waitForInit();
    return this.store.getHotSearches(limit);
  }

  async clearHotSearches(): Promise<{ success: boolean; message: string }> {
    await this.waitForInit();
    return this.store.clearHotSearches();
  }

  async deleteHotSearch(term: string): Promise<{ success: boolean; message: string }> {
    await this.waitForInit();
    return this.store.deleteHotSearch(term);
  }

  async getStats(): Promise<{ total: number; topTerms: HotSearchItem[]; mode: string }> {
    await this.waitForInit();
    const stats = await this.store.getStats();
    return {
      ...stats,
      mode: this.storeType,
    };
  }

  getDatabaseSize(): number {
    if (this.storeType === "sqlite") {
      try {
        return (this.store as any).getDbSize?.() ?? 0;
      } catch { return 0; }
    }
    return 0;
  }

  getStoreType(): "sqlite" | "memory" {
    return this.storeType;
  }

  close(): void {
    this.store.close();
  }
}

// 单例模式
const HOT_SEARCH_SERVICE_KEY = "__panhub_hot_search_service_v3__";

export function getOrCreateHotSearchService(): HotSearchService {
  const context = (globalThis as any)[HOT_SEARCH_SERVICE_KEY];
  if (context?.service) {
    return context.service;
  }

  const service = new HotSearchService();
  (globalThis as any)[HOT_SEARCH_SERVICE_KEY] = { service };
  return service;
}

export function resetHotSearchService(): void {
  const context = (globalThis as any)[HOT_SEARCH_SERVICE_KEY];
  if (context?.service) {
    context.service.close();
  }
  delete (globalThis as any)[HOT_SEARCH_SERVICE_KEY];
}

export type { HotSearchItem, HotSearchStats };
```

- [ ] **Step 2: Commit**

```bash
git add server/core/services/hotSearchService.ts
git commit -m "refactor: use SQLite store with memory fallback in HotSearchService"
```

---

## Task 5: Delete JsonFileHotSearchStore

**Files:**
- Delete: `server/core/services/jsonFileHotSearchStore.ts`
- Modify: `test/unit/hot-search.test.ts` (update imports if needed)

- [ ] **Step 1: Check for any remaining imports of JsonFileHotSearchStore**

Run: `grep -rn "JsonFileHotSearchStore\|jsonFileHotSearch" --include='*.ts' --include='*.mjs' . | grep -v node_modules | grep -v .nuxt`
Expected: Only the file itself and possibly test files

- [ ] **Step 2: Delete the file**

```bash
rm server/core/services/jsonFileHotSearchStore.ts
```

- [ ] **Step 3: Update any test imports**

Read `test/unit/hot-search.test.ts` and check if it imports JsonFileHotSearchStore. If so, update to use MemoryHotSearchStore or SqliteHotSearchStore.

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove JsonFileHotSearchStore, replaced by SQLite"
```

---

## Task 6: Update Hot Search API

**Files:**
- Modify: `server/api/hot-searches.get.ts`

- [ ] **Step 1: Update the API to return rank and displayScore**

Read the file first, then replace the entire content:

```ts
import { defineEventHandler, getQuery, createError } from "h3";
import { getOrCreateHotSearchService } from "../core/services/hotSearchService";

export default defineEventHandler(async (event) => {
  const service = getOrCreateHotSearchService();
  const query = getQuery(event);
  const limit = parseInt((query.limit as string) || "30", 10);

  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw createError({ statusCode: 400, message: "limit 参数无效，范围 1-100" });
  }

  const hotSearches = await service.getHotSearches(limit);

  // 计算 displayScore 百分比（用于热度条）
  const maxScore = hotSearches.length > 0 ? (hotSearches[0].displayScore ?? hotSearches[0].score) : 1;

  return {
    code: 0,
    message: "success",
    data: {
      hotSearches: hotSearches.map((item) => ({
        ...item,
        rank: item.rank ?? 0,
        displayScore: item.displayScore ?? item.score,
        heatPercent: maxScore > 0 ? Math.round(((item.displayScore ?? item.score) / maxScore) * 100) : 0,
      })),
    },
  };
});
```

- [ ] **Step 2: Commit**

```bash
git add server/api/hot-searches.get.ts
git commit -m "feat: add rank, displayScore, and heatPercent to hot search API response"
```

---

## Task 7: Create HotRanking Component

**Files:**
- Create: `components/HotRanking.vue`

- [ ] **Step 1: Create the HotRanking component**

```vue
<template>
  <div v-if="!loading && items.length > 0" class="hot-ranking">
    <h3 class="hot-ranking__title">🔥 热搜排行</h3>
    <ol class="hot-ranking__list">
      <li
        v-for="item in items"
        :key="item.term"
        class="hot-ranking__item"
        @click="$emit('search', item.term)">
        <span class="hot-ranking__rank" :class="{ 'hot-ranking__rank--top': item.rank <= 3 }">
          {{ item.rank <= 3 ? '🔥' : item.rank }}
        </span>
        <span class="hot-ranking__term">{{ item.term }}</span>
        <span class="hot-ranking__bar-wrap">
          <span class="hot-ranking__bar" :style="{ width: item.heatPercent + '%' }"></span>
        </span>
        <span class="hot-ranking__count">{{ item.score }}次</span>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

interface RankingItem {
  term: string;
  score: number;
  rank: number;
  displayScore: number;
  heatPercent: number;
}

defineEmits<{
  search: [term: string];
}>();

const loading = ref(false);
const items = ref<RankingItem[]>([]);

async function fetchRanking() {
  loading.value = true;
  try {
    const response = await fetch("/api/hot-searches?limit=10");
    const data = await response.json();
    if (data.code === 0 && data.data?.hotSearches) {
      items.value = data.data.hotSearches;
    }
  } catch {
    items.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchRanking);

defineExpose({ refresh: fetchRanking });
</script>

<style scoped>
.hot-ranking {
  padding: 0 16px 16px;
}

.hot-ranking__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.hot-ranking__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.hot-ranking__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  border-radius: 6px;
}

.hot-ranking__item:hover {
  background: var(--bg-hover);
}

.hot-ranking__rank {
  width: 24px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-align: center;
  flex-shrink: 0;
}

.hot-ranking__rank--top {
  font-size: 14px;
}

.hot-ranking__term {
  font-size: 13px;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-ranking__bar-wrap {
  width: 60px;
  height: 4px;
  background: var(--bg-secondary);
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
}

.hot-ranking__bar {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  border-radius: 2px;
  transition: width 0.3s ease;
}

.hot-ranking__count {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  min-width: 32px;
  text-align: right;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add components/HotRanking.vue
git commit -m "feat: add HotRanking component with Top 10 heat bars"
```

---

## Task 8: Add HotRanking to Homepage

**Files:**
- Modify: `pages/index/index.vue`

- [ ] **Step 1: Add HotRanking below the tag cloud in hero-aside**

Read the file first. Find the `</ErrorBoundary>` closing tag inside `hero-aside` (after `HotSearchSection`). Add `HotRanking` after it:

```vue
      <aside class="hero-aside">
        <ErrorBoundary message="热搜加载失败">
          <HotSearchSection ref="hotSearchRef" :on-search="quickSearch" />
        </ErrorBoundary>
        <ErrorBoundary message="排行榜加载失败">
          <HotRanking @search="quickSearch" />
        </ErrorBoundary>
      </aside>
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add pages/index/index.vue
git commit -m "feat: add HotRanking to homepage hero section"
```

---

## Task 9: Update Dockerfile for Native Module

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Add build tools for better-sqlite3 in builder stage**

Read the file first. In the builder stage, add build tools BEFORE `pnpm install`:

```dockerfile
# 安装 native 模块编译工具（better-sqlite3 需要）
RUN apk add --no-cache python3 make g++
```

Insert this line after `RUN corepack enable && corepack prepare pnpm@9 --activate` and before `COPY package.json pnpm-lock.yaml ./`.

Also add `better-sqlite3` to the runner stage's `node_modules` copy — it's already handled by `COPY --from=builder /app/node_modules ./node_modules` since it was installed during build.

- [ ] **Step 2: Ensure data directory is writable by node user**

The current Dockerfile already has:
```dockerfile
RUN mkdir -p /app/data && chown node:node /app/data
```

This is correct. SQLite will create the `.db` file in `/app/data/`.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "fix: add build tools for better-sqlite3 in Docker builder stage"
```

---

## Task 10: Add SQLite Store Tests

**Files:**
- Create: `test/unit/sqliteHotSearch.test.ts`

- [ ] **Step 1: Create the test file**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { existsSync, mkdirSync, rmSync } from "fs";

const TEST_DB_DIR = "./data-test";
const TEST_DB_PATH = "./data-test/test-hot-search.db";

// 设置测试环境变量
process.env.HOT_SEARCH_DB_PATH = TEST_DB_PATH;

describe("SqliteHotSearchStore", () => {
  let store: any;

  beforeAll(async () => {
    if (!existsSync(TEST_DB_DIR)) {
      mkdirSync(TEST_DB_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (store) store.close();
    if (existsSync(TEST_DB_DIR)) {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    if (store) store.close();
    if (existsSync(TEST_DB_PATH)) {
      rmSync(TEST_DB_PATH, { force: true });
    }
    const { SqliteHotSearchStore } = await import("../../server/core/services/sqliteHotSearchStore");
    store = new SqliteHotSearchStore();
    await (store as any).waitForInit();
  });

  it("should record a search term", async () => {
    await store.recordSearch("星际穿越", Date.now());
    const items = await store.getHotSearches(10);
    expect(items).toHaveLength(1);
    expect(items[0].term).toBe("星际穿越");
    expect(items[0].score).toBe(1);
  });

  it("should increment score for repeated searches", async () => {
    const now = Date.now();
    await store.recordSearch("海王", now);
    await store.recordSearch("海王", now + 1000);
    await store.recordSearch("海王", now + 2000);
    const items = await store.getHotSearches(10);
    expect(items).toHaveLength(1);
    expect(items[0].score).toBe(3);
  });

  it("should normalize full-width characters", async () => {
    await store.recordSearch("Ｈｅｌｌｏ", Date.now());
    const items = await store.getHotSearches(10);
    expect(items[0].term).toBe("Hello");
  });

  it("should reject URLs", async () => {
    await store.recordSearch("https://www.aliyundrive.com/s/abc", Date.now());
    const items = await store.getHotSearches(10);
    expect(items).toHaveLength(0);
  });

  it("should reject terms longer than 20 characters", async () => {
    await store.recordSearch("这是一段超过二十个字符的搜索词用来测试长度限制功能是否正常工作", Date.now());
    const items = await store.getHotSearches(10);
    expect(items).toHaveLength(0);
  });

  it("should reject forbidden terms", async () => {
    await store.recordSearch("色情内容", Date.now());
    const items = await store.getHotSearches(10);
    expect(items).toHaveLength(0);
  });

  it("should return items with rank and displayScore", async () => {
    await store.recordSearch("电影A", Date.now());
    await store.recordSearch("电影B", Date.now());
    const items = await store.getHotSearches(10);
    expect(items[0].rank).toBe(1);
    expect(items[0].displayScore).toBeDefined();
    expect(typeof items[0].displayScore).toBe("number");
  });

  it("should delete a search term", async () => {
    await store.recordSearch("要删除的词", Date.now());
    const result = await store.deleteHotSearch("要删除的词");
    expect(result.success).toBe(true);
    const items = await store.getHotSearches(10);
    expect(items).toHaveLength(0);
  });

  it("should clear all entries", async () => {
    await store.recordSearch("词1", Date.now());
    await store.recordSearch("词2", Date.now());
    await store.clearHotSearches();
    const items = await store.getHotSearches(10);
    expect(items).toHaveLength(0);
  });

  it("should return correct stats", async () => {
    await store.recordSearch("统计测试1", Date.now());
    await store.recordSearch("统计测试2", Date.now());
    const stats = await store.getStats();
    expect(stats.total).toBe(2);
    expect(stats.topTerms).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `vitest run test/unit/sqliteHotSearch.test.ts`
Expected: All 10 tests pass

- [ ] **Step 3: Commit**

```bash
git add test/unit/sqliteHotSearch.test.ts
git commit -m "test: add SQLite hot search store unit tests"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass (old + new)

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Verify dev server**

Run: `pnpm dev`, open browser, verify:
- Hot search tag cloud works
- Hot ranking displays below tag cloud
- Clicking ranking item triggers search
- Search records appear in SQLite (check `data/hot-searches.db`)

- [ ] **Step 4: Final commit if needed**
