/**
 * 内存缓存系统单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { MemoryCache } from "../../server/core/cache/memoryCache";

describe("MemoryCache", () => {
  let cache: MemoryCache<string>;

  beforeEach(() => {
    cache = new MemoryCache<string>();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("基础功能", () => {
    it("应该正确存储和获取值", () => {
      cache.set("key1", "value1", 1000);
      const result = cache.get("key1");
      expect(result.hit).toBe(true);
      expect(result.value).toBe("value1");
    });

    it("应该返回未命中当键不存在时", () => {
      const result = cache.get("nonexistent");
      expect(result.hit).toBe(false);
      expect(result.value).toBeUndefined();
    });

    it("应该在过期后返回未命中", () => {
      cache.set("key1", "value1", 1000);
      vi.advanceTimersByTime(1001);
      const result = cache.get("key1");
      expect(result.hit).toBe(false);
    });

    it("应该正确清除所有缓存", () => {
      cache.set("key1", "value1", 10000);
      cache.set("key2", "value2", 10000);

      cache.clear();

      expect(cache.get("key1").hit).toBe(false);
      expect(cache.get("key2").hit).toBe(false);
      expect(cache.size).toBe(0);
    });
  });

  describe("LRU 淘汰策略", () => {
    it("应该遵守最大条目数限制", () => {
      const smallCache = new MemoryCache<string>({ maxSize: 3 });

      smallCache.set("key1", "value1", 10000);
      smallCache.set("key2", "value2", 10000);
      smallCache.set("key3", "value3", 10000);
      smallCache.set("key4", "value4", 10000); // 应该移除 key1（最旧）

      expect(smallCache.get("key1").hit).toBe(false);
      expect(smallCache.get("key2").hit).toBe(true);
      expect(smallCache.get("key3").hit).toBe(true);
      expect(smallCache.get("key4").hit).toBe(true);
    });

    it("应该更新 LRU 顺序", () => {
      const smallCache = new MemoryCache<string>({ maxSize: 2 });

      smallCache.set("key1", "value1", 10000);
      smallCache.set("key2", "value2", 10000);

      // 访问 key1，使其变为最新
      smallCache.get("key1");

      // 添加新条目，应该删除 key2（最旧）
      smallCache.set("key3", "value3", 10000);

      expect(smallCache.get("key1").hit).toBe(true);
      expect(smallCache.get("key2").hit).toBe(false);
      expect(smallCache.get("key3").hit).toBe(true);
    });

    it("应该在达到容量限制时淘汰最旧条目", () => {
      const smallCache = new MemoryCache<string>({ maxSize: 2 });

      smallCache.set("a", "value_a", 10000);
      smallCache.set("b", "value_b", 10000);

      // 访问 a，使其变新
      smallCache.get("a");

      // 添加 c，应该淘汰 b（最旧）
      smallCache.set("c", "value_c", 10000);

      expect(smallCache.get("a").hit).toBe(true);
      expect(smallCache.get("b").hit).toBe(false);
      expect(smallCache.get("c").hit).toBe(true);
    });
  });

  describe("内存监控", () => {
    it("应该正确估算和跟踪内存使用", () => {
      const smallCache = new MemoryCache<string>({ maxMemoryBytes: 200 });

      smallCache.set("key1", "value1", 10000); // ~10 bytes
      smallCache.set("key2", "value2", 10000); // ~10 bytes

      const stats = smallCache.getStats();
      expect(stats.memoryBytes).toBeGreaterThan(0);
      expect(stats.memoryUsagePercent).toBeLessThan(100);
    });

    it("应该基于内存限制淘汰条目", () => {
      // 设置很小的内存限制
      const smallCache = new MemoryCache<string>({
        maxMemoryBytes: 50,
        maxSize: 100 // 确保不是条目数限制
      });

      // 添加大对象
      smallCache.set("big1", "a".repeat(30), 10000);
      smallCache.set("big2", "b".repeat(30), 10000);

      const stats = smallCache.getStats();
      // 应该触发内存淘汰
      expect(stats.total).toBeLessThanOrEqual(1);
    });

    it("应该记录淘汰次数", () => {
      const smallCache = new MemoryCache<string>({ maxSize: 2 });

      smallCache.set("key1", "value1", 10000);
      smallCache.set("key2", "value2", 10000);
      smallCache.set("key3", "value3", 10000); // 淘汰 key1

      const stats = smallCache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  describe("过期清理", () => {
    it("应该正确清理过期条目（通过触发自动清理）", () => {
      const testCache = new MemoryCache<string>({ cleanupInterval: 500 });

      testCache.set("key1", "value1", 100);   // 100ms 过期
      testCache.set("key2", "value2", 2000);  // 2000ms 过期

      // 等待过期
      vi.advanceTimersByTime(101);

      // 触发自动清理（需要等待清理间隔）
      vi.advanceTimersByTime(500);

      // 访问触发清理
      testCache.get("key1");
      testCache.get("key2");

      const stats = testCache.getStats();
      expect(stats.active).toBe(1);  // 只有 key2 还有效
      expect(stats.expired).toBe(0); // 过期的已被清理
    });

    it("应该自动定期清理过期条目", () => {
      const smallCache = new MemoryCache<string>({
        maxSize: 100,
        cleanupInterval: 100
      });

      smallCache.set("key1", "value1", 50); // 50ms 过期
      smallCache.set("key2", "value2", 200); // 200ms 过期

      // 等待 60ms，key1 应该过期
      vi.advanceTimersByTime(60);

      // 触发访问，这会触发自动清理
      smallCache.get("key1");
      smallCache.get("key2");

      // key1 应该已过期并被删除
      const result1 = smallCache.get("key1");
      const result2 = smallCache.get("key2");

      expect(result1.hit).toBe(false);
      expect(result2.hit).toBe(true);
    });

    it("应该优先清理过期条目而非 LRU", () => {
      const smallCache = new MemoryCache<string>({
        maxSize: 2,
        cleanupInterval: 0 // 立即清理
      });

      smallCache.set("expired", "value1", 1); // 很快过期
      smallCache.set("valid", "value2", 10000);

      vi.advanceTimersByTime(2); // 等待过期

      // 添加新条目，应该先清理过期的
      smallCache.set("new", "value3", 10000);

      const stats = smallCache.getStats();
      // 应该有 valid 和 new，expired 被清理
      expect(stats.total).toBe(2);
      expect(stats.active).toBe(2);
    });
  });

  describe("统计信息", () => {
    it("应该正确统计缓存信息", () => {
      cache.set("key1", "value1", 10000);
      cache.set("key2", "value2", 100); // 很快过期

      vi.advanceTimersByTime(101); // key2 过期

      const stats = cache.getStats();
      expect(stats.total).toBe(2); // 总条目数
      expect(stats.active).toBe(1); // 有效条目
      expect(stats.expired).toBe(1); // 过期条目
    });

    it("应该记录命中和未命中次数", () => {
      cache.set("key1", "value1", 10000);

      cache.get("key1"); // 命中
      cache.get("key1"); // 命中
      cache.get("nonexistent"); // 未命中

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it("应该提供内存使用详情", () => {
      cache.set("key1", "value1", 10000);
      cache.set("key2", "value2", 10000);

      const stats = cache.getStats();
      expect(stats.memoryBytes).toBeGreaterThan(0);
      expect(stats.maxMemoryBytes).toBe(100 * 1024 * 1024); // 默认 100MB
      expect(stats.memoryUsagePercent).toBeLessThan(100);
    });
  });

  describe("边界情况", () => {
    it("应该处理空缓存", () => {
      const stats = cache.getStats();
      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.memoryBytes).toBe(0);
    });

    it("应该处理重复 key 更新", () => {
      cache.set("key1", "value1", 10000);
      cache.set("key1", "value2", 10000); // 更新

      const result = cache.get("key1");
      expect(result.value).toBe("value2");
      expect(cache.size).toBe(1); // 仍然只有一个条目
    });

    it("应该处理强制清理", () => {
      cache.set("key1", "value1", 10000);
      cache.set("key2", "value2", 10000);

      cache.forceCleanup();

      // 仍然存在，因为没有过期
      expect(cache.get("key1").hit).toBe(true);
      expect(cache.get("key2").hit).toBe(true);
    });

    it("应该处理删除不存在的 key", () => {
      expect(() => cache.delete("nonexistent")).not.toThrow();
    });

    it("应该处理不同大小的对象", () => {
      const smallCache = new MemoryCache<any>({ maxMemoryBytes: 1000 });

      smallCache.set("string", "hello", 10000);
      smallCache.set("number", 12345, 10000);
      smallCache.set("object", { a: 1, b: 2 }, 10000);
      smallCache.set("array", [1, 2, 3], 10000);

      const stats = smallCache.getStats();
      expect(stats.total).toBe(4);
      expect(stats.memoryBytes).toBeGreaterThan(0);
    });
  });
});
