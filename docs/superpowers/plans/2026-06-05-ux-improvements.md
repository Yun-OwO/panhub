# UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve user experience with copy feedback, search history, URL sync, better filters, and various polish items.

**Architecture:** Changes are spread across composables, components, and pages. Each task is independent and committable. No new dependencies needed — all changes use existing Vue/Nuxt APIs.

**Tech Stack:** Vue 3, Nuxt 4, Composition API

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `composables/useToast.ts` | Add debounce support |
| Modify | `composables/useSearch.ts` | Copy feedback + URL sync + date format |
| Create | `composables/useSearchHistory.ts` | Search history composable |
| Create | `composables/useDarkMode.ts` | Dark mode state management |
| Modify | `components/SearchBox.vue` | Search history dropdown + Ctrl+K + cleanup |
| Modify | `components/ResultGroup.vue` | Copy animation + date format |
| Modify | `pages/index/index.vue` | URL sync + filters count + empty state + cleanup |
| Modify | `components/SettingsDrawer.vue` | Escape close |
| Modify | `app.vue` | Toast debounce + dark mode toggle |
| Modify | `assets/css/dark-mode.css` | Class-driven (html.dark) |
| Delete | `components/ResultHeader.vue` | Dead code |

---

## Task 1: Toast Debounce

**Files:**
- Modify: `composables/useToast.ts`

- [ ] **Step 1: Add debounce to useToast**

Replace the entire content of `composables/useToast.ts`:

```ts
export interface ToastState {
  show: boolean;
  message: string;
  type: "info" | "success" | "error";
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export function useToast() {
  const toast = useState<ToastState>("toast", () => ({
    show: false,
    message: "",
    type: "info",
  }));

  function showToast(message: string, type: ToastState["type"] = "info") {
    if (hideTimer) clearTimeout(hideTimer);
    toast.value = { show: true, message, type };
    hideTimer = setTimeout(() => {
      toast.value.show = false;
      hideTimer = null;
    }, 2000);
  }

  return { toast: readonly(toast), showToast };
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add composables/useToast.ts
git commit -m "fix: debounce toast notifications to prevent spam"
```

---

## Task 2: Copy Link Feedback

**Files:**
- Modify: `components/ResultGroup.vue` (copy button + formatDate)
- Modify: `composables/useSearch.ts` (copyLink returns success)

- [ ] **Step 1: Update copyLink in useSearch.ts to return success**

Read `composables/useSearch.ts` and find the `copyLink` function. Replace it:

```ts
// 复制链接
async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Update ResultGroup copy button with feedback animation**

Read `components/ResultGroup.vue`. Find the copy button section and replace it:

Replace the copy button template (the `<button class="copy-btn" ...>` block):

```html
          <button
            class="copy-btn"
            :class="{ 'copy-btn--copied': copiedUrl === r.url }"
            @click.prevent="handleCopy(r.url)"
            :title="copiedUrl === r.url ? '已复制' : '复制链接'">
            <svg v-if="copiedUrl !== r.url" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            {{ copiedUrl === r.url ? '已复制' : '复制' }}
          </button>
```

Add `copiedUrl` ref and `handleCopy` function in the `<script setup>`:

```ts
const copiedUrl = ref("");
let copyTimer: ReturnType<typeof setTimeout> | null = null;

async function handleCopy(url: string) {
  const emit = getEmit();
  emit("copy", url);
  copiedUrl.value = url;
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => { copiedUrl.value = ""; }, 1500);
}
```

Note: ResultGroup uses `defineEmits`. Check the existing emit pattern and use the same approach. The `copy` event is already emitted — the parent handles it. We just need to add local visual feedback.

Add a CSS class for the copied state:

```css
.copy-btn--copied {
  color: var(--success);
  border-color: var(--success);
}
```

- [ ] **Step 3: Update formatDate to relative time**

Replace the `formatDate` function in `ResultGroup.vue`:

```ts
function formatDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const now = Date.now();
  const diff = now - dt.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days}天前`;
  if (days < 365) return `${Math.floor(days / 30)}个月前`;
  return dt.toLocaleDateString("zh-CN");
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add composables/useSearch.ts components/ResultGroup.vue
git commit -m "feat: add copy feedback animation and relative date format"
```

