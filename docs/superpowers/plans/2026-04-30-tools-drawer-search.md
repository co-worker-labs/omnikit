# Tools Drawer with Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Dropdown tool menu with a right-side search-powered drawer that supports fuzzy English, Chinese, and Pinyin matching.

**Architecture:** Static pinyin mapping table in tools.ts + fuzzysort for fuzzy matching. Headless UI Dialog for drawer, responsive layout via Tailwind + useIsMobile hook. Icon management unified in tools.ts.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS 4, Headless UI Dialog, fuzzysort, Lucide Icons

---

### Task 1: Install fuzzysort

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install fuzzysort**

```bash
npm install fuzzysort
```

- [ ] **Step 2: Verify installation**

```bash
npm ls fuzzysort
```

Expected: `fuzzysort@3.x.x`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add fuzzysort dependency for tool search"
```

---

### Task 2: Extend libs/tools.ts with icon and pinyin fields

**Files:**

- Modify: `libs/tools.ts`

Reference files to read first:

- `app/[locale]/home-page.tsx` — for the existing Lucide icon mapping (source of truth for icon choices)
- `public/locales/zh-CN/tools.json` — for Chinese shortTitle values to compute pinyin

- [ ] **Step 1: Read current libs/tools.ts**

Read `libs/tools.ts` to understand current structure.

Current state:

- `ToolCard` interface: `{ path, title, description }`
- `TOOLS` array: `{ key, path }[]` — 23 entries
- `getToolCards(t)`: maps TOOLS → ToolCard via translations

- [ ] **Step 2: Update libs/tools.ts with icon and pinyin fields**

Replace the entire file content. Use the Lucide icons from `home-page.tsx` (the existing production icons) as source of truth. Pinyin values are based on zh-CN `shortTitle` from `public/locales/zh-CN/tools.json`:

```typescript
import type { LucideIcon } from "lucide-react";
import type { useTranslations } from "next-intl";
import {
  FileJson,
  FileCode,
  ShieldCheck,
  Percent,
  FingerprintPattern,
  Regex,
  QrCode,
  GitCompare,
  Hash,
  KeyRound,
  CaseSensitive,
  Lock,
  Clock,
  Timer,
  FileText,
  Database,
  FileCheck,
  HardDrive,
  Type,
  Code,
  Globe,
  Palette,
  Binary,
} from "lucide-react";

