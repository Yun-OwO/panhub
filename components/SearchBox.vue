<template>
  <section class="search">
    <div class="search-container">
      <div class="search-box" data-theme-part="search-box" :class="{ focused: isFocused, loading: loading }">
        <div class="search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>

        <input
          ref="inputEl"
          :value="modelValue"
          :placeholder="placeholder"
          name="kw"
          aria-label="搜索关键词"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          class="search-input"
          @input="
            $emit('update:modelValue', ($event.target as HTMLInputElement).value)
          "
          @focus="isFocused = true"
          @blur="isFocused = false"
          @keyup.enter="handleSearch" />

        <div class="search-actions">
          <!-- 重置按钮 - 搜索后显示 -->
          <button
            v-if="searched"
            class="action-btn reset"
            type="button"
            @click="
              $emit('update:modelValue', '');
              $emit('reset');
            "

            aria-label="重置搜索"
            title="重置搜索">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
            <span class="btn-text">重置</span>
          </button>

          <!-- 清空按钮 - 未搜索时显示 -->
          <button
            v-else-if="modelValue && !loading"
            class="action-btn ghost"
            type="button"
            @click="
              $emit('update:modelValue', '');
              $emit('reset');
            "

            aria-label="清空关键词"
            title="清空">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <!-- 暂停按钮 -->
          <button
            v-if="loading && !paused"
            class="action-btn pause"
            type="button"
            @click="$emit('pause')"

            aria-label="暂停搜索"
            title="暂停搜索">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="4" width="4" height="16" rx="1"></rect>
              <rect x="14" y="4" width="4" height="16" rx="1"></rect>
            </svg>
            <span class="btn-text">暂停</span>
          </button>

          <!-- 继续按钮 -->
          <button
            v-if="loading && paused"
            class="action-btn resume"
            type="button"
            @click="$emit('continue')"

            aria-label="继续搜索"
            title="继续搜索">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 3l14 9-14 9V3z"></path>
            </svg>
            <span class="btn-text">继续</span>
          </button>

          <!-- 加载动画 -->
          <div v-if="loading && !paused" class="loading-spinner"></div>

          <!-- 搜索按钮 -->
          <button
            v-else-if="!loading"
            class="action-btn primary"
            type="button"
            :disabled="!modelValue"
            aria-label="开始搜索"
            @click="handleSearch">
            <span class="btn-text">搜索</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </button>

          <!-- 暂停状态提示 -->
          <div v-if="paused" class="paused-indicator" title="搜索已暂停">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" opacity="0.2"></circle>
              <rect x="8" y="8" width="8" height="8" rx="1"></rect>
            </svg>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
  loading: boolean;
  paused: boolean;
  placeholder: string;
  searched: boolean;
}>();
const emit = defineEmits(["update:modelValue", "search", "reset", "pause", "continue"]);

const isFocused = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);

// 处理搜索按钮点击
function handleSearch() {
  // iOS Safari兼容性：确保输入框失去焦点
  if (
    typeof window !== "undefined" &&
    document.activeElement instanceof HTMLInputElement
  ) {
    document.activeElement.blur();
  }

  // 添加小延迟确保焦点处理完成
  setTimeout(() => {
    emit("search");
  }, 50);
}

function onKeyDownGlobal(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    inputEl.value?.focus();
    inputEl.value?.select();
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeyDownGlobal);
  // 仅在桌面端自动聚焦，避免移动端抢焦点和键盘闪烁
  if (window.matchMedia("(pointer: fine)").matches) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        inputEl.value?.focus();
      }, 100);
    });
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeyDownGlobal);
});
</script>

<style scoped>
.search {
  width: 100%;
}

.search-container {
  width: 100%;
}

/* 搜索框主体 - 玻璃拟态设计 */
.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-glass);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--border-medium);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  transition: border-color var(--transition-normal), box-shadow var(--transition-normal),
    transform var(--transition-normal);
  position: relative;
}

.search-box.focused {
  border-color: var(--primary);
  box-shadow: 0 4px 16px rgba(15, 118, 110, 0.1);
  transform: translateY(-1px);
}

.search-box.loading {
  border-color: var(--primary);
  animation: searchPulse 2.2s ease-in-out infinite;
}

@keyframes searchPulse {
  0%, 100% { border-color: var(--primary); opacity: 1; }
  50% { border-color: var(--secondary); opacity: 0.8; }
}

/* 搜索图标 */
.search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  transition: color var(--transition-fast);
  flex-shrink: 0;
}

.search-box.focused .search-icon {
  color: var(--primary);
}