---

## Task 3: Search History

**Files:**
- Create: `composables/useSearchHistory.ts`
- Modify: `components/SearchBox.vue`

- [ ] **Step 1: Create search history composable**

Create `composables/useSearchHistory.ts`:

```ts
const STORAGE_KEY = "panhub:search-history";
const MAX_HISTORY = 20;

export function useSearchHistory() {
  const history = useState<string[]>("search-history", () => []);

  function loadHistory() {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) history.value = JSON.parse(raw);
    } catch {}
  }

  function addHistory(term: string) {
    const t = term.trim();
    if (!t) return;
    history.value = [t, ...history.value.filter((h) => h !== t)].slice(0, MAX_HISTORY);
    saveHistory();
  }

  function removeHistory(term: string) {
    history.value = history.value.filter((h) => h !== term);
    saveHistory();
  }

  function saveHistory() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value));
    } catch {}
  }

  return { history: readonly(history), loadHistory, addHistory, removeHistory };
}
```

- [ ] **Step 2: Add search history dropdown to SearchBox**

Read `components/SearchBox.vue`. Add the history dropdown after the search input.

In `<script setup>`, add:

```ts
import { useSearchHistory } from "~/composables/useSearchHistory";
const { history, loadHistory, addHistory } = useSearchHistory();
const showHistory = ref(false);

onMounted(() => {
  loadHistory();
});

function onSelectHistory(term: string) {
  showHistory.value = false;
  emit("update:modelValue", term);
  emit("search");
}
```

In the template, add a dropdown below the search input wrapper. Find the closing `</div>` of the search input container and add after it:

```html
    <!-- 搜索历史 -->
    <div v-if="showHistory && !loading && history.length > 0 && !modelValue" class="search-history">
      <div class="search-history__title">最近搜索</div>
      <div
        v-for="term in history.slice(0, 5)"
        :key="term"
        class="search-history__item"
        @mousedown.prevent="onSelectHistory(term)">
        <span class="search-history__term">{{ term }}</span>
        <span class="search-history__remove" @mousedown.prevent.stop="removeHistory(term)">×</span>
      </div>
    </div>
```

Add `@focus="showHistory = true"` and `@blur="setTimeout(() => showHistory = false, 200)"` to the input element.

Also call `addHistory(keyword)` in the parent when search executes — this should be done in `pages/index/index.vue` in the `doSearch` function:

```ts
const { addHistory } = useSearchHistory();
// In doSearch():
addHistory(keyword);
```

Add CSS for the history dropdown:

```css
.search-history {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 10;
  padding: 8px 0;
  margin-top: 4px;
}
.search-history__title {
  font-size: 11px;
  color: var(--text-tertiary);
  padding: 4px 16px 8px;
  font-weight: 600;
}
.search-history__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
}
.search-history__item:hover {
  background: var(--bg-hover);
}
.search-history__remove {
  color: var(--text-tertiary);
  font-size: 16px;
  padding: 0 4px;
}
.search-history__remove:hover {
  color: var(--error);
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add composables/useSearchHistory.ts components/SearchBox.vue pages/index/index.vue
git commit -m "feat: add search history with dropdown suggestions"
```

---

## Task 4: URL Sync

**Files:**
- Modify: `pages/index/index.vue`

- [ ] **Step 1: Read ?q= on mount and sync URL on search**

In `pages/index/index.vue` `<script setup>`, add route import and read query:

```ts
const route = useRoute();
const router = useRouter();
```

In `onMounted`, after `loadSettings()`, add:

