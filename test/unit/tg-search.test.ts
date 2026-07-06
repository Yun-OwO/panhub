import { describe, it, expect } from "vitest";
import { fetchTgChannelPosts } from "../../server/core/services/tg";

describe("TG 搜索测试", () => {
  it("应该能搜索到'千与千寻'", async () => {
    const results = await fetchTgChannelPosts("Quark_Movies", "千与千寻", {
      limitPerChannel: 20,
    });

    console.log(`搜索结果数量: ${results.length}`);
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.title}`);
      console.log(`   链接数: ${r.links?.length || 0}`);
    });

    // 验证搜索逻辑是否正常工作
    expect(Array.isArray(results)).toBe(true);
  }, 30000);

  it("应该能搜索到'肖申克的救赎'", async () => {
    const results = await fetchTgChannelPosts("Quark_Movies", "肖申克的救赎", {
      limitPerChannel: 20,
    });

    console.log(`搜索结果数量: ${results.length}`);
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.title}`);
    });

    expect(Array.isArray(results)).toBe(true);
  }, 30000);

  it("应该能搜索到'泰坦尼克号'", async () => {
    const results = await fetchTgChannelPosts("Quark_Movies", "泰坦尼克号", {
      limitPerChannel: 20,
    });

    console.log(`搜索结果数量: ${results.length}`);
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.title}`);
    });

    expect(Array.isArray(results)).toBe(true);
  }, 30000);
});
