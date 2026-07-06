# UX 体验优化

日期：2026-06-05

---

## 改动清单

### 1. 复制链接反馈

**问题**：点击复制按钮后无任何提示。
**方案**：复制成功后在按钮上显示 ✓ 动画 1.5 秒，同时弹出 toast "已复制到剪贴板"。

### 2. 搜索历史

**问题**：无本地搜索记录，重复搜索得重新打字。
**方案**：
- 搜索框下方显示最近 5 条搜索历史（localStorage 存储）
- 点击历史词直接搜索
- 每条历史右侧有 × 可删除
- 搜索时自动记录（去重，最多 20 条）

### 3. URL 同步

**问题**：搜索词不进 URL，分享链接别人看不到结果。
**方案**：
- 搜索时更新 URL：`/?q=关键词`（replaceState，不刷新页面）
- 页面加载时读取 `?q=` 参数自动搜索
- 不影响浏览器前进后退（popstate 监听）

### 4. 筛选器显示结果数

**问题**：平台 pill 只有名字，不知道哪个平台结果多。
**方案**：pill 改为 `阿里云盘 (12)` 格式，数字从 groupedResults 计算。

### 5. 设置保存防抖

**问题**：每改一个选项就弹 toast，刷屏。
**方案**：toast 改为 1 秒防抖，连续修改只弹最后一次。

### 6. Escape 关闭设置面板

**问题**：只能点遮罩关闭设置面板。
**方案**：监听 keydown Escape，关闭 drawer。

### 7. 空结果推荐

**问题**：搜索无结果只说"试试其他关键词"，不给具体建议。
**方案**：空结果时从热搜数据取 Top 5 作为推荐词，显示"大家都在搜：xxx、xxx、xxx"。

### 8. 日期格式优化

**问题**：结果里显示完整时间太冗长。
**方案**：改为相对时间（今天/昨天/3天前/2026-05-01）。

### 9. 暗色模式手动切换

**问题**：暗色模式只跟系统，不能手动切换。
**方案**：header 加切换按钮（太阳/月亮图标），状态存 localStorage，手动设置优先于系统偏好。

### 10. Ctrl+K 快捷键

**问题**：无键盘快捷键聚焦搜索框。
**方案**：监听 Ctrl+K / Cmd+K，聚焦搜索框并全选内容。

### 11. 代码清理

- 删除未使用的 `ResultHeader.vue`
- 删除 SearchBox 中无效的 `handleTouchEnd` 逻辑
- 移除 `pages/index/index.vue` 中的 100ms 人工延迟
- 统一 iOS blur 处理（只在 useSearch 中处理一次）

## 文件变更

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `composables/useSearch.ts` | 复制反馈 + 日期格式 + URL 同步 |
| 修改 | `components/SearchBox.vue` | 搜索历史 + Ctrl+K + 清理 touch |
| 修改 | `components/ResultGroup.vue` | 复制动画 + 日期格式 |
| 修改 | `pages/index/index.vue` | 筛选器结果数 + 空结果推荐 + URL 读取 + 清理延迟 |
| 修改 | `components/SettingsDrawer.vue` | Escape 关闭 |
| 修改 | `app.vue` | toast 防抖 + 暗色模式切换按钮 |
| 修改 | `composables/useToast.ts` | 防抖支持 |
| 新建 | `composables/useDarkMode.ts` | 暗色模式状态管理 |
| 修改 | `assets/css/dark-mode.css` | 改为 class 驱动（html.dark） |
| 删除 | `components/ResultHeader.vue` | 未使用的死代码 |

## 不做的事

- 不做虚拟滚动（当前结果量不需要）
- 不做导出/分享功能（YAGNI）
- 不做键盘导航（accessibility 后续单独做）
- 不做 focus trap（需要引入 focus-trap 库，后续做）