```ts
// 从 URL 读取搜索关键词
const q = route.query.q;
if (q && typeof q === "string") {
  kw.value = q;
  await doSearch();
}
```

In the `doSearch` function, after `recordHotSearch(keyword)`, add URL sync:

```ts
// 同步搜索词到 URL
if (router) {
  router.replace({ query: { q: keyword } });
}
```

In `fullReset`, add URL cleanup:

```ts
// 清除 URL 参数
if (router) {
  router.replace({ query: {} });
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add pages/index/index.vue
git commit -m "feat: sync search keyword to URL query parameter"
```

---

## Task 5: Filter Pill Result Counts

**Files:**
- Modify: `pages/index/index.vue`

- [ ] **Step 1: Show result counts in platform filter pills**

Read `pages/index/index.vue`. Find the platform filter section and update the pill text:

Replace:
```html
{{ platformName(p) }}
```

With:
```html
{{ platformName(p) }} ({{ searchState.merged[p]?.length || 0 }})
```

Also update the "全部" pill to show total:
```html
全部 ({{ searchState.total }})
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add pages/index/index.vue
git commit -m "feat: show result counts in platform filter pills"
```

---

## Task 6: Escape Close Settings + Empty State

**Files:**
- Modify: `components/SettingsDrawer.vue`
- Modify: `pages/index/index.vue`

- [ ] **Step 1: Add Escape key handler to SettingsDrawer**

Read `components/SettingsDrawer.vue`. Add a keyboard listener. In `<script setup>`, add:

```ts
function onKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape" && props.open) {
    emitSave();
    emit("update:open", false);
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeyDown);
});
```

- [ ] **Step 2: Add hot search recommendations to empty state**

Read `pages/index/index.vue`. Find the empty state section (around line 114). Replace it:

```html
<section v-else-if="searched && !searchState.loading && !searchState.deepLoading && !searchState.paused" class="empty-state">
  <div class="empty-card">
    <div class="empty-icon">🔍</div>
    <h3>未找到相关资源</h3>
    <p>试试其他关键词，或检查设置中的搜索来源是否已启用</p>
    <div v-if="hotTerms.length > 0" class="empty-suggestions">
      <span class="empty-suggestions__label">大家都在搜：</span>
      <button
        v-for="term in hotTerms.slice(0, 5)"
        :key="term"
        class="empty-suggestions__tag"
        @click="quickSearch(term)">
        {{ term }}
      </button>
    </div>
  </div>
</section>
```

Add `hotTerms` computed:

```ts
const hotTerms = computed(() => {
  // 从 useSearchHistory 或 hot search API 获取热门词
  // 这里简单用最近搜索历史作为推荐
  return [];
});
```

Actually, better to fetch from the hot search API. Add:

```ts
const hotTerms = ref<string[]>([]);

onMounted(async () => {
  try {
    const res = await fetch("/api/hot-searches?limit=5");
    const data = await res.json();
    if (data.code === 0) {
      hotTerms.value = data.data.hotSearches.map((s: any) => s.term);
    }
  } catch {}
});
```

Add CSS for the suggestions:

```css
.empty-suggestions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  justify-content: center;
}
.empty-suggestions__label {
  font-size: 13px;
  color: var(--text-tertiary);
}
.empty-suggestions__tag {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.empty-suggestions__tag:hover {
  border-color: var(--primary);
  color: var(--primary);
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add components/SettingsDrawer.vue pages/index/index.vue
git commit -m "feat: Escape key closes settings + hot search suggestions in empty state"
```

---

## Task 7: Dark Mode Toggle

**Files:**
- Create: `composables/useDarkMode.ts`
- Modify: `assets/css/dark-mode.css`
- Modify: `app.vue`

- [ ] **Step 1: Create dark mode composable**

Create `composables/useDarkMode.ts`:

