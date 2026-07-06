<template>
  <div class="layout">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <!-- 顶部导航 -->
    <header class="header">
      <nav class="nav">
        <NuxtLink to="/" class="brand">
          <span class="brand-icon">🔍</span>
          <span class="brand-text">PanHub</span>
        </NuxtLink>

        <!-- 移动端菜单按钮 -->
        <button class="btn-icon nav-menu-btn" type="button" @click="showNavMenu = !showNavMenu" aria-label="导航菜单" title="导航菜单">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <!-- 桌面端导航链接 -->
        <div class="nav-links">
          <a
            v-for="link in navLinks"
            :key="link.name"
            :href="link.isCurrent ? undefined : link.url"
            :class="['nav-link', { active: link.isCurrent }]"
            :target="link.isCurrent ? undefined : '_blank'"
            :rel="link.isCurrent ? undefined : 'noopener noreferrer'">
            {{ link.name }}
          </a>
        </div>

        <div class="nav-actions">
          <!-- 暗色模式切换 -->
          <ClientOnly>
            <button class="btn-icon" type="button" @click="toggleDark" :aria-label="isDark ? '切换到亮色模式' : '切换到暗色模式'" :title="isDark ? '亮色模式' : '暗色模式'">
              <svg v-if="!isDark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            </button>
          </ClientOnly>
          <!-- 设置按钮 -->
          <button class="btn-icon" type="button" @click="openSettings = true" aria-label="打开设置" title="设置">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>

        <!-- 移动端下拉菜单 -->
        <ClientOnly>
          <Transition name="nav-menu">
            <div v-if="showNavMenu" class="nav-dropdown">
              <a
                v-for="link in navLinks"
                :key="link.name"
                :href="link.isCurrent ? undefined : link.url"
                :class="['nav-dropdown__link', { active: link.isCurrent }]"
                :target="link.isCurrent ? undefined : '_blank'"
                :rel="link.isCurrent ? undefined : 'noopener noreferrer'"
                @click="showNavMenu = false">
                {{ link.name }}
              </a>
            </div>
          </Transition>
        </ClientOnly>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main">
      <NuxtPage />
    </main>

    <!-- 设置抽屉 -->
    <ClientOnly>
      <SettingsDrawer
        v-model="settings"
        v-model:open="openSettings"
        :all-plugins="ALL_PLUGIN_NAMES"
        :all-tg-channels="allTgChannels"
        @save="saveSettings"
        @reset-default="resetToDefault" />
    </ClientOnly>

    <!-- Toast 通知 -->
    <div v-if="toast.show" class="toast" :class="toast.type" role="status" aria-live="polite">
      {{ toast.message }}
    </div>

  </div>
</template>

<script setup lang="ts">
import { ALL_PLUGIN_NAMES } from "./config/plugins";
import channelsConfig from "~/config/channels.json";
// 暗色模式：阻塞脚本设置 class + CSS 文件引入
useHead({
  link: [{ rel: "stylesheet", href: "/css/dark-mode.css" }],
  script: [
    {
      innerHTML: `(function(){var s=localStorage.getItem('panhub:dark-mode');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')})();`,
    },
  ],
});

const { settings, loadSettings, saveSettings, resetToDefault } = useSettings();
const { toast, showToast } = useToast();
const { isDark, toggle: toggleDark, init: initDarkMode } = useDarkMode();
const openSettings = ref(false);
const showNavMenu = ref(false);

// 导航链接
const navLinks = [
  { name: "Alist", url: "https://alist.shenzjd.com" },
  { name: "视频解析", url: "https://parse.shenzjd.com" },
  { name: "热点聚合", url: "https://newshub.shenzjd.com" },
  { name: "个人导航", url: "https://navhub.shenzjd.com" },
  { name: "必应壁纸", url: "https://bing.shenzjd.com" },
];

// 搜索相关的 provide 保留
provide("requestUnlock", () => {});

// 所有可用的 TG 频道（用于设置面板）
const allTgChannels = computed(() => {
  const configChannels = (useRuntimeConfig().public as any)?.tgDefaultChannels;
  return Array.isArray(configChannels) && configChannels.length > 0
    ? configChannels
    : channelsConfig.defaultChannels;
});

// 监听设置保存事件，显示提示
watch(() => settings.value, (newVal, oldVal) => {
  if (oldVal && newVal && JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
    showToast("设置已保存", "success");
  }
}, { deep: true });

