import { describe, it, expect } from "vitest";
import { fetchTgChannelPosts } from "../../server/core/services/tg";

describe("TG 频道内容获取测试", () => {
  it("应该能获取 Quark_Movies 频道内容", async () => {
    const results = await fetchTgChannelPosts("Quark_Movies", "", {
      limitPerChannel: 10,
    });

    console.log(`获取到的消息数量: ${results.length}`);
    console.log("前5条消息:");
    results.slice(0, 5).forEach((r, i) => {
      console.log(`${i + 1}. 标题: ${r.title}`);
      console.log(`   内容: ${r.content?.slice(0, 100)}...`);
      console.log(`   链接数: ${r.links?.length || 0}`);
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  }, 30000);
});
