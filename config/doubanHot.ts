/**
 * 豆瓣影视榜单配置
 * 使用豆瓣 JSON API (/j/chart/top_list) 获取数据
 *
 * typeId: 豆瓣 top_list API 的 type 参数
 *   0=Top250, 3=剧情, 5=动作, 6=爱情, 10=犯罪, 11=科幻,
 *   13=历史, 17=冒险, 19=电视剧, 20=悬疑, 22=战争, 24=喜剧, 25=动画
 */

export interface DoubanHotSourceConfig {
  id: string;
  label: string;
  type: string;
  typeId: number;
}

export const DOUBAN_HOT_SOURCES: DoubanHotSourceConfig[] = [
  // 电影分类（typeId 来自豆瓣 /j/chart/top_list API 实测）
  { id: "douban-top250", label: "电影", type: "Top250", typeId: -1 }, // 特殊：Top250 用独立爬虫
  { id: "douban-drama", label: "电影", type: "剧情", typeId: 3 },
  { id: "douban-comedy", label: "电影", type: "喜剧", typeId: 24 },
  { id: "douban-action", label: "电影", type: "动作", typeId: 5 },
  { id: "douban-romance", label: "电影", type: "爱情", typeId: 6 },
  { id: "douban-scifi", label: "电影", type: "科幻", typeId: 15 },
  { id: "douban-animation", label: "电影", type: "动画", typeId: 16 },
  { id: "douban-mystery", label: "电影", type: "悬疑", typeId: 20 },
  { id: "douban-crime", label: "电影", type: "犯罪", typeId: 10 },
  { id: "douban-war", label: "电影", type: "战争", typeId: 22 },
  { id: "douban-documentary", label: "电影", type: "纪录片", typeId: 1 },
  // 电视剧（typeId=26 实测返回电视剧）
  { id: "douban-tv", label: "电视剧", type: "热门", typeId: 26 },
];

/** 默认展示的分类 */
export const DEFAULT_DOUBAN_CATEGORIES = [
  "douban-top250",
  "douban-drama",
  "douban-comedy",
  "douban-action",
  "douban-scifi",
  "douban-animation",
  "douban-tv",
];
