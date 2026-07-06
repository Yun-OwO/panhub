import { loggers } from "../utils/logger";

/**
 * 插件健康状态接口
 */
export interface PluginHealthStatus {
  name: string;
  isHealthy: boolean;
  avgResponseTime: number;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
}

/**
 * 插件健康检查配置
 */
export interface PluginHealthConfig {
  maxFailures: number;
  circuitBreakerTimeoutMs: number;
  responseTimeThresholdMs: number;
}

/**
 * 插件健康检查器
 * 跟踪插件的响应时间和失败率
 */
export class PluginHealthChecker {
  private healthMap = new Map<string, PluginHealthStatus>();
  private config: PluginHealthConfig;

  constructor(config: PluginHealthConfig) {
    this.config = config;
  }

  recordSuccess(pluginName: string, responseTimeMs: number): void {
    const current = this.healthMap.get(pluginName) || {
      name: pluginName,
      isHealthy: true,
      avgResponseTime: 0,
      failureCount: 0,
      successCount: 0,
    };

    current.successCount++;
    current.lastSuccessTime = Date.now();

    // 更新平均响应时间（简单移动平均）
    current.avgResponseTime =
      (current.avgResponseTime * (current.successCount - 1) + responseTimeMs) /
      current.successCount;

    // 如果之前不健康，现在检查是否恢复
    if (!current.isHealthy) {
      const timeSinceLastFailure = current.lastFailureTime
        ? Date.now() - current.lastFailureTime
        : Infinity;

      if (timeSinceLastFailure > this.config.circuitBreakerTimeoutMs) {
        current.isHealthy = true;
        current.failureCount = 0; // 重置失败计数
        loggers.plugin.info("插件恢复正常", {
          plugin: pluginName,
          afterMs: timeSinceLastFailure,
        });
      }
    }

    this.healthMap.set(pluginName, current);
  }

  recordFailure(pluginName: string): void {
    const current = this.healthMap.get(pluginName) || {
      name: pluginName,
      isHealthy: true,
      avgResponseTime: 0,
      failureCount: 0,
      successCount: 0,
    };

    current.failureCount++;
    current.lastFailureTime = Date.now();

    // 检查是否需要熔断
    if (current.failureCount >= this.config.maxFailures && current.isHealthy) {
      current.isHealthy = false;
      loggers.plugin.warn("插件触发熔断", {
        plugin: pluginName,
        failureCount: current.failureCount,
        maxFailures: this.config.maxFailures,
        breakerTimeoutMs: this.config.circuitBreakerTimeoutMs,
      });
    }

    this.healthMap.set(pluginName, current);
  }

  isHealthy(pluginName: string): boolean {
    const status = this.healthMap.get(pluginName);
    if (!status) return true; // 未知插件默认健康

    // 检查是否在熔断器冷却期
    if (!status.isHealthy && status.lastFailureTime) {
      const timeSinceLastFailure = Date.now() - status.lastFailureTime;
      if (timeSinceLastFailure > this.config.circuitBreakerTimeoutMs) {
        // 尝试恢复
        status.isHealthy = true;
        status.failureCount = 0;
        this.healthMap.set(pluginName, status);
      }
    }

    return status.isHealthy;
  }

  getStatus(pluginName: string): PluginHealthStatus | undefined {
    return this.healthMap.get(pluginName);
  }

  getAllStatus(): PluginHealthStatus[] {
    return Array.from(this.healthMap.values());
  }

  reset(pluginName: string): void {
    this.healthMap.delete(pluginName);
  }

  resetAll(): void {
    this.healthMap.clear();
  }
}

/**
 * 创建默认的插件健康检查器
 */
export function createPluginHealthChecker(): PluginHealthChecker {
  return new PluginHealthChecker({
    maxFailures: 5,
    circuitBreakerTimeoutMs: 5 * 60 * 1000, // 5 分钟
    responseTimeThresholdMs: 10000,
  });
}
