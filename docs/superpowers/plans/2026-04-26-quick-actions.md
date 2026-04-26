# Quick Actions: Clear Clipboard & Fullscreen Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two icon buttons to the Header: clear system clipboard (with toast feedback) and toggle browser fullscreen (with icon state sync).

**Architecture:** New `hooks/use-fullscreen.ts` wraps the Fullscreen API (request/exit + change listener). Header gains two icon buttons after the language switcher, styled identically to existing action buttons. Both buttons conditionally render based on browser capability. Clipboard clear reuses the existing `clearedClipboard` i18n key for toast success.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, next-intl 4, lucide-react (ClipboardX, Maximize, Minimize).

---

## Project conventions you must follow

**Read these before writing a single line** — breaking them will cause lint/build to fail or runtime to malfunction:

1. **React Compiler is enabled.** Never write `useMemo`, `useCallback`, or `React.memo` manually.
2. **No external UI libs beyond `@headlessui/react`.** Use `components/ui/*` and raw Tailwind utilities.
3. **Theme.** Global theme via `libs/theme.tsx` + `.dark` class on `<html>`. Tool pages never render their own theme switch.
4. **i18n.** Message files at `public/locales/{locale}/common.json`. Header uses `useTranslations("common")`. Namespaces in `i18n/request.ts` — `common` is already listed.
5. **Paths.** Use project-root-relative form (e.g. `../../components/ui/button`, `../../libs/toast`). No `@/…` aliases.
6. **Comments in English.** Per `AGENTS.md`.
7. **Commits.** Conventional Commits. Always use `rtk git …` per user rules.
8. **No test framework.** Verification is `rtk npx tsc --noEmit` + `rtk npx next lint` + manual browser check via `rtk npm run dev`.
9. **CSS classes use existing Tailwind 4 tokens** from `app/globals.css` (`bg-bg-surface`, `text-fg-secondary`, `accent-cyan`, etc.).
10. **Existing animation classes** in `globals.css`: `nav-btn-bounce`, `nav-btn-spin`, `nav-btn-flip`.

---

## Design decisions pinned by this plan

| Decision                               | Value                                                             | Rationale                                                                                |
| -------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Hook file                              | `hooks/use-fullscreen.ts`                                         | Follows existing `hooks/use-is-mobile.ts` pattern                                        |
| Clipboard cleared toast key            | Reuse `clearedClipboard` (already in all 3 locales)               | Avoid redundant keys. en="Cleared clipboard", zh-CN="剪贴板已清空", zh-TW="已清除剪貼簿" |
| Clipboard failed toast key             | New `clipboardClearFailed`                                        | No existing key matches the semantics                                                    |
| Fullscreen button icon                 | `Maximize` ↔ `Minimize` from lucide-react                         | Confirmed during design                                                                  |
| Clear Clipboard button icon            | `ClipboardX` from lucide-react                                    | Confirmed during design                                                                  |
| Click animation                        | `nav-btn-bounce` (already defined in globals.css)                 | Matches existing pattern                                                                 |
| Header button order                    | After language switcher, before nothing (last)                    | `[Tools▼] [☀] [🌐] [🗑] [⛶]`                                                             |
| Button visibility check for Clipboard  | `typeof navigator !== "undefined" && !!navigator.clipboard`       | SSR-safe + capability check                                                              |
| Button visibility check for Fullscreen | `typeof document !== "undefined" && !!document.fullscreenEnabled` | SSR-safe + capability check                                                              |
| SSR guard for hooks                    | All `document`/`navigator` access in `useEffect`                  | Matches `use-is-mobile.ts` pattern                                                       |
| Toast import path                      | `../../libs/toast`                                                | Same as existing pages                                                                   |

---

## File structure

| File                               | Action     | Responsibility                                                                           |
| ---------------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| `hooks/use-fullscreen.ts`          | **Create** | Fullscreen API wrapper: `isFullscreen`, `toggle`, `isSupported`                          |
| `components/header.tsx`            | Modify     | Add clear clipboard + fullscreen buttons                                                 |
| `public/locales/en/common.json`    | Modify     | Add `nav.clearClipboard`, `nav.fullscreen`, `nav.exitFullscreen`, `clipboardClearFailed` |
| `public/locales/zh-CN/common.json` | Modify     | Same keys, Chinese values                                                                |
| `public/locales/zh-TW/common.json` | Modify     | Same keys, Traditional Chinese values                                                    |

No changes to `i18n/request.ts` — `common` namespace already listed.

---

### Task 1: Create `useFullscreen` hook

**Files:**

- Create: `hooks/use-fullscreen.ts`

- [ ] **Step 1: Write the hook**

```typescript
// hooks/use-fullscreen.ts
"use client";

import { useState, useEffect } from "react";

interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggle: () => void;
  isSupported: boolean;
}

export function useFullscreen(): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(!!document.fullscreenEnabled);
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  return { isFullscreen, toggle, isSupported };
}
```

- [ ] **Step 2: Verify type-check**

Run: `rtk npx tsc --noEmit`
Expected: PASS (no errors related to the new file)

- [ ] **Step 3: Commit**

