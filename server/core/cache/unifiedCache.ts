import { MemoryCache } from "./memoryCache";
import type { SearchResult } from "../types/models";

/**
 * 缓存命名空间
 */
export enum CacheNamespace {
  TG_SEARCH = "tg",
  PLUGIN_SEARCH = "plugin",
  HOT_SEARCH = "hot_search",
}

/**
 * 统一缓存配置
 */
export interface UnifiedCacheConfig {
  enabled: boolean;
  ttlMinutes: number;
  maxSize?: number;
  maxMemoryBytes?: number;
}

/**
 * 统一缓存管理器
 * 提供命名空间支持和统一的缓存操作
 */
export class UnifiedCache {
  private caches: Map<string, MemoryCache<SearchResult[]>> = new Map();
  private config: UnifiedCacheConfig;
  private namespacePrefix: string;

  constructor(config: UnifiedCacheConfig, namespacePrefix: string = "") {
    this.config = config;
    this.namespacePrefix = namespacePrefix;
  }

  /**
   * 生成完整的缓存键
   */
  private buildKey(namespace: CacheNamespace, key: string): string {
    const prefix = this.namespacePrefix ? `${this.namespacePrefix}:` : "";
    return `${prefix}${namespace}:${key}`;
  }

  /**
   * 获取或创建命名空间对应的缓存实例
   */
  private getCache(namespace: CacheNamespace): MemoryCache<SearchResult[]> {
    const cacheKey = this.namespacePrefix
      ? `${this.namespacePrefix}:${namespace}`
      : namespace;

    if (!this.caches.has(cacheKey)) {
      const cache = new MemoryCache<SearchResult[]>({
        maxSize: this.config.maxSize,
        maxMemoryBytes: this.config.maxMemoryBytes,
      });
      this.caches.set(cacheKey, cache);
    }

    return this.caches.get(cacheKey)!;
  }

  /**
   * 获取缓存
   */
  get(namespace: CacheNamespace, key: string): { hit: boolean; value?: SearchResult[] } {
    if (!this.config.enabled) {
      return { hit: false };
    }

    const cache = this.getCache(namespace);
    const fullKey = this.buildKey(namespace, key);
    return cache.get(fullKey);
  }

  /**
   * 设置缓存
   */
  set(namespace: CacheNamespace, key: string, value: SearchResult[]): void {
    if (!this.config.enabled) {
      return;
    }

    const cache = this.getCache(namespace);
    const fullKey = this.buildKey(namespace, key);
    const ttlMs = this.config.ttlMinutes * 60 * 1000;
    cache.set(fullKey, value, ttlMs);
  }

  /**
   * 删除缓存
   */
  delete(namespace: CacheNamespace, key: string): void {
    const cache = this.getCache(namespace);
    const fullKey = this.buildKey(namespace, key);
    cache.delete(fullKey);
  }

  /**
   * 清空指定命名空间的缓存
   */
  clearNamespace(namespace: CacheNamespace): void {
    const cacheKey = this.namespacePrefix
      ? `${this.namespacePrefix}:${namespace}`
      : namespace;
    const cache = this.caches.get(cacheKey);
    if (cache) {
      cache.clear();
    }
  }

  /**
   * 清空所有缓存
   */
  clearAll(): void {
    this.caches.forEach((cache) => cache.clear());
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {
      enabled: this.config.enabled,
      ttlMinutes: this.config.ttlMinutes,
      namespaces: {},
    };

    this.caches.forEach((cache, key) => {
      stats.namespaces[key] = cache.getStats();
    });

    return stats;
  }

  /**
   * 强制清理所有命名空间的缓存
   */
  forceCleanup(): void {
    this.caches.forEach((cache) => cache.forceCleanup());
  }
}

/**
 * 创建搜索缓存实例
 */
export function createSearchCache(config: UnifiedCacheConfig): UnifiedCache {
  return new UnifiedCache(config, "search");
}
