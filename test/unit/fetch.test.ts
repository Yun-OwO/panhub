/**
 * fetch 工具函数单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry, safeExecute, safeExecuteAll } from "../../server/core/utils/fetch";
import * as ofetchModule from "ofetch";

// Mock ofetch
vi.mock("ofetch", () => ({
  ofetch: {
    create: vi.fn((options) => {
      return vi.fn(async (url: string) => {
        // 模拟实际的 fetch 行为
        const mockResponse = { data: "test" };
        return mockResponse;
      });
    }),
  },
}));

describe("fetchWithRetry", () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.mocked(ofetchModule.ofetch.create).mockReturnValue(mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("应该在第一次尝试就成功", async () => {
    const mockResponse = { data: "test" };
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await fetchWithRetry("https://api.example.com/test");
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("应该在失败后重试并成功", async () => {
    const mockResponse = { data: "test" };
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockResponse);

    const result = await fetchWithRetry(
      "https://api.example.com/test",
      {},
      { maxRetries: 2, baseDelay: 10, logWarnings: false }
    );

    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("应该在达到最大重试次数后抛出错误", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    await expect(
      fetchWithRetry(
        "https://api.example.com/test",
        {},
        { maxRetries: 1, baseDelay: 10, logWarnings: false }
      )
    ).rejects.toThrow("Network error");

    // 1次初始 + 1次重试 = 2次
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("应该使用自定义超时时间", async () => {
    const mockResponse = { data: "test" };
    mockFetch.mockResolvedValueOnce(mockResponse);

    await fetchWithRetry(
      "https://api.example.com/test",
      {},
      { timeout: 5000 }
    );

    // 验证 ofetch.create 被调用时传入了正确的 timeout
    expect(ofetchModule.ofetch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 5000,
      })
    );
  });
});

describe("safeExecute", () => {
  it("应该返回操作成功的结果", async () => {
    const operation = async () => "success";
    const result = await safeExecute(operation, "fallback");
    expect(result).toBe("success");
  });

  it("应该在操作失败时返回默认值", async () => {
    const operation = async () => {
      throw new Error("Operation failed");
    };
    const result = await safeExecute(operation, "fallback");
    expect(result).toBe("fallback");
  });

  it("应该处理非 Error 类型的异常", async () => {
    const operation = async () => {
      throw "string error";
    };
    const result = await safeExecute(operation, "fallback");
    expect(result).toBe("fallback");
  });

  it("应该接收可选的日志记录器", async () => {
    const mockLogger = {
      error: vi.fn(),
    };
    const operation = async () => {
      throw new Error("Test error");
    };
    const result = await safeExecute(operation, "fallback", mockLogger as any);
    expect(result).toBe("fallback");
    expect(mockLogger.error).toHaveBeenCalledWith("Operation failed", expect.any(Error));
  });
});

describe("safeExecuteAll", () => {
  it("应该并行执行所有操作并返回结果", async () => {
    const operations = [
      async () => "result1",
      async () => "result2",
      async () => "result3",
    ];
    const results = await safeExecuteAll(operations, "fallback");
    expect(results).toEqual(["result1", "result2", "result3"]);
  });

  it("应该处理部分操作失败的情况", async () => {
    const operations = [
      async () => "result1",
      async () => {
        throw new Error("failed");
      },
      async () => "result3",
    ];
    const results = await safeExecuteAll(operations, "fallback");
    expect(results).toEqual(["result1", "fallback", "result3"]);
  });

  it("应该处理空数组", async () => {
    const results = await safeExecuteAll([], "fallback");
    expect(results).toEqual([]);
  });

  it("应该处理所有操作都失败的情况", async () => {
    const operations = [
      async () => { throw new Error("error1"); },
      async () => { throw new Error("error2"); },
    ];
    const results = await safeExecuteAll(operations, "default");
    expect(results).toEqual(["default", "default"]);
  });
});