```bash
rtk git add hooks/use-fullscreen.ts
rtk git commit -m "feat(core): add useFullscreen hook wrapping Fullscreen API"
```

---

### Task 2: Add i18n keys

**Files:**

- Modify: `public/locales/en/common.json`
- Modify: `public/locales/zh-CN/common.json`
- Modify: `public/locales/zh-TW/common.json`

- [ ] **Step 1: Add keys to en/common.json**

Add inside the `"nav"` object (after `"tools"` key):

```json
"clearClipboard": "Clear clipboard",
"fullscreen": "Fullscreen",
"exitFullscreen": "Exit fullscreen"
```

Add at root level:

```json
"clipboardClearFailed": "Failed to clear clipboard"
```

The `nav` block after edit:

```json
"nav": {
    "brand": "ByteCraft",
    "search": "Search",
    "searchPlaceholder": "Search",
    "switchToLight": "Switch to light mode",
    "switchToDark": "Switch to dark mode",
    "tools": "Tools",
    "clearClipboard": "Clear clipboard",
    "fullscreen": "Fullscreen",
    "exitFullscreen": "Exit fullscreen"
},
```

Add at the end of root (before closing `}`):

```json
"clipboardClearFailed": "Failed to clear clipboard"
```

> **Note:** `clearedClipboard` ("Cleared clipboard") already exists at root level — reuse it for the success toast.

- [ ] **Step 2: Add keys to zh-CN/common.json**

Same structure, Chinese values:

`nav` additions:

```json
"clearClipboard": "清空剪切板",
"fullscreen": "全屏",
"exitFullscreen": "退出全屏"
```

Root addition:

```json
"clipboardClearFailed": "清空剪切板失败"
```

- [ ] **Step 3: Add keys to zh-TW/common.json**

Same structure, Traditional Chinese values:

`nav` additions:

```json
"clearClipboard": "清空剪貼簿",
"fullscreen": "全螢幕",
"exitFullscreen": "退出全螢幕"
```

Root addition:

```json
"clipboardClearFailed": "清空剪貼簿失敗"
```

- [ ] **Step 4: Verify JSON validity**

Run: `rtk npx tsc --noEmit`
Expected: PASS (Next.js intl will load the JSON; no TS errors)

- [ ] **Step 5: Commit**

```bash
rtk git add public/locales/en/common.json public/locales/zh-CN/common.json public/locales/zh-TW/common.json
rtk git commit -m "feat(i18n): add quick action labels for clear clipboard and fullscreen"
```

---

### Task 3: Add buttons to Header

**Files:**

- Modify: `components/header.tsx`

- [ ] **Step 1: Add imports**

Add new imports at the top of the file:

```typescript
// Add to the lucide-react import line:
import { LayoutGrid, Sun, Moon, ClipboardX, Maximize, Minimize } from "lucide-react";

// Add new import lines:
import { useFullscreen } from "../hooks/use-fullscreen";
import { showToast } from "../libs/toast";
```

- [ ] **Step 2: Add hooks and handlers inside the Header component**

After the existing `useState` declarations (after `const [flipping, setFlipping] = useState(false);`):

```typescript
const fullscreen = useFullscreen();
const [clipAnimating, setClipAnimating] = useState(false);

const isClipboardSupported = typeof navigator !== "undefined" && !!navigator.clipboard;

const handleClearClipboard = async () => {
  setClipAnimating(true);
  try {
    await navigator.clipboard.writeText("");
    showToast(t("clearedClipboard"), "success");
  } catch {
    showToast(t("clipboardClearFailed"), "error");
  }
};
```

- [ ] **Step 3: Add buttons after the language switcher**

After the `</LanguageSwitcher>` closing element and before the closing `</div>` of the action buttons group, add:

```tsx
{
  fullscreen.isSupported && (
    <button
      type="button"
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors`}
      onClick={() => fullscreen.toggle()}
      aria-label={fullscreen.isFullscreen ? t("nav.exitFullscreen") : t("nav.fullscreen")}
    >
      {fullscreen.isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
    </button>
  );
}

{
  isClipboardSupported && (
    <button
      type="button"
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors ${clipAnimating ? "nav-btn-bounce" : ""}`}
      onClick={handleClearClipboard}
      onAnimationEnd={() => setClipAnimating(false)}
      aria-label={t("nav.clearClipboard")}
    >
      <ClipboardX size={16} />
    </button>
  );
}
```

- [ ] **Step 4: Verify build & lint**

```bash
rtk npx tsc --noEmit
rtk npx next lint
```

Expected: PASS both — no errors.

- [ ] **Step 5: Visual verification**

Run `rtk npm run dev` and manually check:

1. Open the site → both buttons visible in Header right side
2. Click Clear Clipboard → bounce animation → toast "Cleared clipboard" appears → paste elsewhere → clipboard empty
3. Click Fullscreen → browser enters fullscreen → icon switches to Minimize
4. Press Esc → exits fullscreen → icon switches back to Maximize

- [ ] **Step 6: Commit**

```bash
rtk git add components/header.tsx
rtk git commit -m "feat(header): add clear clipboard and fullscreen quick action buttons"
```