.search-icon svg {
  stroke: currentColor;
}

/* 搜索输入框 */
.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  min-width: 0; /* 允许收缩 */

  /* iOS Safari兼容性 */
  -webkit-appearance: none;
  -webkit-border-radius: 0;
  border-radius: 0;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}

.search-input::placeholder {
  color: var(--text-tertiary);
  font-weight: 400;
}


/* 操作按钮区域 */
.search-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 通用按钮样式 */
.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast),
    border-color var(--transition-fast), transform var(--transition-fast),
    box-shadow var(--transition-fast);
  white-space: nowrap;

  /* iOS Safari兼容性 */
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* 主要按钮 - 纯色背景 */
.action-btn.primary {
  background: var(--primary);
  color: white;
  box-shadow: 0 2px 8px rgba(15, 118, 110, 0.18);
}

.action-btn.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.24);
}

.action-btn.primary:active:not(:disabled) {
  transform: translateY(0);
}

/* 幽灵按钮 - 透明背景 */
.action-btn.ghost {
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-light);
  padding: 8px;
}

.action-btn.ghost:hover {
  background: var(--bg-primary);
  border-color: var(--border-medium);
  color: var(--text-primary);
}

.action-btn.ghost:active {
  background: var(--border-light);
}

/* 暂停按钮 - 黄色警告样式 */
.action-btn.pause {
  background: #f59e0b;
  color: white;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.18);
}

.action-btn.pause:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.24);
}

.action-btn.pause:active:not(:disabled) {
  transform: translateY(0);
}

/* 继续按钮 - 绿色成功样式 */
.action-btn.resume {
  background: var(--success);
  color: white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.18);
}

.action-btn.resume:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.24);
}

.action-btn.resume:active:not(:disabled) {
  transform: translateY(0);
}

/* 重置按钮 - 红色样式 */
.action-btn.reset {
  background: var(--error);
  color: white;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.18);
}

.action-btn.reset:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.24);
}

.action-btn.reset:active:not(:disabled) {
  transform: translateY(0);
}

/* 暂停状态指示器 */
.paused-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #f59e0b;
  flex-shrink: 0;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

/* 按钮图标 */
.action-btn svg {
  stroke: currentColor;
  flex-shrink: 0;
}

.btn-text {
  display: inline-block;
}

/* 加载动画 */
.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 移动端优化 */
@media (max-width: 640px) {
  .search-box {
    padding: 10px 12px;
    gap: 8px;
  }

  .search-icon {
    display: none; /* 在移动端隐藏图标，节省空间 */
  }

  .search-input {
    font-size: 15px;
  }

  .search-actions {
    gap: 6px; /* 减小间距以确保按钮居中 */
  }

  .action-btn {
    padding: 8px 10px;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-btn.primary .btn-text,
  .action-btn.pause .btn-text,
  .action-btn.resume .btn-text,
  .action-btn.reset .btn-text {
    display: none; /* 在小屏幕上只显示图标 */
  }

  .action-btn.ghost {
    padding: 6px;
  }

  .action-btn.pause,
  .action-btn.resume,
  .action-btn.reset {
    padding: 8px;
  }

  .loading-spinner {
    width: 18px;
    height: 18px;
  }

  .paused-indicator {
    width: 28px;
    height: 28px;
  }
}

/* 超小屏幕优化 */
@media (max-width: 360px) {
  .search-box {
    padding: 8px 10px;
  }

  .action-btn {
    padding: 6px 8px;
    font-size: 12px;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .search-box {
    border-width: 3px;
  }

  .action-btn.primary {
    border: 2px solid white;
  }

  .action-btn.ghost {
    border-width: 2px;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .search-box,
  .action-btn {
    transition: none;
  }

  .search-box.loading {
    animation: none;
  }

  .loading-spinner {
    animation: none;
    opacity: 0.7;
  }

  .action-btn.primary:hover:not(:disabled),
  .action-btn.primary:active:not(:disabled) {
    transform: none;
  }
}

/* iOS Safari特定优化 */
@supports (-webkit-touch-callout: none) {
  .search-box {
    /* iOS Safari兼容性：防止缩放 */
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
  }

  .search-input {
    /* iOS Safari兼容性：确保输入框正常工作 */
    -webkit-appearance: none;
    -webkit-border-radius: 0;
    border-radius: 0;
  }

  .action-btn {
    /* iOS Safari兼容性：确保触摸区域足够大 */
    min-height: 44px;
    min-width: 44px;
    -webkit-appearance: none;
  }
}
</style>