onMounted(() => {
  initDarkMode();
  loadSettings();
  document.addEventListener("click", onDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
});

function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (showNavMenu.value && !target.closest(".nav-menu-btn") && !target.closest(".nav-dropdown")) {
    showNavMenu.value = false;
  }
}
</script>

<style>
@import '~/assets/css/global.css';
</style>

<style scoped>
/* 主布局 */
.layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
}

/* 背景装饰 - 玻璃拟态效果 */
.bg-decoration {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);
  opacity: 0.28;
  will-change: transform;
  animation: blobFloat 10s ease-in-out infinite;
}

.blob-1 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  top: -100px;
  left: -100px;
  animation-delay: 0s;
}

.blob-2 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #f59e0b, #fb7185);
  bottom: -50px;
  right: -50px;
  animation-delay: 2s;
}

.blob-3 {
  width: 250px;
  height: 250px;
  background: linear-gradient(135deg, #0ea5e9, #14b8a6);
  top: 50%;
  left: 70%;
  animation-delay: 4s;
}

/* 顶部导航 - 玻璃拟态 */
.header {
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-glass);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.nav {
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

/* 品牌标识 */
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 700;
  font-size: 20px;
  transition: transform var(--transition-fast);
}

.brand:hover {
  transform: translateY(-1px);
}

.brand-icon {
  font-size: 24px;
  filter: drop-shadow(0 2px 4px rgba(15, 118, 110, 0.3));
}

.brand-text {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 导航操作区 */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 图标按钮 */
.btn-icon {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--bg-btn);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  transition: all var(--transition-fast);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-glass);
}

.btn-icon:hover {
  background: var(--bg-btn-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-icon:active {
  transform: translateY(0);
}

.btn-icon svg {
  stroke: currentColor;
}

/* 导航链接（桌面端） */
.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: center;
}

.nav-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast), background var(--transition-fast);
  white-space: nowrap;
}

.nav-link:hover {
  color: var(--primary);
  background: var(--bg-hover);
}

.nav-link.active {
  color: var(--primary);
  font-weight: 700;
  background: rgba(15, 118, 110, 0.08);
}

/* 移动端菜单按钮（桌面隐藏） */
.nav-menu-btn {
  display: none;
}

/* 移动端下拉菜单 */
.nav-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-glass-strong);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-glass);
  box-shadow: var(--shadow-lg);
  padding: 12px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  z-index: 99;
  transform-origin: top;
}

.nav-dropdown__link {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast), background var(--transition-fast);
  width: calc(50% - 4px);
}

.nav-dropdown__link:hover {
  color: var(--primary);
  background: var(--bg-hover);
}

.nav-dropdown__link.active {
  color: var(--primary);
  font-weight: 700;
  background: rgba(15, 118, 110, 0.08);
}

/* 下拉菜单动画 */
.nav-menu-enter-active {
  transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-menu-leave-active {
  transition: opacity 0.18s ease,
              transform 0.18s ease;
}

.nav-menu-enter-from,
.nav-menu-leave-to {
  opacity: 0;
  transform: scaleY(0.92) translateY(-4px);
}

/* 主内容区 */
.main {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
  animation: fadeIn 0.5s ease;
}

/* Toast 通知 */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border-light);
  font-weight: 500;
  z-index: 1000;
  animation: toastSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.toast::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.toast.info {
  color: var(--primary);
  border-left: 4px solid var(--primary);
}

.toast.success {
  color: var(--success);
  border-left: 4px solid var(--success);
}

.toast.error {
  color: var(--error);
  border-left: 4px solid var(--error);
}

/* 移动端优化 */
@media (max-width: 900px) {
  .nav {
    padding: 12px 16px;
  }

  .nav-links {
    display: none;
  }

  .nav-menu-btn {
    display: flex;
  }

  .nav-actions {
    gap: 6px;
  }

  .btn-icon {
    width: 36px;
    height: 36px;
  }

  .main {
    padding: 16px;
  }

  .brand {
    font-size: 18px;
  }

  .toast {
    right: 16px;
    left: 16px;
    bottom: 16px;
  }

  .blob {
    filter: blur(40px);
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .btn-icon {
    border-width: 2px;
  }

  .brand-text {
    -webkit-text-fill-color: var(--text-primary);
    color: var(--text-primary);
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .blob {
    animation: none;
  }
}

/* 关键帧动画 */
@keyframes blobFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(20px, -16px) scale(1.04); }
  66% { transform: translate(-14px, 12px) scale(0.97); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes toastSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
