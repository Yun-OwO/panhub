import type { IHotSearchStore, HotSearchItem, HotSearchStats } from "./hotSearchStore";

/**
 * 内存热搜存储实现
 * 用于 JSON 文件不可用时的降级方案（Vercel/CF 无持久化文件系统）
 */
export class MemoryHotSearchStore implements IHotSearchStore {
  private memoryStore = new Map<string, HotSearchItem>();

  async recordSearch(term: string, now: number): Promise<void> {
    if (!term || term.trim().length === 0) return;

    const existing = this.memoryStore.get(term);
    if (existing) {
      existing.score += 1;
      existing.lastSearched = now;
    } else {
      this.memoryStore.set(term, {
        term,
        score: 1,
        lastSearched: now,
        createdAt: now,
      });
    }
  }

  async getHotSearches(limit: number): Promise<HotSearchItem[]> {
    return Array.from(this.memoryStore.values())
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.lastSearched - a.lastSearched;
      })
      .slice(0, limit);
  }

  async cleanupOldEntries(maxEntries: number): Promise<void> {
    const entries = Array.from(this.memoryStore.entries()).sort((a, b) => {
      if (b[1].score !== a[1].score) return b[1].score - a[1].score;
      return b[1].lastSearched - a[1].lastSearched;
    });

    if (entries.length > maxEntries) {
      entries.slice(maxEntries).forEach(([term]) => {
        this.memoryStore.delete(term);
      });
    }
  }

  async clearHotSearches(): Promise<{ success: boolean; message: string }> {
    this.memoryStore.clear();
    return { success: true, message: "热搜记录已清除" };
  }

  async deleteHotSearch(term: string): Promise<{ success: boolean; message: string }> {
    const deleted = this.memoryStore.delete(term);
    if (deleted) {
      return { success: true, message: `热搜词 "${term}" 已删除` };
    }
    return { success: false, message: "热搜词不存在" };
  }

  async getStats(): Promise<HotSearchStats> {
    const items = await this.getHotSearches(10);
    return {
      total: this.memoryStore.size,
      topTerms: items,
    };
  }

  close(): void {
    this.memoryStore.clear();
  }
}
