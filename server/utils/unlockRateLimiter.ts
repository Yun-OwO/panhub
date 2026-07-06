/**
 * 密码爆破防护限流器（IP 级）
 * 失败次数达到阈值后锁定一段时间，成功认证则清除计数。
 * 用于 /api/auth/unlock 路由，补充全局 rateLimiter 的不足。
 */

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_MS = 5 * 60 * 1000; // 5 分钟

interface AttemptEntry {
  count: number;
  lockedUntil: number;
}

export class UnlockRateLimiter {
  private attempts = new Map<string, AttemptEntry>();
  private maxAttempts: number;
  private lockoutMs: number;

  constructor(maxAttempts = DEFAULT_MAX_ATTEMPTS, lockoutMs = DEFAULT_LOCKOUT_MS) {
    this.maxAttempts = maxAttempts;
    this.lockoutMs = lockoutMs;
  }

  isBlocked(ip: string): boolean {
    const entry = this.attempts.get(ip);
    if (!entry) return false;
    // lockedUntil > 0 表示曾经触发过锁定
    if (entry.lockedUntil > 0) {
      if (Date.now() < entry.lockedUntil) return true;
      // 锁定已过期，清除计数
      this.attempts.delete(ip);
      return false;
    }
    return false;
  }

  recordFailure(ip: string): void {
    const entry = this.attempts.get(ip) || { count: 0, lockedUntil: 0 };
    entry.count++;
    if (entry.count >= this.maxAttempts) {
      entry.lockedUntil = Date.now() + this.lockoutMs;
    }
    this.attempts.set(ip, entry);
  }

  recordSuccess(ip: string): void {
    this.attempts.delete(ip);
  }
}

// 模块级单例：同一进程内共享状态
const unlockLimiter = new UnlockRateLimiter();

/** 获取 unlock 路由专用的限流器实例 */
export function getUnlockRateLimiter(): UnlockRateLimiter {
  return unlockLimiter;
}
