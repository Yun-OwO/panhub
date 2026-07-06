import type { MergedLinks } from "~/types/search";

/** 按类型合并搜索结果，按 url 去重 */
export function mergeMergedByType(
  target: MergedLinks,
  incoming?: MergedLinks
): MergedLinks {
  if (!incoming) return target;
  const out: MergedLinks = { ...target };
  for (const type of Object.keys(incoming)) {
    const existed = out[type] || [];
    const next = incoming[type] || [];
    const seen = new Set<string>(existed.map((x) => x.url));
    const mergedArr = [...existed];
    for (const item of next) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        mergedArr.push(item);
      }
    }
    out[type] = mergedArr;
  }
  return out;
}
