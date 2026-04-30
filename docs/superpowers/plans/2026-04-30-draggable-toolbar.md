# Draggable FloatingToolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the FloatingToolbar draggable in fullscreen mode, with edge snapping and position persistence.

**Architecture:** Custom `useDraggable` hook encapsulates all drag logic (pointer events, viewport constraints, edge snapping, localStorage persistence). The FloatingToolbar consumes the hook via a `bind` spread pattern. Zero new dependencies.

**Tech Stack:** React 19, TypeScript, Pointer Events API, localStorage, Tailwind CSS 4

**Design Spec:** `docs/superpowers/specs/2026-04-30-draggable-toolbar-design.md`

---

## File Structure

| File                              | Action | Responsibility                                                  |
| --------------------------------- | ------ | --------------------------------------------------------------- |
| `libs/storage-keys.ts`            | Modify | Add `floatingToolbarPosition` key                               |
| `hooks/use-draggable.ts`          | Create | Core drag logic: pointer events, constraints, snap, persistence |
| `components/floating-toolbar.tsx` | Modify | Consume `useDraggable` hook, replace static positioning         |

---

### Task 1: Add storage key

**Files:**

- Modify: `libs/storage-keys.ts`

- [ ] **Step 1: Add the new key to `STORAGE_KEYS`**

In `libs/storage-keys.ts`, add `floatingToolbarPosition` to the `STORAGE_KEYS` object:

```ts
export const STORAGE_KEYS = {
  savedPasswords: "okrun:sp",
  diff: "okrun:diff",
  markdown: "okrun:md",
  dbviewerHistory: "okrun:dbviewer:history",
  cron: "okrun:cron",
  qrcode: "okrun:qrcode",
  color: "okrun:color:history",
  floatingToolbarPosition: "okrun:ftp",
} as const;
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `storage-keys.ts`

- [ ] **Step 3: Commit**

```bash
git add libs/storage-keys.ts
git commit -m "feat(toolbar): add floating toolbar position storage key"
```

---

### Task 2: Create `useDraggable` hook

**Files:**

- Create: `hooks/use-draggable.ts`

This is the core task. The hook handles all drag mechanics, edge snapping, viewport constraints, and localStorage persistence.

- [ ] **Step 1: Create the hook file**

Create `hooks/use-draggable.ts` with the following complete implementation:

```ts
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { STORAGE_KEYS } from "../libs/storage-keys";

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  storageKey: keyof typeof STORAGE_KEYS;
  defaultPosition: Position;
}

const DRAG_THRESHOLD = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function constrainToViewport(pos: Position, width: number, height: number): Position {
  const maxX = Math.max(0, window.innerWidth - width);
  const maxY = Math.max(0, window.innerHeight - height);
  return {
    x: clamp(pos.x, 0, maxX),
    y: clamp(pos.y, 0, maxY),
  };
}

function snapToNearestEdge(pos: Position, width: number, height: number): Position {
  const centerX = pos.x + width / 2;
  const centerY = pos.y + height / 2;

  const distLeft = centerX;
  const distRight = window.innerWidth - centerX;
  const distTop = centerY;
  const distBottom = window.innerHeight - centerY;

  const minDist = Math.min(distLeft, distRight, distTop, distBottom);

  const maxX = Math.max(0, window.innerWidth - width);
  const maxY = Math.max(0, window.innerHeight - height);

  if (minDist === distLeft) {
    return { x: 0, y: clamp(pos.y, 0, maxY) };
  }
  if (minDist === distRight) {
    return { x: maxX, y: clamp(pos.y, 0, maxY) };
  }
  if (minDist === distTop) {
    return { x: clamp(pos.x, 0, maxX), y: 0 };
  }
  return { x: clamp(pos.x, 0, maxX), y: maxY };
}

function loadPosition(storageKey: string, defaultPosition: Position): Position {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultPosition;
    const parsed = JSON.parse(raw);
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return parsed;
    }
  } catch {
    // corrupted or unavailable
  }
  return defaultPosition;
}

function savePosition(storageKey: string, pos: Position): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(pos));
  } catch {
    // quota exceeded or unavailable
  }
}

