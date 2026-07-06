/**
 * 热搜索存储接口
 * 定义统一的存储操作，支持多种实现方式
 */
export interface IHotSearchStore {
  /**
   * 记录搜索词（增加分数）
   */
  recordSearch(term: string, now: number): Promise<void>;

  /**
   * 获取热搜列表
   */
  getHotSearches(limit: number): Promise<HotSearchItem[]>;

  /**
   * 清理超出限制的旧记录
   */
  cleanupOldEntries(maxEntries: number): Promise<void>;

  /**
   * 清除所有热搜记录
   */
  clearHotSearches(): Promise<{ success: boolean; message: string }>;

  /**
   * 删除指定热搜词
   */
  deleteHotSearch(term: string): Promise<{ success: boolean; message: string }>;

  /**
   * 获取热搜统计信息
   */
  getStats(): Promise<HotSearchStats>;

  /**
   * 关闭存储连接
   */
  close(): void;
}

export interface HotSearchItem {
  term: string;
  score: number;
  lastSearched: number;
  createdAt: number;
  rank?: number;
  displayScore?: number;
}

export interface HotSearchStats {
  total: number;
  topTerms: HotSearchItem[];
}
