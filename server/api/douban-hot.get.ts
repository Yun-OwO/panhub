import { defineEventHandler, getQuery, createError } from "h3";
import { fetchDoubanHotByCategory } from "../core/services/doubanHotService";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const category = (query.category as string) || "douban-top250";
  const rawPage = parseInt((query.page as string) || "1", 10);
  const rawLimit = parseInt((query.limit as string) || "25", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= 100 ? rawLimit : 25;

  try {
    const data = await fetchDoubanHotByCategory(category, page, limit);

    return {
      code: 0,
      message: "success",
      data: {
        category,
        items: data.items,
        hasMore: data.hasMore,
        page,
        limit,
      },
    };
  } catch (error: any) {
    throw createError({
      statusCode: 502,
      message: `获取豆瓣榜单失败: ${error?.message || "upstream error"}`,
    });
  }
});
