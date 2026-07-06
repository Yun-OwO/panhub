import { describe, it, expect } from "vitest";
import { fetchTgChannelPosts } from "../../server/core/services/tg";

describe("TG 多页加载测试", () => {
  it("应该能获取更多消息（100条）", async () => {
    const results = await fetchTgChannelPosts("Quark_Movies", "", {
      limitPerChannel: 100,
    });

    console.log(`获取到的消息数量: ${results.length}`);
    console.log(`是否获取到更多消息: ${results.length > 20 ? "是" : "否"}`);

    if (results.length > 0) {
      console.log("\n前5条:");
      results.slice(0, 5).forEach((r, i) => {
        console.log(`${i + 1}. ${r.title}`);
      });

      console.log("\n后5条:");
      results.slice(-5).forEach((r, i) => {
        console.log(`${results.length - 5 + i + 1}. ${r.title}`);
      });
    }

    expect(Array.isArray(results)).toBe(true);
    // 期望能获取到超过 20 条消息
    expect(results.length).toBeGreaterThan(20);
  }, 60000);
});
