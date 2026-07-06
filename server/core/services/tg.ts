import { load } from "cheerio";
import { ofetch } from "ofetch";
import type { SearchResult } from "../types/models";
import { matchesSearchKeyword } from "../utils/searchKeyword";
import { logger } from "../utils/logger";

export interface TgFetchOptions {
  limitPerChannel?: number;
  userAgent?: string;
  signal?: AbortSignal;
}

export async function fetchTgChannelPosts(
  channel: string,
  keyword: string,
  options: TgFetchOptions = {}
): Promise<SearchResult[]> {
  const ua =
    options.userAgent ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

  const limit = options.limitPerChannel ?? 50;
  const maxPages = Math.ceil(limit / 20);
  const allResults: SearchResult[] = [];
  let before: string | undefined;

  for (let page = 0; page < maxPages && allResults.length < limit; page++) {
    // 客户端断开时提前退出分页循环
    if (options.signal?.aborted) break;

    const baseUrl = `https://t.me/s/${encodeURIComponent(channel)}`;
    const url = before ? `${baseUrl}?before=${before}` : baseUrl;

    let html = "";
    try {
      html = await ofetch<string>(url, { headers: { "user-agent": ua }, signal: options.signal });
    } catch (e: any) {
      logger.debug?.(`TG fetch failed for ${url}: ${e?.message || e}`);
    }

    if (!html || !html.includes("tgme_widget_message")) {
      const mirrorUrl = before
        ? `https://r.jina.ai/https://t.me/s/${encodeURIComponent(channel)}?before=${before}`
        : `https://r.jina.ai/https://t.me/s/${encodeURIComponent(channel)}`;

      try {
        html = await ofetch<string>(mirrorUrl, { headers: { "user-agent": ua }, signal: options.signal });
      } catch (e: any) {
        logger.debug?.(`TG mirror fetch failed for ${mirrorUrl}: ${e?.message || e}`);
      }
    }

    if (!html || !html.includes("tgme_widget_message")) {
      break;
    }

    const $ = load(html || "");
    const pageResults = parseChannelPage($, channel, keyword, limit - allResults.length, allResults.length);
    allResults.push(...pageResults);

    const nextLink = $('a[href*="before="]').first();
    const href = nextLink.attr("href");
    if (href) {
      const match = href.match(/before=([^&]+)/);
      if (match) {
        before = match[1];
      } else {
        break;
      }
    } else {
      break;
    }

    if (page < maxPages - 1 && allResults.length < limit) {
      // 随机 jitter 避免多频道并行时同步突发被 t.me 限流
      const jitter = 50 + Math.floor(Math.random() * 100);
      await new Promise((resolve) => setTimeout(resolve, jitter));
    }
  }

  return allResults;
}

