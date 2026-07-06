import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { UnlockRateLimiter } from "../../server/utils/unlockRateLimiter";

describe("UnlockRateLimiter", () => {
  let limiter: UnlockRateLimiter;

  beforeEach(() => {
    limiter = new UnlockRateLimiter(3, 60_000);
  });

  it("默认不封禁新 IP", () => {
    expect(limiter.isBlocked("1.2.3.4")).toBe(false);
  });

  it("失败次数达到阈值后锁定 IP", () => {
    limiter.recordFailure("1.2.3.4");
    limiter.recordFailure("1.2.3.4");
    expect(limiter.isBlocked("1.2.3.4")).toBe(false);

    limiter.recordFailure("1.2.3.4");
    expect(limiter.isBlocked("1.2.3.4")).toBe(true);
  });

  it("不同 IP 独立计数", () => {
    limiter.recordFailure("1.2.3.4");
    limiter.recordFailure("1.2.3.4");
    limiter.recordFailure("1.2.3.4");
    expect(limiter.isBlocked("1.2.3.4")).toBe(true);
    expect(limiter.isBlocked("5.6.7.8")).toBe(false);
  });

  it("成功认证清除该 IP 的失败记录", () => {
    limiter.recordFailure("1.2.3.4");
    limiter.recordFailure("1.2.3.4");
    limiter.recordSuccess("1.2.3.4");

    expect(limiter.isBlocked("1.2.3.4")).toBe(false);
  });

  it("锁定过期后自动解封", () => {
    vi.useFakeTimers();
    try {
      limiter.recordFailure("1.2.3.4");
      limiter.recordFailure("1.2.3.4");
      limiter.recordFailure("1.2.3.4");
      expect(limiter.isBlocked("1.2.3.4")).toBe(true);

      vi.advanceTimersByTime(61_000);
      expect(limiter.isBlocked("1.2.3.4")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("锁定期内持续封禁", () => {
    vi.useFakeTimers();
    try {
      limiter.recordFailure("1.2.3.4");
      limiter.recordFailure("1.2.3.4");
      limiter.recordFailure("1.2.3.4");

      vi.advanceTimersByTime(30_000);
      expect(limiter.isBlocked("1.2.3.4")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
