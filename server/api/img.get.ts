import { defineEventHandler, getQuery, createError, setHeader } from "h3";
import { ofetch } from "ofetch";

const ALLOWED_HOSTS = /^img[1-9]\.doubanio\.com$/;

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const raw = (query.url as string) || "";
  const url = decodeURIComponent(raw);

  if (!url || !url.startsWith("https://")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid url" });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid url" });
  }

  if (!ALLOWED_HOSTS.test(parsed.hostname)) {
    throw createError({ statusCode: 403, statusMessage: "Host not allowed" });
  }

  // 防止 SSRF 绕过：URL 中不得包含用户信息段或非标准端口
  if (parsed.username || parsed.password || parsed.port) {
    throw createError({ statusCode: 403, statusMessage: "Host not allowed" });
  }

  try {
    const resp = await ofetch<ArrayBuffer>(url, {
      responseType: "arrayBuffer",
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Referer": "https://movie.douban.com/",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      },
      timeout: 15000,
      retry: 1,
      retryDelay: 1000,
    });

    const buffer = Buffer.from(resp);
    setHeader(event, "Cache-Control", "public, max-age=86400");
    setHeader(event, "X-Content-Type-Options", "nosniff");
    const ext = parsed.pathname.split(".").pop()?.toLowerCase() || "jpg";
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    setHeader(event, "Content-Type", mime);
    return buffer;
  } catch (error: any) {
    throw createError({
      statusCode: 503,
      statusMessage: "Image fetch timeout",
    });
  }
});
