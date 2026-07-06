/**
 * 插件管理器单元测试
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  BaseAsyncPlugin,
  PluginManager,
  registerGlobalPlugin,
  getRegisteredPlugins,
} from "../../server/core/plugins/manager";
import type { SearchResult } from "../../server/core/types/models";

// 测试插件类
class TestPlugin1 extends BaseAsyncPlugin {
  constructor() {
    super("test1", 3);
  }

  async search(keyword: string): Promise<SearchResult[]> {
    return [
      {
        message_id: "test1-1",
        unique_id: "test1-1",
        channel: "test1",
        datetime: new Date().toISOString(),
        title: `Test1: ${keyword}`,
        content: "Test content 1",
        links: [{ type: "baidu", url: "https://pan.baidu.com/test1", password: "" }],
      },
    ];
  }
}

class TestPlugin2 extends BaseAsyncPlugin {
  constructor() {
    super("test2", 1);
  }

  async search(keyword: string): Promise<SearchResult[]> {
    return [
      {
        message_id: "test2-1",
        unique_id: "test2-1",
        channel: "test2",
        datetime: new Date().toISOString(),
        title: `Test2: ${keyword}`,
        content: "Test content 2",
        links: [{ type: "aliyun", url: "https://alipan.com/test2", password: "" }],
      },
    ];
  }
}

describe("BaseAsyncPlugin", () => {
  it("应该正确返回插件名称和优先级", () => {
    const plugin = new TestPlugin1();
    expect(plugin.name()).toBe("test1");
    expect(plugin.priority()).toBe(3);
  });

  it("应该正确设置缓存键和关键词", () => {
    const plugin = new TestPlugin1();
    plugin.setMainCacheKey("cache-key");
    plugin.setCurrentKeyword("test-keyword");
    expect(plugin["mainCacheKey"]).toBe("cache-key");
    expect(plugin["currentKeyword"]).toBe("test-keyword");
  });

  it("默认应该不跳过服务过滤", () => {
    const plugin = new TestPlugin1();
    expect(plugin.skipServiceFilter()).toBe(false);
  });

  it("默认搜索应该返回空数组", async () => {
    const basePlugin = new BaseAsyncPlugin("base", 1);
    await expect(basePlugin.search("test")).resolves.toEqual([]);
  });
});

describe("PluginManager", () => {
  let manager: PluginManager;

  beforeEach(() => {
    manager = new PluginManager();
  });

  it("应该正确注册插件", () => {
    const plugin = new TestPlugin1();
    manager.registerPlugin(plugin);
    const plugins = manager.getPlugins();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name()).toBe("test1");
  });

  it("应该返回所有已注册插件", () => {
    const plugin1 = new TestPlugin1();
    const plugin2 = new TestPlugin2();
    manager.registerPlugin(plugin1);
    manager.registerPlugin(plugin2);
    const plugins = manager.getPlugins();
    expect(plugins).toHaveLength(2);
  });

  it("应该支持注册全局插件", () => {
    // 清除之前的全局注册
    const globalPlugins = getRegisteredPlugins();
    globalPlugins.forEach(() => {
      // 注意：无法直接清除全局注册表，这里测试注册功能
    });

    const plugin = new TestPlugin1();
    registerGlobalPlugin(plugin);

    const registered = getRegisteredPlugins();
    expect(registered.some((p) => p.name() === "test1")).toBe(true);
  });

  it("应该支持批量注册全局插件", () => {
    const plugin1 = new TestPlugin1();
    const plugin2 = new TestPlugin2();
    registerGlobalPlugin(plugin1);
    registerGlobalPlugin(plugin2);

    const manager = new PluginManager();
    manager.registerAllGlobalPlugins();
    const plugins = manager.getPlugins();

    expect(plugins.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Global Plugin Registry", () => {
  it("应该防止注册空插件", () => {
    registerGlobalPlugin(null as any);
    registerGlobalPlugin(undefined as any);
    // 不应该抛出错误
  });

  it("应该防止注册无名称的插件", () => {
    const invalidPlugin = {
      name: () => "",
      priority: () => 1,
      search: async () => [],
      setMainCacheKey: () => {},
      setCurrentKeyword: () => {},
      skipServiceFilter: () => false,
    };
    registerGlobalPlugin(invalidPlugin as any);
    // 不应该抛出错误
  });
});
