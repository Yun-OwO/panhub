import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { existsSync, mkdirSync, rmSync } from "fs";

const TEST_DB_DIR = "./data-test";
const TEST_DB_PATH = "./data-test/test-hot-search.db";

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
    store = new SqliteHotSearchStore(TEST_DB_PATH);
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