```ts
export function useDarkMode() {
  const isDark = useState("dark-mode", () => false);

  function applyTheme(dark: boolean) {
    if (import.meta.client) {
      document.documentElement.classList.toggle("dark", dark);
    }
  }

  function toggle() {
    isDark.value = !isDark.value;
    localStorage.setItem("panhub:dark-mode", isDark.value ? "dark" : "light");
    applyTheme(isDark.value);
  }

  function init() {
    if (!import.meta.client) return;
    const saved = localStorage.getItem("panhub:dark-mode");
    if (saved === "dark") {
      isDark.value = true;
    } else if (saved === "light") {
      isDark.value = false;
    } else {
      isDark.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    applyTheme(isDark.value);
  }

  return { isDark: readonly(isDark), toggle, init };
}
```

- [ ] **Step 2: Update dark-mode.css to class-driven**

Read `assets/css/dark-mode.css`. Change the first line from:

```css
@media (prefers-color-scheme: dark) {
```

To:

```css
html.dark {
```

And remove the closing `}` at the very end of the `@media` block (the last `}` in the file that closes the media query).

- [ ] **Step 3: Add blocking script in app.vue head**

In `app.vue`, update the `useHead` block to add a blocking script that sets the class before paint:

```ts
useHead({
  style: [{ innerHTML: darkModeCss }],
  script: [
    {
      innerHTML: `(function(){var s=localStorage.getItem('panhub:dark-mode');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')})();`,
    },
  ],
});
```

- [ ] **Step 4: Add toggle button to header**

In `app.vue` `<script setup>`, add:

```ts
const { isDark, toggle: toggleDark, init: initDarkMode } = useDarkMode();

onMounted(() => {
  initDarkMode();
  loadSettings();
  auth.fetchStatus();
});
```

In the header `nav-actions`, add a toggle button BEFORE the GitHub link:

```html
<!-- 暗色模式切换 -->
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
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add composables/useDarkMode.ts assets/css/dark-mode.css app.vue
git commit -m "feat: add manual dark mode toggle with localStorage persistence"
```

---

## Task 8: Ctrl+K Shortcut + Code Cleanup

**Files:**
- Modify: `components/SearchBox.vue`
- Modify: `pages/index/index.vue`
- Delete: `components/ResultHeader.vue`

- [ ] **Step 1: Add Ctrl+K shortcut to SearchBox**

In `components/SearchBox.vue`, add in `<script setup>`:

```ts
function onKeyDownGlobal(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    inputEl.value?.focus();
    inputEl.value?.select();
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeyDownGlobal);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeyDownGlobal);
});
```

- [ ] **Step 2: Remove dead touch handlers from SearchBox**

In `components/SearchBox.vue`, delete:
- `touchStartTime` ref
- `handleTouchStart` function
- `handleTouchEnd` function
- `@touchstart="handleTouchStart"` from the input
- `@touchend="handleTouchEnd"` from the input

- [ ] **Step 3: Remove artificial delay in pages/index/index.vue**

In `pages/index/index.vue`, find:

```ts
onMounted(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (doubanHotRef.value) await doubanHotRef.value.init();
  if (hotSearchRef.value) await hotSearchRef.value.init();
});
```

Replace with:

```ts
onMounted(async () => {
  await nextTick();
  if (doubanHotRef.value) await doubanHotRef.value.init();
  if (hotSearchRef.value) await hotSearchRef.value.init();
});
```

- [ ] **Step 4: Delete unused ResultHeader.vue**

```bash
rm components/ResultHeader.vue
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Ctrl+K shortcut + cleanup dead code and unused handlers"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Visual verification**

Run: `pnpm dev`, verify:
- Copy button shows ✓ animation after click
- Search history appears below search box
- URL updates when searching (?q=xxx)
- Filter pills show result counts
- Escape closes settings drawer
- Empty state shows hot search recommendations
- Dark mode toggle works (sun/moon icon)
- Ctrl+K focuses search box
