/**
 * mergeMergedByType 单元测试
 */

import { describe, it, expect } from "vitest";
import { mergeMergedByType } from "../../utils/mergeMergedByType";

describe("mergeMergedByType", () => {
  it("应返回 target 当 incoming 为 undefined", () => {
    const target = { aliyun: [{ url: "a", password: "", note: "", datetime: "" }] };
    expect(mergeMergedByType(target, undefined)).toBe(target);
  });

  it("应正确合并同一类型的去重（按 url）", () => {
    const target = {
      aliyun: [{ url: "https://a.com", password: "", note: "1", datetime: "" }],
    };
    const incoming = {
      aliyun: [
        { url: "https://a.com", password: "", note: "1", datetime: "" },
        { url: "https://b.com", password: "", note: "2", datetime: "" },
      ],
    };
    const result = mergeMergedByType(target, incoming);
    expect(result.aliyun).toHaveLength(2);
    expect(result.aliyun!.map((x) => x.url)).toEqual(["https://a.com", "https://b.com"]);
  });

  it("应正确合并不同类型", () => {
    const target = { aliyun: [{ url: "a", password: "", note: "", datetime: "" }] };
    const incoming = { quark: [{ url: "q", password: "", note: "", datetime: "" }] };
    const result = mergeMergedByType(target, incoming);
    expect(result.aliyun).toHaveLength(1);
    expect(result.quark).toHaveLength(1);
  });

  it("应不修改原 target 对象", () => {
    const target = { aliyun: [{ url: "a", password: "", note: "", datetime: "" }] };
    const incoming = { aliyun: [{ url: "b", password: "", note: "", datetime: "" }] };
    const result = mergeMergedByType(target, incoming);
    expect(target.aliyun).toHaveLength(1);
    expect(result.aliyun).toHaveLength(2);
  });
});