export interface ToolCard {
  path: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

interface ToolEntry {
  key: string;
  path: string;
  icon: LucideIcon;
  /** Full pinyin for Chinese shortTitle (no tones, joined). Empty for English-only titles. */
  pinyinFull: string;
  /** Pinyin initials for Chinese shortTitle (first letter of each syllable). Empty for English-only titles. */
  pinyinInitials: string;
}

export const TOOLS: ToolEntry[] = [
  { key: "json", path: "/json", icon: FileJson, pinyinFull: "", pinyinInitials: "" },
  { key: "base64", path: "/base64", icon: FileCode, pinyinFull: "", pinyinInitials: "" },
  { key: "jwt", path: "/jwt", icon: ShieldCheck, pinyinFull: "", pinyinInitials: "" },
  {
    key: "urlencoder",
    path: "/urlencoder",
    icon: Percent,
    pinyinFull: "urlbianjiema",
    pinyinInitials: "urlbjm",
  },
  {
    key: "uuid",
    path: "/uuid",
    icon: FingerprintPattern,
    pinyinFull: "uuidshengchengqi",
    pinyinInitials: "uuidscq",
  },
  {
    key: "regex",
    path: "/regex",
    icon: Regex,
    pinyinFull: "zhengzeceshiqi",
    pinyinInitials: "zzcsq",
  },
  {
    key: "qrcode",
    path: "/qrcode",
    icon: QrCode,
    pinyinFull: "erweimashengchengqi",
    pinyinInitials: "ewmscq",
  },
  {
    key: "diff",
    path: "/diff",
    icon: GitCompare,
    pinyinFull: "wenbenchayi",
    pinyinInitials: "wbcy",
  },
  {
    key: "hashing",
    path: "/hashing",
    icon: Hash,
    pinyinFull: "wenbenhaxi",
    pinyinInitials: "wbhx",
  },
  {
    key: "password",
    path: "/password",
    icon: KeyRound,
    pinyinFull: "mimashengchengqi",
    pinyinInitials: "mmscq",
  },
  {
    key: "textcase",
    path: "/textcase",
    icon: CaseSensitive,
    pinyinFull: "wenbendaxiaoxiezhuanhuan",
    pinyinInitials: "wbdxxzh",
  },
  {
    key: "cipher",
    path: "/cipher",
    icon: Lock,
    pinyinFull: "wenbenjiamijiemi",
    pinyinInitials: "wbjmjm",
  },
  {
    key: "cron",
    path: "/cron",
    icon: Clock,
    pinyinFull: "cronbiaodashi",
    pinyinInitials: "cronbdsh",
  },
  {
    key: "unixtime",
    path: "/unixtime",
    icon: Timer,
    pinyinFull: "unixshijianchuo",
    pinyinInitials: "unixsjc",
  },
  {
    key: "markdown",
    path: "/markdown",
    icon: FileText,
    pinyinFull: "markdownbianjiqi",
    pinyinInitials: "markdownbjq",
  },
  {
    key: "dbviewer",
    path: "/dbviewer",
    icon: Database,
    pinyinFull: "shujukuchakanqi",
    pinyinInitials: "sjkckq",
  },
  {
    key: "checksum",
    path: "/checksum",
    icon: FileCheck,
    pinyinFull: "wenjianxiaoyan",
    pinyinInitials: "wjxy",
  },
  {
    key: "storageunit",
    path: "/storageunit",
    icon: HardDrive,
    pinyinFull: "cunchudanweizhuanhuan",
    pinyinInitials: "ccdwzh",
  },
  { key: "ascii", path: "/ascii", icon: Type, pinyinFull: "asciibiao", pinyinInitials: "asciib" },
  {
    key: "htmlcode",
    path: "/htmlcode",
    icon: Code,
    pinyinFull: "htmldaima",
    pinyinInitials: "htmldm",
  },
  {
    key: "httpstatus",
    path: "/httpstatus",
    icon: Globe,
    pinyinFull: "httpzhuangtaima",
    pinyinInitials: "httpztm",
  },
  {
    key: "color",
    path: "/color",
    icon: Palette,
    pinyinFull: "yanshuzhuanhuan",
    pinyinInitials: "yszh",
  },
  {
    key: "numbase",
    path: "/numbase",
    icon: Binary,
    pinyinFull: "jinzhizhuanhuan",
    pinyinInitials: "jzzh",
  },
] as const;

export function getToolCards(t: ReturnType<typeof useTranslations>): ToolCard[] {
  return TOOLS.map((tool) => ({
    path: tool.path,
    title: t(`${tool.key}.shortTitle`),
    description: t(`${tool.key}.description`),
    icon: tool.icon,
  }));
}
```

Key changes:

- Added `icon: LucideIcon` field to each entry (using home-page.tsx icons)
- Added `pinyinFull` and `pinyinInitials` static strings for Chinese titles
- Extended `ToolCard` with `icon` field
- `getToolCards` now returns `icon` from the TOOLS entry
- English-only tools have empty pinyin strings (fuzzysort matches on `title` field)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit libs/tools.ts
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add libs/tools.ts
git commit -m "feat(tools): add icon and static pinyin fields to TOOLS registry"
```

---

### Task 3: Create libs/tools-search.ts

**Files:**

- Create: `libs/tools-search.ts`

- [ ] **Step 1: Create the search module**

Create `libs/tools-search.ts` with pure functions for search logic:

```typescript
import fuzzysort from "fuzzysort";
import type { ToolCard, ToolEntry } from "./tools";
import { TOOLS } from "./tools";
import type { LucideIcon } from "lucide-react";

export interface SearchableTool {
  path: string;
  title: string;
  description: string;
  icon: LucideIcon;
  pinyinFull: string;
  pinyinInitials: string;
}

/** Merge localized ToolCard[] with static pinyin data from TOOLS[]. */
export function prepareSearchableTools(
  cards: ToolCard[],
  entries: ToolEntry[] = TOOLS
): SearchableTool[] {
  const pinyinMap = new Map(entries.map((t) => [t.path, t]));
  return cards.map((card) => {
    const entry = pinyinMap.get(card.path);
    return {
      ...card,
      pinyinFull: entry?.pinyinFull ?? "",
      pinyinInitials: entry?.pinyinInitials ?? "",
    };
  });
}

/** Search tools by query string. Returns all tools if query is empty. */
export function searchTools(query: string, tools: SearchableTool[]): SearchableTool[] {
  if (!query.trim()) return tools;
  const results = fuzzysort.go(query, tools, {
    keys: ["title", "pinyinFull", "pinyinInitials"],
    threshold: -10000,
  });
  return results.map((r) => r.obj);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit libs/tools-search.ts
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add libs/tools-search.ts
git commit -m "feat(search): add fuzzysort-based tool search with pinyin support"
```

---

### Task 4: Update home-page.tsx to use unified icon

**Files:**

- Modify: `app/[locale]/home-page.tsx`

- [ ] **Step 1: Read current home-page.tsx**

Read `app/[locale]/home-page.tsx` to understand the current `toolIcons` mapping and rendering logic.

Current state: Lines 9-58 define a local `toolIcons` Record mapping paths to JSX elements. Line 98 looks up `toolIcons[tool.path]`.

- [ ] **Step 2: Remove local toolIcons and use icon from getToolCards**

In `app/[locale]/home-page.tsx`:

1. Remove the entire `toolIcons` constant (lines 34-58)
2. Remove the unused Lucide icon imports (lines 9-32) — keep only the imports actually used
3. In the `ToolCollection` component, use `tool.icon` from `getToolCards` result instead of `toolIcons[tool.path]`

The updated `ToolCollection` rendering section becomes:

```tsx
function ToolCollection() {
  const router = useRouter();
  const t = useTranslations("tools");
  const tools = getToolCards(t);

  return (
    <section className="container mx-auto px-4 pb-20 pt-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card
              key={tool.path}
              hover
              className="group flex flex-col cursor-pointer"
              onClick={() => router.push(tool.path)}
            >
              <div className="flex flex-1 flex-col items-center p-5">
                {Icon && (
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent-cyan/10 transition-colors group-hover:bg-accent-cyan/15">
                    <Icon size={28} className="text-accent-cyan" />
                  </div>
                )}

                <h3 className="font-semibold text-fg-primary text-center">{tool.title}</h3>

                <p className="mt-2 line-clamp-2 text-sm text-fg-secondary text-center leading-relaxed">
                  {tool.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
```

The file's top imports become:

```typescript
"use client";

import Layout from "../../components/layout";
import { useRouter } from "../../i18n/navigation";
import { useTranslations } from "next-intl";
import { getToolCards } from "../../libs/tools";
import { Card } from "../../components/ui/card";
```

- [ ] **Step 3: Verify the page renders correctly**

```bash
npm run build
```

Expected: Build succeeds with no errors. The home page should look identical to before — same icons, same layout.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/home-page.tsx
git commit -m "refactor(home): use unified icon from tools.ts instead of local mapping"
```

---

### Task 5: Add i18n translations for drawer

**Files:**

- Modify: `public/locales/en/common.json`
- Modify: `public/locales/zh-CN/common.json`
- Modify: `public/locales/zh-TW/common.json`

- [ ] **Step 1: Add translations to en/common.json**

Add new keys to the `nav` section in `public/locales/en/common.json`:

```json
"searchTools": "Search tools…",
"searchToolsHint": "Tools (⌘K)",
"noMatchingTools": "No matching tools found"
```

The `nav` section becomes:

```json
"nav": {
  "brand": "OmniKit",
  "search": "Search",
  "searchPlaceholder": "Search",
  "switchToLight": "Switch to light mode",
  "switchToDark": "Switch to dark mode",
  "tools": "Tools",
  "clearClipboard": "Clear clipboard",
  "fullscreen": "Fullscreen",
  "exitFullscreen": "Exit fullscreen",
  "searchTools": "Search tools…",
  "searchToolsHint": "Tools (⌘K)",
  "noMatchingTools": "No matching tools found"
}
```

- [ ] **Step 2: Add translations to zh-CN/common.json**

Add same keys to the `nav` section in `public/locales/zh-CN/common.json`:

```json
"searchTools": "搜索工具…",
"searchToolsHint": "工具 (⌘K)",
"noMatchingTools": "没有找到匹配的工具"
```

- [ ] **Step 3: Add translations to zh-TW/common.json**

Add same keys to the `nav` section in `public/locales/zh-TW/common.json`:

```json
"searchTools": "搜尋工具…",
"searchToolsHint": "工具 (⌘K)",
"noMatchingTools": "沒有找到符合的工具"
```

- [ ] **Step 4: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('public/locales/en/common.json','utf8')); console.log('en: OK')"
node -e "JSON.parse(require('fs').readFileSync('public/locales/zh-CN/common.json','utf8')); console.log('zh-CN: OK')"
node -e "JSON.parse(require('fs').readFileSync('public/locales/zh-TW/common.json','utf8')); console.log('zh-TW: OK')"
```

Expected: All print "OK"

- [ ] **Step 5: Commit**

```bash
git add public/locales/en/common.json public/locales/zh-CN/common.json public/locales/zh-TW/common.json
git commit -m "feat(i18n): add tools drawer search translations"
```

---

### Task 6: Add drawer animation keyframes

**Files:**

- Modify: `app/globals.css`

- [ ] **Step 1: Add keyframes after the existing button animation keyframes**

After the `.nav-btn-clear` block (around line 244) in `app/globals.css`, add:

```css
/* ===== Tools Drawer Animations ===== */
@keyframes drawer-slide-in-right {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes drawer-slide-in-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes backdrop-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(ui): add drawer slide-in and backdrop fade animation keyframes"
```

---

### Task 7: Create tools-drawer.tsx component

**Files:**

- Create: `components/tools-drawer.tsx`

Reference files to read first:

- `app/[locale]/cron/field-editor.tsx` — for Headless UI Dialog pattern
- `components/ui/dropdown.tsx` — for existing component structure
- `libs/tools-search.ts` — for search functions
- `libs/tools.ts` — for TOOLS and getToolCards
- `hooks/use-is-mobile.ts` — for useIsMobile hook

- [ ] **Step 1: Create the drawer component**

Create `components/tools-drawer.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { useRouter, usePathname } from "../i18n/navigation";
import { useTranslations } from "next-intl";
import { getToolCards, TOOLS } from "../libs/tools";
import { prepareSearchableTools, searchTools, type SearchableTool } from "../libs/tools-search";
import { useIsMobile } from "../hooks/use-is-mobile";
import { Search } from "lucide-react";

interface ToolsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function ToolsDrawer({ open, onClose }: ToolsDrawerProps) {
  const router = useRouter();
  const currentPath = usePathname();
  const t = useTranslations("common");
  const tTools = useTranslations("tools");
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Prepare searchable tools once (memoized by React Compiler)
  const toolCards = getToolCards(tTools);
  const searchableTools = prepareSearchableTools(toolCards);
  const filteredTools = searchTools(query, searchableTools);

  // Reset state when drawer opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setFocusedIndex(-1);
      // Auto-focus search input after dialog transition
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [open]);

  // Global ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Toggle handled by parent — emit custom event
        // Parent components listen for this to toggle open state
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = useCallback(
    (path: string) => {
      router.push(path);
      onClose();
    },
    [router, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < filteredTools.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredTools.length - 1));
      } else if (e.key === "Enter" && focusedIndex >= 0 && focusedIndex < filteredTools.length) {
        e.preventDefault();
        handleSelect(filteredTools[focusedIndex].path);
      }
    },
    [filteredTools, focusedIndex, handleSelect]
  );

  // Scroll focused card into view
  useEffect(() => {
    if (focusedIndex >= 0) {
      cardRefs.current[focusedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40"
        aria-hidden="true"
        style={{ animation: "backdrop-fade-in 200ms ease-out" }}
      />

      {/* Drawer container */}
      {isMobile ? (
        // Mobile: bottom sheet
        <div className="fixed inset-0 flex items-end justify-center">
          <DialogPanel
            className="w-full max-h-[85vh] bg-bg-surface border-t border-border-default rounded-t-2xl flex flex-col"
            style={{ animation: "drawer-slide-in-up 200ms ease-out" }}
          >
            <DrawerContent
              query={query}
              setQuery={setQuery}
              filteredTools={filteredTools}
              currentPath={currentPath}
              focusedIndex={focusedIndex}
              cardRefs={cardRefs}
              searchInputRef={searchInputRef}
              onKeyDown={handleKeyDown}
              onSelect={handleSelect}
              placeholder={t("searchTools")}
              emptyText={t("noMatchingTools")}
            />
          </DialogPanel>
        </div>
      ) : (
        // Desktop: right-side drawer
        <div className="fixed inset-0 flex justify-end">
          <DialogPanel
            className="w-[380px] h-full bg-bg-surface border-l border-border-default flex flex-col"
            style={{ animation: "drawer-slide-in-right 200ms ease-out" }}
          >
            <DrawerContent
              query={query}
              setQuery={setQuery}
              filteredTools={filteredTools}
              currentPath={currentPath}
              focusedIndex={focusedIndex}
              cardRefs={cardRefs}
              searchInputRef={searchInputRef}
              onKeyDown={handleKeyDown}
              onSelect={handleSelect}
              placeholder={t("searchTools")}
              emptyText={t("noMatchingTools")}
            />
          </DialogPanel>
        </div>
      )}
    </Dialog>
  );
}

/** Shared content for both mobile and desktop drawer layouts. */
function DrawerContent({
  query,
  setQuery,
  filteredTools,
  currentPath,
  focusedIndex,
  cardRefs,
  searchInputRef,
  onKeyDown,
  onSelect,
  placeholder,
  emptyText,
}: {
  query: string;
  setQuery: (q: string) => void;
  filteredTools: SearchableTool[];
  currentPath: string;
  focusedIndex: number;
  cardRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSelect: (path: string) => void;
  placeholder: string;
  emptyText: string;
}) {
  return (
    <>
      {/* Search input */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default">
        <Search size={16} className="text-fg-muted shrink-0" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-fg-primary placeholder:text-fg-muted outline-none"
        />
      </div>

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredTools.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-fg-muted">
            {emptyText}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredTools.map((tool, index) => {
              const Icon = tool.icon;
              const isActive = tool.path === currentPath;
              const isFocused = index === focusedIndex;
              return (
                <button
                  key={tool.path}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  onClick={() => onSelect(tool.path)}
                  className={`flex flex-col items-start gap-1.5 rounded-lg p-3 text-left transition-colors border-l-2 ${
                    isActive
                      ? "border-accent-cyan bg-accent-cyan/10"
                      : isFocused
                        ? "border-accent-cyan bg-accent-cyan/10"
                        : "border-transparent hover:bg-bg-elevated"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-fg-muted shrink-0" />
                    <span className="text-sm font-medium text-fg-primary truncate">
                      {tool.title}
                    </span>
                  </div>
                  <p className="text-xs text-fg-muted line-clamp-2 leading-relaxed">
                    {tool.description}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit components/tools-drawer.tsx
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/tools-drawer.tsx
git commit -m "feat(ui): create tools drawer component with search and keyboard nav"
```

---

### Task 8: Update header.tsx to use ToolsDrawer

**Files:**

- Modify: `components/header.tsx`

- [ ] **Step 1: Read current header.tsx**

Read `components/header.tsx` to understand current Dropdown usage.

Current state: Lines 77-90 use `<Dropdown>` with LayoutGrid trigger and `toolItems` array.

- [ ] **Step 2: Replace Dropdown with ToolsDrawer trigger**

In `components/header.tsx`:

1. Add import: `import ToolsDrawer from "./tools-drawer";`
2. Add state: `const [toolsOpen, setToolsOpen] = useState(false);`
3. Add ⌘K listener via useEffect
4. Replace the `<Dropdown>` block (lines 77-90) with a trigger button + `<ToolsDrawer>`
5. Remove unused `toolItems` mapping (lines 48-52)
6. Remove unused imports: `getToolCards` from `"../libs/tools"`, `Dropdown` from `"./ui/dropdown"` (no other Dropdown usage in header.tsx)

The updated header.tsx key sections:

**New imports** (add to existing imports):

```typescript
import ToolsDrawer from "./tools_drawer";
```

**Add state** (after existing useState declarations):

```typescript
const [toolsOpen, setToolsOpen] = useState(false);
```

**Add ⌘K global listener** (inside the component, after state):

```typescript
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setToolsOpen((prev) => !prev);
    }
  }
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, []);
```

**Remove** the `toolItems` mapping (no longer needed — drawer handles tool rendering internally).

**Replace** the `<Dropdown>` block with:

```tsx
<button
  type="button"
  className={`flex h-8 w-8 items-center justify-center rounded-lg text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors ${spinning ? "nav-btn-spin" : ""}`}
  onClick={() => setToolsOpen(true)}
  onAnimationEnd={() => setSpinning(false)}
  aria-label={t("nav.tools")}
  title={t("nav.searchToolsHint")}
