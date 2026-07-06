import { defineEventHandler, createError } from "h3";
import { getOrCreateSearchService } from "../core/services";

export default defineEventHandler(async (event) => {
  const service = getOrCreateSearchService(useRuntimeConfig());
  const healthStatus = service.getPluginHealthStatus();

  return {
    code: 0,
    message: "success",
    data: {
      total: healthStatus.length,
      healthy: healthStatus.filter((p) => p.isHealthy).length,
      unhealthy: healthStatus.filter((p) => !p.isHealthy).length,
      plugins: healthStatus,
    },
  };
});
