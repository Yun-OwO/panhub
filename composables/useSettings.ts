import type { Ref } from "vue";
import {
  ALL_PLUGIN_NAMES,
  DEFAULT_USER_SETTINGS,
  STORAGE_KEYS,
} from "~/config/plugins";
import channelsConfig from "~/config/channels.json";

export interface UserSettings {
  enabledTgChannels: string[];
  enabledPlugins: string[];
  concurrency: number;
  pluginTimeoutMs: number;
}

export interface UseSettingsReturn {
  settings: Ref<UserSettings>;
  loadSettings: () => void;
  saveSettings: () => void;
  resetToDefault: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectAllTg: () => void;
  onClearAllTg: () => void;
}

// 模块级守卫：useSettings() 在多个组件中调用，loadSettings() 只需执行一次
let _settingsInitialized = false;

function getDefaultSettings(defaultTgChannels: string[]): UserSettings {
  return {
    enabledTgChannels: [...defaultTgChannels],
    enabledPlugins: [...DEFAULT_USER_SETTINGS.enabledPlugins],
    concurrency: DEFAULT_USER_SETTINGS.concurrency,
    pluginTimeoutMs: DEFAULT_USER_SETTINGS.pluginTimeoutMs,
  };
}

export function useSettings(): UseSettingsReturn {
  const config = useRuntimeConfig();

  const defaultTgChannels = computed(() => {
    const configChannels = (config.public as any)?.tgDefaultChannels;
    if (Array.isArray(configChannels) && configChannels.length > 0) {
      return configChannels;
    }
    return channelsConfig.defaultChannels;
  });

  // 使用 Nuxt useState 替代模块级单例，SSR 安全
  const settings = useState<UserSettings>("user-settings", () =>
    getDefaultSettings(defaultTgChannels.value)
  );

  function loadSettings(): void {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.settings);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      const validated: UserSettings = {
        enabledTgChannels: Array.isArray(parsed.enabledTgChannels)
          ? parsed.enabledTgChannels.filter((x: unknown) => typeof x === "string")
          : [...(defaultTgChannels.value?.length ? defaultTgChannels.value : channelsConfig.defaultChannels)],
        enabledPlugins: Array.isArray(parsed.enabledPlugins)
          ? parsed.enabledPlugins.filter((x: unknown) => typeof x === "string")
          : [...DEFAULT_USER_SETTINGS.enabledPlugins],
        concurrency:
          typeof parsed.concurrency === "number" && parsed.concurrency > 0
            ? Math.min(16, Math.max(1, parsed.concurrency))
            : DEFAULT_USER_SETTINGS.concurrency,
        pluginTimeoutMs:
          typeof parsed.pluginTimeoutMs === "number" && parsed.pluginTimeoutMs > 0
            ? parsed.pluginTimeoutMs
            : DEFAULT_USER_SETTINGS.pluginTimeoutMs,
      };

      validated.enabledPlugins = validated.enabledPlugins.filter((name) =>
        ALL_PLUGIN_NAMES.includes(name as any)
      );

      if (
        validated.enabledPlugins.length === 0 &&
        validated.enabledTgChannels.length === 0
      ) {
        validated.enabledPlugins = [...DEFAULT_USER_SETTINGS.enabledPlugins];
      }

      settings.value = validated;
    } catch (_error) {
      // Silent failure
    }
  }

  function saveSettings(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings.value));
    } catch (_error) {
      // Silent failure
    }
  }

  function resetToDefault(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(STORAGE_KEYS.settings);
    } catch (_error) {
      // Silent failure
    }

    settings.value = getDefaultSettings(
      defaultTgChannels.value?.length ? defaultTgChannels.value : channelsConfig.defaultChannels
    );

    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  function onSelectAll(): void {
    settings.value.enabledPlugins = [...ALL_PLUGIN_NAMES];
    saveSettings();
  }

  function onClearAll(): void {
    settings.value.enabledPlugins = [];
    saveSettings();
  }

  function onSelectAllTg(): void {
    settings.value.enabledTgChannels = [
      ...(defaultTgChannels.value?.length ? defaultTgChannels.value : channelsConfig.defaultChannels),
    ];
    saveSettings();
  }

  function onClearAllTg(): void {
    settings.value.enabledTgChannels = [];
    saveSettings();
  }

  if (typeof window !== "undefined" && !_settingsInitialized) {
    _settingsInitialized = true;
    loadSettings();
  }

  return {
    settings,
    loadSettings,
    saveSettings,
    resetToDefault,
    onSelectAll,
    onClearAll,
    onSelectAllTg,
    onClearAllTg,
  };
}
