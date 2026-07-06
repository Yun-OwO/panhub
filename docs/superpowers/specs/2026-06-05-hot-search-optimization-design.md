# 热搜存储迁移 SQLite + 排行榜

日期：2026-06-05

---

## 问题

当前使用 JSON 文件存储热搜（`JsonFileHotSearchStore`），存在：
1. 每次搜索读写整个文件 — 流量大了 I/O 瓶颈
2. 并发不安全 — 多请求同时写会丢数据
3. 无法高效查询 — 按时间范围/分数排序需全量加载
4. 无索引 — 排序全靠内存
5. 迁移到外部数据库无现成路径

## 方案

### 1. SQLite 存储实现

新建 `server/core/services/sqliteHotSearchStore.ts`，替代 `JsonFileHotSearchStore`。

**表结构：**

```sql
CREATE TABLE IF NOT EXISTS hot_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL DEFAULT 1,
  last_searched_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_score ON hot_searches(score DESC);
CREATE INDEX IF NOT EXISTS idx_last_searched ON hot_searches(last_searched_at DESC);
```

**使用 better-sqlite3**（同步 API，适合 Nitro 服务端）：

```ts
import Database from "better-sqlite3";

const db = new Database("./data/hot-searches.db");
db.pragma("journal_mode = WAL");  // 并发读写
db.pragma("busy_timeout = 5000"); // 写锁等待
```

**核心操作：**
- `recordSearch(term)`：`INSERT OR REPLACE`（upsert），score+1
- `getHotSearches(limit)`：`SELECT * ORDER BY score DESC, last_searched_at DESC LIMIT ?`
- `cleanupOldEntries(max)`：`DELETE FROM ... WHERE id NOT IN (SELECT id ... ORDER BY score DESC LIMIT ?)`

### 2. 搜索词归一化

在 `recordSearch` 入口做归一化：

```
normalize(term):
  1. trim()
  2. URL（/^https?:\/\//）→ 丢弃
  3. 长度 > 20 → 丢弃
  4. 全角 → 半角
  5. 返回归一化后的 term
```

### 3. 降级策略

```
SQLite 可用 → sqliteHotSearchStore
SQLite 不可用（CF Workers/Vercel 无 native）→ memoryHotSearchStore
```

删除 `JsonFileHotSearchStore`，不再需要。`memoryHotSearchStore` 保留作为 serverless 降级方案。

### 4. 时间衰减排序

排序公式：`finalScore = score × e^(-0.05 × daysSinceLastSearch)`

SQL 中用：
```sql
SELECT *, score * exp(-0.05 * ((strftime('%s','now') * 1000 - last_searched_at) / 86400000.0)) as decayed_score
FROM hot_searches
ORDER BY decayed_score DESC
LIMIT ?
```

### 5. 排行榜组件

新建 `components/HotRanking.vue`：
- 有序列表，Top 10
- 每行：排名、搜索词、热度条、搜索次数
- 排名 1-3 用 🔥 标记
- 点击触发搜索
- 在 hero-aside 的 tag cloud 下方展示

### 6. API 变更

`GET /api/hot-searches` 返回新增：
- `rank`: 排名（1-based）
- `displayScore`: 时间衰减后的分数（用于热度条百分比）

## 文件变更

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `server/core/services/sqliteHotSearchStore.ts` | SQLite 存储实现 |
| 删除 | `server/core/services/jsonFileHotSearchStore.ts` | 不再需要 |
| 修改 | `server/core/services/hotSearchService.ts` | 改用 SQLite + 降级逻辑 |
| 修改 | `server/core/services/hotSearchStore.ts` | HotSearchItem 加 rank/displayScore |
| 修改 | `server/api/hot-searches.get.ts` | 返回 rank/displayScore |
| 新建 | `components/HotRanking.vue` | 排行榜组件 |
| 修改 | `pages/index/index.vue` | 加 HotRanking |
| 修改 | `Dockerfile` | 安装 better-sqlite3，data 目录加权 |
| 修改 | `package.json` | 添加 better-sqlite3 依赖 |
| 修改 | `docker-compose.yml` | data 卷挂载（保持不变） |
| 修改 | `wrangler.toml` | CF Workers 不支持 native，自动降级到内存 |

## 依赖

```bash
pnpm add better-sqlite3
pnpm add -D @types/better-sqlite3
```

`better-sqlite3` 是 native 模块，Docker 中需要 build tools（Alpine 下 `apk add python3 make g++`）。Cloudflare Workers 不支持 native，自动降级到内存存储。

## 不做的事

- 不做搜索词分类
- 不做强制相似词合并
- 不做趋势分析
- 不引入外部数据库（SQLite 作为过渡）