>
  <LayoutGrid size={16} />
</button>
<ToolsDrawer open={toolsOpen} onClose={() => setToolsOpen(false)} />
```

Also remove the `getToolCards` import and `tTools` if no longer used elsewhere in the file. Check: `tTools` was only used for `getToolCards(tTools)` which fed `toolItems`. After removing `toolItems`, remove `const tTools = useTranslations("tools");` and `const tools = getToolCards(tTools);`.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add components/header.tsx
git commit -m "feat(header): replace Dropdown with ToolsDrawer trigger + ⌘K shortcut"
```

---

### Task 9: Update floating-toolbar.tsx to use ToolsDrawer

**Files:**

- Modify: `components/floating-toolbar.tsx`

- [ ] **Step 1: Read current floating-toolbar.tsx**

Read `components/floating-toolbar.tsx` to understand current Dropdown usage.

Current state: Lines 57-70 use `<Dropdown>` with LayoutGrid trigger for tools.

- [ ] **Step 2: Replace Dropdown with ToolsDrawer trigger**

Same pattern as header.tsx:

1. Add import: `import ToolsDrawer from "./tools-drawer";`
2. Add state: `const [toolsOpen, setToolsOpen] = useState(false);`
3. Add ⌘K listener via useEffect
4. Replace the tools `<Dropdown>` block with trigger button + `<ToolsDrawer>`
5. Remove unused `toolItems` mapping

