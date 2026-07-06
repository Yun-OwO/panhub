import { defineEventHandler } from "h3";
import { getOrCreateSearchService } from "../core/services";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const service = getOrCreateSearchService(config);
  const plugins = service
    .getPluginManager()
    .getPlugins()
    .map((p) => p.name());
  return {
    status: "ok",
    plugins_enabled: true,
    plugin_count: plugins.length,
    plugins,
  };
});
