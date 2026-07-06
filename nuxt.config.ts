// https://nuxt.com/docs/api/configuration/nuxt-config
import channelsConfig from "./config/channels.json";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  devServer: {
    port: 4000,
  },
  app: {
    head: {
      htmlAttrs: { lang: "zh-CN" },
      title: "PanHub · 全网最全的网盘搜索",
      titleTemplate: "%s · PanHub",
      meta: [
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
        },
        {
          name: "description",
          content:
            "PanHub：聚合阿里云盘、夸克、百度网盘、115、迅雷等平台的全网最全网盘搜索工具，实时检索分享资源，免费、快速、无广告。",
        },
        {
          name: "keywords",
          content:
            "网盘搜索, 阿里云盘, 夸克, 百度网盘, 115, 迅雷, 资源搜索, 盘搜, panhub, 网盘聚合搜索",
        },
        { name: "theme-color", content: "#111111" },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "PanHub" },
      ],
      link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
    },
  },
  nitro: {
    // 根据环境变量动态选择部署预设
    preset: process.env.VERCEL
      ? "vercel"
      : process.env.NITRO_PRESET || "node-server",
    // Vercel serverless function 最大执行时间（Pro: 60s, Hobby: 10s）
    vercel: {
      functions: {
        maxDuration: 60,
      },
    },
  },
  routeRules: {
    // 所有页面走客户端渲染，减轻 CF Pages 免费版 CPU 压力
    "/**": { ssr: false },
    // API 路由禁止缓存
    "/api/**": { swr: false, cache: false },
  },
  runtimeConfig: {
    // server-only 配置
    searchPassword: process.env.SEARCH_PASSWORD || "",
    priorityChannels: channelsConfig.priorityChannels,
    defaultChannels: channelsConfig.defaultChannels,
    defaultConcurrency: channelsConfig.defaultConcurrency,
    pluginTimeoutMs: channelsConfig.pluginTimeoutMs,
    cacheEnabled: true,
    cacheTtlMinutes: channelsConfig.cacheTtlMinutes,
    public: {
      apiBase: "/api",
      siteUrl: "https://panhub.shenzjd.com",
      // 向前端暴露默认频道清单
      tgDefaultChannels: channelsConfig.defaultChannels,
    },
  },
});
