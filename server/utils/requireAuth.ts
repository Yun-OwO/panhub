import type { H3Event } from "h3";

// 认证已禁用：搜索接口无需密码验证
export function requireSearchAuth(_event: H3Event): void {
  return;
}