export function parseChannelPage(
  $: cheerio.CheerioAPI,
  channel: string,
  keyword: string,
  limit: number,
  startIndex = 0
): SearchResult[] {
  const results: SearchResult[] = [];

  const deproxyUrl = (raw: string): string => {
    try {
      const u = new URL(raw);
      if (u.hostname === "r.jina.ai") {
        const path = decodeURIComponent(u.pathname || "");
        if (path.startsWith("/http://") || path.startsWith("/https://")) {
          return path.slice(1);
        }
      }
      return raw;
    } catch {
      return raw;
    }
  };

  const classifyByHostname = (hostname: string): string => {
    const host = hostname.toLowerCase();
    if (host === "t.me" || host.endsWith(".t.me")) return "";
    if (host === "r.jina.ai") return "";
    if (host.endsWith("alipan.com") || host.endsWith("aliyundrive.com")) return "aliyun";
    if (host === "pan.baidu.com") return "baidu";
    if (host === "pan.quark.cn") return "quark";
    if (host === "pan.xunlei.com") return "xunlei";
    if (host.endsWith("123pan.com")) return "123";
    if (host === "cloud.189.cn") return "tianyi";
    if (host === "115.com" || host.endsWith(".115.com")) return "115";
    if (host === "drive.uc.cn") return "uc";
    if (host === "yun.139.com") return "mobile";
    return "";
  };

  $(".tgme_widget_message_wrap").each((i, el) => {
    if (results.length >= limit) return false;
    const root = $(el);
    const text = root.find(".tgme_widget_message_text").text().trim();
    const dateTitle = root.find("time").attr("datetime") || "";
    const postId = root.find(".tgme_widget_message").attr("data-post") || "";
    const firstLine = text.split("\n")[0] || text.slice(0, 80);

    if (!matchesSearchKeyword(text, keyword)) {
      return;
    }

    const links: { type: string; url: string; password: string }[] = [];
    const seenUrls = new Set<string>();
    // 匹配 http(s) 链接和 magnet 链接（磁力链接无 hostname，需单独匹配）
    const urlPattern = /https?:\/\/[A-Za-z0-9\-._~:\/?#\[\]@!$&'()*+,;=%]+|magnet:\?[A-Za-z0-9\-._~:\/?#\[\]@!$&'()*+,;=%]+/g;
    const passwdPattern = /(?:提取码|密码|pwd|pass)[:：\s]*([a-zA-Z0-9]{3,6})/i;

    // 解析原始 URL 为 { url, type }；展开 r.jina.ai 代理，以及 t.me 分享/跳转链接
    // 里嵌套的真实网盘地址（如 https://t.me/share/url?url=https://pan.quark.cn/...）。
    // 否则宽正则会把整条 t.me 链接匹配出来，真实网盘地址被当成 t.me 丢弃。
    const resolveUrl = (raw: string): { url: string; type: string } | null => {
      // magnet 链接无 hostname，直接按协议识别
      if (raw.startsWith("magnet:")) return { url: raw, type: "magnet" };

      const deproxied = deproxyUrl(raw);
      let parsed: URL;
      try {
        parsed = new URL(deproxied);
      } catch {
        return null;
      }
      const type = classifyByHostname(parsed.hostname);
      if (type) return { url: deproxied, type };

      // 顶层域名不是网盘，检查是否是带 url= 的分享/跳转链接
      const nestedRaw = parsed.searchParams.get("url");
      if (nestedRaw) {
        const nestedDeproxied = deproxyUrl(nestedRaw);
        try {
          const nestedType = classifyByHostname(
            new URL(nestedDeproxied).hostname
          );
          if (nestedType) return { url: nestedDeproxied, type: nestedType };
        } catch {
          return null;
        }
      }
      return null;
    };

    const addUrl = (raw: string) => {
      const resolved = resolveUrl(raw);
      if (!resolved) return;

      const key = resolved.url.toLowerCase();
      if (seenUrls.has(key)) return;
      seenUrls.add(key);

      const m = text.match(passwdPattern);
      const password = m ? m[1] : "";
      links.push({ type: resolved.type, url: resolved.url, password });
    };

    const urlsFromText = text.match(urlPattern) || [];
    for (const u of urlsFromText) addUrl(u);

    root.find(".tgme_widget_message_text a[href]").each((_, a) => {
      const href = $(a).attr("href");
      if (href) addUrl(href);
    });

    let title = firstLine;
    for (const link of links) {
      const escaped = link.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      title = title.replace(new RegExp(escaped, "g"), "");
    }
    title = title
      .replace(
        /(名称|描述|链接|大小|标签|夸克|UC|百度|阿里|迅雷|115|天翼|123|移动|提取码|密码|📧|📿|：|,|\.|\||-|\s)+/g,
        " "
      )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    if (!title) title = firstLine.slice(0, 80);

    let content = text;
    for (const link of links) {
      const escaped = link.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      content = content.replace(new RegExp(escaped, "g"), "");
      if (link.password) {
        content = content.replace(
          new RegExp(`(?:提取码|密码|pwd|pass)[:：\\s]*${link.password}`, "gi"),
          ""
        );
      }
    }
    content = content
      .replace(/(夸克|UC|百度|阿里|迅雷|115|天翼|123|移动|：|,|\.|\||-)+/g, "")
      .replace(/\s+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    results.push({
      message_id: postId,
      unique_id: `tg-${channel}-${postId || startIndex + i}`,
      channel,
      datetime: dateTitle ? new Date(dateTitle).toISOString() : "",
      title,
      content,
      links,
    });
  });

  return results;
}