The trigger button styling matches the floating toolbar's compact style:

```tsx
<button
  type="button"
  className={`flex h-[34px] w-[34px] items-center justify-center text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors border-r border-border-default ${spinning ? "nav-btn-spin" : ""}`}
  onClick={() => setToolsOpen(true)}
  onAnimationEnd={() => setSpinning(false)}
  aria-label={t("nav.tools")}
  title={t("nav.searchToolsHint")}
>
  <LayoutGrid size={16} />
</button>
<ToolsDrawer open={toolsOpen} onClose={() => setToolsOpen(false)} />
```

Remove: `getToolCards` import, `tTools`, `const tools = getToolCards(tTools);`, and `const toolItems = tools.map(...)`.

Note: Keep the second `<Dropdown>` for language switching (lines 110-127) — that is NOT being replaced.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add components/floating-toolbar.tsx
git commit -m "feat(toolbar): replace tools Dropdown with ToolsDrawer trigger + ⌘K shortcut"
```

---

### Task 10: Final verification

**Files:**

- None (verification only)

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: No type errors

- [ ] **Step 3: Run linter**

```bash
npx next lint
```

Expected: No lint errors related to changed files

- [ ] **Step 4: Manual smoke test checklist**

Start dev server: `npm run dev`

Verify:

1. Click LayoutGrid icon in header → drawer opens from right side (desktop) / bottom (mobile)
2. Type "json" → JSON Format card appears in results
3. Type "mima" → 密码生成器 card appears
4. Type "mm" → 密码生成器 card appears
5. Type "zzz" → "No matching tools found" empty state
6. Press ↑↓ → card focus moves
7. Press Enter → navigates to focused tool + drawer closes
8. Press Esc → drawer closes
9. Press ⌘K / Ctrl+K → drawer toggles
10. Click backdrop → drawer closes
11. Home page icons render correctly (unchanged from before)
12. Tool cards show icon + title + description
13. Current tool is highlighted with accent-cyan border
