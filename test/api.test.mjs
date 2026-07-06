// Simple API smoke tests for Nitro endpoints
// Usage:
//   API_BASE=http://localhost:4000/api pnpm run test:api
// or
//   pnpm run dev  (in another shell) then: pnpm run test:api

import { ofetch } from "ofetch";

const API_BASE = process.env.API_BASE || "http://localhost:4000/api";
const KW = process.env.KW || "1"; // 统一关键词：1
const KW_LIST = (() => {
  const raw = process.env.KW_LIST;
  if (raw && raw.trim()) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  // 默认测试关键词列表：短词 + 常用英文/中文
  const arr = [KW, "电影", "movie", "1080p"];
  // 去重
  return Array.from(new Set(arr));
})();

function log(...args) {
  console.log("[TEST]", ...args);
}
function err(...args) {
  console.error("[FAIL]", ...args);
}

let failures = 0;
function expect(cond, msg) {
  if (!cond) {
    failures++;
    err(msg);
  }
}

async function safeFetch(url, opts) {
  try {
    return await ofetch(url, { retry: 0, timeout: 20000, ...opts });
  } catch (e) {
    failures++;
    err("Request error:", url, e?.message || e);
    return null;
  }
}

async function testHealth() {
  if (process.env.PLUGINS) {
    log("[skip] health (PLUGINS specified)");
    return;
  }
  log("GET /health");
  const data = await safeFetch(`${API_BASE}/health`);
  expect(!!data, "health: response should not be null");
  if (!data) return;
  expect(data.status === "ok", "health: status should be 'ok'");
  expect(
    typeof data.plugin_count === "number",
    "health: plugin_count should be number"
  );
  expect(Array.isArray(data.plugins), "health: plugins should be array");
}

async function testSearchGetPlugin() {
  log(`GET /search (plugin, kw=${KW})`);
  // 从 /health 动态获取全部插件名
  let selected = process.env.PLUGINS
    ? String(process.env.PLUGINS)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  if (selected.length === 0) {
    const health = await safeFetch(`${API_BASE}/health`);
    const all = health && Array.isArray(health.plugins) ? health.plugins : [];
    selected = all;
  }
  for (const name of selected) {
    let ok = false;
    for (const kw of KW_LIST) {
      const q = new URLSearchParams({
        kw,
        src: "plugin",
        res: "results",
        plugins: name,
        refresh: "true",
        ext: JSON.stringify({ __plugin_timeout_ms: 6000, __detail_limit: 6 }),
      });
      const data = await safeFetch(`${API_BASE}/search?${q.toString()}`);
      if (!data) {
        err(`plugin:${name}: response null for kw=${kw}`);
        continue;
      }
      if (data.code !== 0) {
        err(`plugin:${name}: bad code(${data.code}) for kw=${kw}`);
        continue;
      }
      const total = data?.data?.total || 0;
      if (total > 0) {
        ok = true;
        log(`plugin:${name}: ok, kw=${kw}, total=${total}`);
        break;
      } else {
        log(`plugin:${name}: empty for kw=${kw}`);
      }
    }
    if (!ok) {
      failures++;
      err(`plugin:${name}: 所有关键词(${KW_LIST.join(", ")}) 均返回 0，需适配`);
    }
  }
}

async function testSearchGetAll() {
  if (process.env.PLUGINS) {
    log("[skip] search all (PLUGINS specified)");
    return;
  }
  log(`GET /search (all, kw=${KW})`);
  const q = new URLSearchParams({
    kw: KW,
    src: "all",
    res: "results",
    refresh: "true",
    ext: JSON.stringify({ __plugin_timeout_ms: 6000, __detail_limit: 6 }),
  });
  const data = await safeFetch(`${API_BASE}/search?${q.toString()}`);
  expect(!!data, "search GET all: response should not be null");
  if (!data) return;
  expect(data.code === 0, "search GET all: code should be 0");
  const total = data?.data?.total || 0;
  if (!(total > 0)) {
    failures++;
    err(`search GET all: 关键词(${KW}) 返回 0 条，接口可能需要重新适配`);
  } else {
    log(`search GET all: ok, total=${total}`);
  }
}

async function testSearchPostTG() {
  if (process.env.PLUGINS) {
    log("[skip] search tg (PLUGINS specified)");
    return;
  }
  log(`POST /search (tg, kw=${KW})`);
  const body = {
    kw: KW,
    src: "tg",
    res: "results",
    channels: "tgsearchers3",
    refresh: true,
    ext: { __plugin_timeout_ms: 6000 },
  };
  const data = await safeFetch(`${API_BASE}/search`, { method: "POST", body });
  expect(!!data, "search POST tg: response should not be null");
  if (!data) return;
  expect(data.code === 0, "search POST tg: code should be 0");
  const total = data?.data?.total || 0;
  if (!(total > 0)) {
    failures++;
    err(`search POST tg: 关键词(${KW}) 返回 0 条，接口可能需要重新适配`);
  } else {
    log(`search POST tg: ok, total=${total}`);
  }
}

// === 新增：错误场景测试 ===

log("--- Error Case Tests ---");

// Test: missing kw parameter returns 400
{
  let passed = false;
  try {
    await ofetch(`${API_BASE}/search`, { method: "GET" });
    err("Expected 400 for missing kw, got success");
  } catch (e) {
    if (e.status === 400 || e.statusCode === 400) {
      log("PASS: missing kw returns 400");
      passed = true;
    } else {
      err(`Expected 400 for missing kw, got ${e.status || e.statusCode}`);
    }
  }
  if (!passed) process.exit(1);
}

// Test: hot-searches POST with empty term returns 400
{
  let passed = false;
  try {
    await ofetch(`${API_BASE}/hot-searches`, {
      method: "POST",
      body: { term: "" },
    });
    err("Expected 400 for empty term, got success");
  } catch (e) {
    if (e.status === 400 || e.statusCode === 400) {
      log("PASS: empty term returns 400");
      passed = true;
    } else {
      err(`Expected 400 for empty term, got ${e.status || e.statusCode}`);
    }
  }
  if (!passed) process.exit(1);
}

// Test: hot-searches POST with unsafe characters returns 400
{
  let passed = false;
  try {
    await ofetch(`${API_BASE}/hot-searches`, {
      method: "POST",
      body: { term: "<script>alert(1)</script>" },
    });
    err("Expected 400 for unsafe term, got success");
  } catch (e) {
    if (e.status === 400 || e.statusCode === 400) {
      log("PASS: unsafe term returns 400");
      passed = true;
    } else {
      err(`Expected 400 for unsafe term, got ${e.status || e.statusCode}`);
    }
  }
  if (!passed) process.exit(1);
}

// Test: hot-searches GET with invalid limit returns 400
{
  let passed = false;
  try {
    await ofetch(`${API_BASE}/hot-searches?limit=abc`);
    err("Expected 400 for invalid limit, got success");
  } catch (e) {
    if (e.status === 400 || e.statusCode === 400) {
      log("PASS: invalid limit returns 400");
      passed = true;
    } else {
      err(`Expected 400 for invalid limit, got ${e.status || e.statusCode}`);
    }
  }
  if (!passed) process.exit(1);
}

log("--- All Error Case Tests Passed ---");

async function main() {
  log("API_BASE =", API_BASE);
  await testHealth();
  await testSearchGetPlugin();
  await testSearchGetAll();
  await testSearchPostTG();
  if (failures > 0) {
    err(`Completed with ${failures} failure(s)`);
    process.exit(1);
  } else {
    log("All tests passed");
  }
}

main();