export function useDraggable(options: UseDraggableOptions) {
  const { storageKey, defaultPosition } = options;
  const resolvedKey = STORAGE_KEYS[storageKey];

  const elementRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position>(() => {
    if (typeof window === "undefined") return defaultPosition;
    const saved = loadPosition(resolvedKey, defaultPosition);
    return saved;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);

  const dragState = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
    pointerId: number | null;
  }>({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
    pointerId: null,
  });

  // Re-constrain on resize
  useEffect(() => {
    const handleResize = () => {
      if (!elementRef.current) return;
      const { offsetWidth, offsetHeight } = elementRef.current;
      setPosition((prev) => {
        const constrained = constrainToViewport(prev, offsetWidth, offsetHeight);
        if (constrained.x !== prev.x || constrained.y !== prev.y) {
          savePosition(resolvedKey, constrained);
          return constrained;
        }
        return prev;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resolvedKey]);

  // Constrain initial position on mount once element has dimensions
  useEffect(() => {
    if (!elementRef.current) return;
    const { offsetWidth, offsetHeight } = elementRef.current;
    setPosition((prev) => constrainToViewport(prev, offsetWidth, offsetHeight));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only respond to primary button / single touch
      if (!e.isPrimary) return;
      // Don't initiate drag from interactive children (buttons, dropdown triggers)
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("[role='menu']") ||
        target.closest("[role='listbox']")
      )
        return;

      e.currentTarget.setPointerCapture(e.pointerId);
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: position.x,
        originY: position.y,
        moved: false,
        pointerId: e.pointerId,
      };
    },
    [position.x, position.y]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handlePointerMove = (e: PointerEvent) => {
      const state = dragState.current;
      if (state.pointerId === null || e.pointerId !== state.pointerId) return;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;

      if (!state.moved) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        state.moved = true;
        setIsDragging(true);
        setIsSnapping(false);
      }

      const { offsetWidth, offsetHeight } = element;
      const newX = clamp(state.originX + dx, 0, Math.max(0, window.innerWidth - offsetWidth));
      const newY = clamp(state.originY + dy, 0, Math.max(0, window.innerHeight - offsetHeight));

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = (e: PointerEvent) => {
      const state = dragState.current;
      if (state.pointerId === null || e.pointerId !== state.pointerId) return;

      if (state.moved) {
        const { offsetWidth, offsetHeight } = element;
        const snapped = snapToNearestEdge(position, offsetWidth, offsetHeight);
        setIsSnapping(true);
        setPosition(snapped);
        savePosition(resolvedKey, snapped);
      }

      setIsDragging(false);
      state.pointerId = null;
    };

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", handlePointerUp);
    element.addEventListener("pointercancel", handlePointerUp);

    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", handlePointerUp);
      element.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [position, resolvedKey]);

  const style: React.CSSProperties = {
    position: "fixed",
    transform: `translate(${position.x}px, ${position.y}px)`,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
    userSelect: isDragging ? "none" : "auto",
    opacity: isDragging ? 0.9 : 1,
    ...(isSnapping && !isDragging ? { transition: "transform 150ms ease-out" } : {}),
    top: 0,
    left: 0,
  };

  return {
    position,
    isDragging,
    isSnapping,
    ref: elementRef,
    style,
    handlePointerDown,
  };
}
```

Key design notes:

- **Click vs drag**: The hook checks `target.closest("button")` to skip drag initiation on interactive children. For non-button areas, the 5px threshold prevents accidental drags.
- **`isSnapping` state**: Controls when the CSS transition is applied — only during snap animation, never during active drag.
- **Native event listeners**: Pointer move/up/cancel are attached as native DOM listeners (not React synthetic) to avoid stale closure issues with `position` state during drag.
- **Pointer capture**: `setPointerCapture` ensures pointer events are delivered to the element even when the pointer leaves it.
- **React Compiler**: No `useMemo`/`useCallback` needed beyond `handlePointerDown` (which needs the closure over `position`).

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add hooks/use-draggable.ts
git commit -m "feat(toolbar): add useDraggable hook with edge snap and persistence"
```

---

### Task 3: Integrate `useDraggable` into FloatingToolbar

**Files:**

- Modify: `components/floating-toolbar.tsx`

- [ ] **Step 1: Update FloatingToolbar to use the hook**

Replace the outer `<div>` with hook-driven positioning. Key changes:

1. Import `useDraggable` and `STORAGE_KEYS`
2. Call `useDraggable` with storage key and default position
3. Remove `top-3 right-3` from className
4. Add `ref`, `style`, and `onPointerDown` from hook
5. Add `z-[60]` to inline style (moved from className for consistency with hook's style object)

Here is the complete updated file:

```tsx
"use client";

import { useState, useSyncExternalStore, useRef, useCallback } from "react";
import { useRouter, usePathname } from "../i18n/navigation";
import { LayoutGrid, Sun, Moon, ClipboardX, Maximize, Minimize, Globe } from "lucide-react";
import { getToolCards } from "../libs/tools";
import { useTheme } from "../libs/theme";
import { useTranslations, useLocale } from "next-intl";
import { Dropdown } from "./ui/dropdown";
import { useFullscreen } from "../hooks/use-fullscreen";
import { useDraggable } from "../hooks/use-draggable";
import { showToast } from "../libs/toast";

const languages = [
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "zh-CN", label: "简体中文", shortLabel: "中" },
  { code: "zh-TW", label: "繁體中文", shortLabel: "繁" },
];

// Approximate toolbar width: 5 buttons × 34px + border paddings
// Used as fallback before element is measured
const TOOLBAR_WIDTH = 170;

export default function FloatingToolbar() {
  const router = useRouter();
  const currentPath = usePathname();
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations("common");
  const currentLocale = useLocale();
  const tTools = useTranslations("tools");
  const [spinning, setSpinning] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const fullscreen = useFullscreen();
  const [clipAnimating, setClipAnimating] = useState(false);
  const [globeBouncing, setGlobeBouncing] = useState(false);
  const isClipboardSupported = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && !!navigator.clipboard,
    () => false
  );

  const defaultPosition =
    typeof window !== "undefined"
      ? { x: window.innerWidth - TOOLBAR_WIDTH - 12, y: 12 }
      : { x: 0, y: 0 };

  const { ref, style, handlePointerDown, isDragging } = useDraggable({
    storageKey: "floatingToolbarPosition",
    defaultPosition,
  });

  const handleClearClipboard = async () => {
    setClipAnimating(true);
    try {
      await navigator.clipboard.writeText("");
      showToast(t("clearedClipboard"), "success");
    } catch {
      showToast(t("clipboardClearFailed"), "danger");
    }
  };

  const tools = getToolCards(tTools);

  const toolItems = tools.map((tool) => ({
    label: tool.title,
    onClick: () => router.push(tool.path),
    active: tool.path === currentPath,
  }));

  return (
    <div
      ref={ref}
      style={style}
      onPointerDown={handlePointerDown}
      className="z-[60] flex items-center gap-0 bg-bg-surface/80 backdrop-blur-xl rounded-xl shadow-lg border border-border-default transition-opacity duration-200"
    >
      <Dropdown
        trigger={
          <button
            type="button"
            className={`flex h-[34px] w-[34px] items-center justify-center text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors border-r border-border-default ${spinning ? "nav-btn-spin" : ""}`}
            onClick={() => setSpinning(true)}
            onAnimationEnd={() => setSpinning(false)}
            aria-label={t("nav.tools")}
          >
            <LayoutGrid size={16} />
          </button>
        }
        items={toolItems}
      />

      {isClipboardSupported && (
        <button
          type="button"
          className={`flex h-[34px] w-[34px] items-center justify-center text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors border-r border-border-default ${clipAnimating ? "nav-btn-clear" : ""}`}
          onClick={handleClearClipboard}
          onAnimationEnd={() => setClipAnimating(false)}
          aria-label={t("nav.clearClipboard")}
          title={t("nav.clearClipboard")}
        >
          <ClipboardX size={16} />
        </button>
      )}

      {fullscreen.isSupported && (
        <button
          type="button"
          className="flex h-[34px] w-[34px] items-center justify-center text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors border-r border-border-default"
          onClick={() => fullscreen.toggle()}
          aria-label={fullscreen.isFullscreen ? t("nav.exitFullscreen") : t("nav.fullscreen")}
          title={fullscreen.isFullscreen ? t("nav.exitFullscreen") : t("nav.fullscreen")}
        >
          {fullscreen.isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      )}

      <button
        type="button"
        className={`flex h-[34px] w-[34px] items-center justify-center text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors border-r border-border-default ${flipping ? "nav-btn-flip" : ""}`}
        onClick={() => {
          setFlipping(true);
          toggleTheme();
        }}
        onAnimationEnd={() => setFlipping(false)}
        aria-label={t(theme === "dark" ? "nav.switchToLight" : "nav.switchToDark")}
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <Dropdown
        trigger={
          <button
            type="button"
            className={`flex h-[34px] w-[34px] items-center justify-center text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors ${globeBouncing ? "nav-btn-bounce" : ""}`}
            onClick={() => setGlobeBouncing(true)}
            onAnimationEnd={() => setGlobeBouncing(false)}
            aria-label={t("language")}
          >
            <Globe size={16} />
          </button>
        }
        items={languages.map((lang) => ({
          label: lang.label,
          onClick: () => router.replace(currentPath, { locale: lang.code }),
          active: lang.code === currentLocale,
        }))}
      />
    </div>
  );
}
```

Changes from original:

- Removed `className` → `fixed top-3 right-3 z-[60]` (positioning now via hook's `style`)
- Added `ref`, `style`, `onPointerDown` from hook
- `z-[60]` moved to className (kept for z-index, not position-related)
- Added `TOOLBAR_WIDTH` constant and `defaultPosition` computation
- Hook's `style` already includes `position: fixed`, `transform`, `cursor`, `touch-action`, `opacity`, and `top: 0; left: 0`

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Verify build passes**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds with no errors

- [ ] **Step 4: Manual test**

1. Run `npm run dev`
2. Open any tool page in the browser
3. Enter fullscreen mode (F11 or via toolbar button)
4. Verify toolbar appears at top-right (same as before)
5. Drag the toolbar to center of screen → release → verify it snaps to nearest edge
6. Drag to different positions → verify each snaps correctly
7. Click toolbar buttons → verify they still work (no accidental drags)
8. Navigate to a different tool page → verify position persists
9. Exit fullscreen → re-enter → verify position is restored
10. Resize window → verify toolbar stays within viewport

- [ ] **Step 5: Commit**

```bash
git add components/floating-toolbar.tsx
git commit -m "feat(toolbar): integrate useDraggable hook for repositioning in fullscreen"
```
