# Tools Drawer with Search — Design Spec

## Overview

Replace the current Dropdown-based tool menu (top-right LayoutGrid icon) with a right-side drawer containing a search-powered card grid. Support fuzzy English matching, Chinese character matching, and Pinyin matching via static lookup table + fuzzysort.

## Decisions

| Decision              | Choice                            | Rationale                                                                                                    |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Display style         | Card grid (2 columns)             | Visual richness, shows icon + title + description                                                            |
| Search library        | Static pinyin mapping + fuzzysort | Static table for pinyin (~1KB, zero runtime cost), fuzzysort for fuzzy matching (~5KB gzip)                  |
| Drawer implementation | Headless UI Dialog                | Zero new deps, project already uses @headlessui/react v2.2.10, has Dialog precedent in cron/field-editor.tsx |
| Mobile behavior       | Bottom sheet (<768px)             | Matches existing responsive Dialog pattern in cron/field-editor.tsx                                          |
| Tool icons            | Lucide Icons                      | Consistent style, already a project dependency; unify home-page.tsx and drawer to single source              |
| Keyboard shortcut     | ⌘K / Ctrl+K                       | Developer-standard, consistent with VS Code/Raycast/Linear                                                   |
| Icon management       | Unified in tools.ts               | Eliminate duplicate toolIcons mapping in home-page.tsx                                                       |

## Component Architecture

```
components/
├── tools-drawer.tsx          # New: drawer component (search + card grid + keyboard nav)
├── header.tsx                # Modified: replace Dropdown with ToolsDrawer trigger
├── floating-toolbar.tsx      # Modified: same change
libs/
├── tools-search.ts           # New: pure search logic (fuzzysort + static pinyin)
├── tools.ts                  # Modified: add icon + pinyin fields per tool
app/[locale]/
├── home-page.tsx             # Modified: remove local toolIcons mapping, use tools.ts icon
```

### tools.ts Changes

Add `icon`, `pinyinFull`, and `pinyinInitials` fields to each tool entry:

```typescript
import type { LucideIcon } from "lucide-react";
import {
  Braces,
  FileCode,
  KeyRound,
  Link,
  Fingerprint,
  Regex,
  QrCode,
  GitCompare,
  Hash,
  Lock,
  CaseSensitive,
  Shield,
  Clock,
  Timer,
  FileText,
  Database,
  FileCheck,
  HardDrive,
  Binary,
  Code,
  Globe,
  Palette,
  ArrowLeftRight,
} from "lucide-react";

interface ToolEntry {
  key: string;
  path: string;
  icon: LucideIcon;
  pinyinFull: string; // Static pinyin for Chinese titles, empty for English
  pinyinInitials: string; // Static pinyin initials for Chinese titles, empty for English
}

export const TOOLS: ToolEntry[] = [
  { key: "json", path: "/json", icon: Braces, pinyinFull: "", pinyinInitials: "" },
  { key: "base64", path: "/base64", icon: FileCode, pinyinFull: "", pinyinInitials: "" },
  { key: "jwt", path: "/jwt", icon: KeyRound, pinyinFull: "", pinyinInitials: "" },
  { key: "urlencoder", path: "/urlencoder", icon: Link, pinyinFull: "", pinyinInitials: "" },
  { key: "uuid", path: "/uuid", icon: Fingerprint, pinyinFull: "", pinyinInitials: "" },
  { key: "regex", path: "/regex", icon: Regex, pinyinFull: "", pinyinInitials: "" },
  { key: "qrcode", path: "/qrcode", icon: QrCode, pinyinFull: "", pinyinInitials: "" },
  { key: "diff", path: "/diff", icon: GitCompare, pinyinFull: "", pinyinInitials: "" },
  { key: "hashing", path: "/hashing", icon: Hash, pinyinFull: "", pinyinInitials: "" },
  {
    key: "password",
    path: "/password",
    icon: Lock,
    pinyinFull: "mimashengchengqi",
    pinyinInitials: "mmscq",
  },
  { key: "textcase", path: "/textcase", icon: CaseSensitive, pinyinFull: "", pinyinInitials: "" },
  {
    key: "cipher",
    path: "/cipher",
    icon: Shield,
    pinyinFull: "jiamijiemi",
    pinyinInitials: "jjjm",
  },
  { key: "cron", path: "/cron", icon: Clock, pinyinFull: "", pinyinInitials: "" },
  { key: "unixtime", path: "/unixtime", icon: Timer, pinyinFull: "", pinyinInitials: "" },
  { key: "markdown", path: "/markdown", icon: FileText, pinyinFull: "", pinyinInitials: "" },
  { key: "dbviewer", path: "/dbviewer", icon: Database, pinyinFull: "", pinyinInitials: "" },
  {
    key: "checksum",
    path: "/checksum",
    icon: FileCheck,
    pinyinFull: "wenjianxiao yan",
    pinyinInitials: "wjxy",
  },
  {
    key: "storageunit",
    path: "/storageunit",
    icon: HardDrive,
    pinyinFull: "cunchud anwei zhuanhuan",
    pinyinInitials: "ccdwzh",
  },
  { key: "ascii", path: "/ascii", icon: Binary, pinyinFull: "", pinyinInitials: "" },
  { key: "htmlcode", path: "/htmlcode", icon: Code, pinyinFull: "", pinyinInitials: "" },
  { key: "httpstatus", path: "/httpstatus", icon: Globe, pinyinFull: "", pinyinInitials: "" },
  {
    key: "color",
    path: "/color",
    icon: Palette,
    pinyinFull: "yanse zhuanhuan",
    pinyinInitials: "yszh",
  },
  {
    key: "numbase",
    path: "/numbase",
    icon: ArrowLeftRight,
    pinyinFull: "jinzhi zhuanhuan",
    pinyinInitials: "jzzh",
  },
] as const;
```

The `ToolCard` interface is extended with `icon`:

```typescript
export interface ToolCard {
  path: string;
  title: string;
  description: string;
  icon: LucideIcon;
}
```

The `getToolCards` function returns `ToolCard` extended with `icon`. The `home-page.tsx` local `toolIcons` mapping is removed — it reads icon from `getToolCards` instead.

### libs/tools-search.ts

Pure functions, no React dependency. Testable independently. Uses static pinyin data from TOOLS array — zero runtime pinyin computation.

```typescript
import fuzzysort from "fuzzysort";

interface SearchableTool {
  path: string;
  title: string;
  description: string;
  icon: LucideIcon;
  pinyinFull: string;
  pinyinInitials: string;
}

function prepareSearchableTools(tools: ToolCard[], toolEntries: ToolEntry[]): SearchableTool[] {
  const pinyinMap = new Map(toolEntries.map((t) => [t.path, t]));
  return tools.map((tool) => {
    const entry = pinyinMap.get(tool.path);
    return {
      ...tool,
      pinyinFull: entry?.pinyinFull ?? "",
      pinyinInitials: entry?.pinyinInitials ?? "",
    };
  });
}

function searchTools(query: string, tools: SearchableTool[]): SearchableTool[] {
  if (!query.trim()) return tools;
  const results = fuzzysort.go(query, tools, {
    keys: ["title", "pinyinFull", "pinyinInitials"],
    threshold: -10000,
  });
  return results.map((r) => r.obj);
}
```

`prepareSearchableTools` merges localized `ToolCard[]` (title/description from translations) with static pinyin data from `ToolEntry[]` (TOOLS array). Called once on component mount. `searchTools` operates on the merged `SearchableTool[]`.

### components/tools-drawer.tsx

Single component containing:

1. **Headless UI Dialog** as the drawer container
2. **Search input** at the top (auto-focused on open)
3. **Card grid** (2 columns) below the search input
4. **Keyboard navigation** handler (↑↓ to move focus, Enter to select)
5. **Responsive layout** (right-side drawer on desktop, bottom-sheet on mobile)
6. **Global ⌘K listener** via `useEffect` with cleanup

Props:

```typescript
interface ToolsDrawerProps {
  open: boolean;
  onClose: () => void;
}
```

Trigger is managed by the parent (Header or FloatingToolbar) via `useState`.

Current tool is highlighted with accent-cyan left border + highlighted background, matching the existing Dropdown active style.

## Search Flow

```
User types query
  → fuzzysort.go(query, TOOLS, { keys: ['title', 'pinyinFull', 'pinyinInitials'] })
  → Results sorted by fuzzysort score
  → Card grid re-renders with filtered tools
```

Search scope: title + pinyin fields only (not description).

### Match Examples

| Query  | Match Field    | Result                                       |
| ------ | -------------- | -------------------------------------------- |
| `json` | title          | JSON Format                                  |
| `jm`   | title (fuzzy)  | JSON Format (via fuzzysort initial matching) |
| `mima` | pinyinFull     | 密码生成器                                   |
| `mm`   | pinyinInitials | 密码生成器                                   |
| `密码` | title          | 密码生成器                                   |
| `base` | title          | Base64 编码/解码                             |

### Empty State

When no results match, show centered text: "没有找到匹配的工具" / "No matching tools found". Reuse existing `nav.search` / `nav.searchPlaceholder` translations from common.json where applicable.

## Interaction Design

### Keyboard

| Key             | Action                                  |
| --------------- | --------------------------------------- |
| `⌘K` / `Ctrl+K` | Open drawer, auto-focus search input    |
| `Esc`           | Close drawer                            |
| `↑` / `↓`       | Move focus between cards                |
| `Enter`         | Navigate to focused tool + close drawer |

Global ⌘K listener is registered via `useEffect` in `tools-drawer.tsx` with proper cleanup on unmount.

### Mouse

- Click card → navigate to tool + close drawer
- Click backdrop → close drawer
- Click trigger button (LayoutGrid) → toggle drawer

### Animation

- Drawer slide-in: `translateX(100%)` → `translateX(0)`, 200ms ease-out
- Backdrop fade: `opacity: 0` → `opacity: 1`, 200ms
- Mobile bottom sheet: `translateY(100%)` → `translateY(0)`, 200ms ease-out

Animation keyframes defined in `globals.css` using Tailwind arbitrary value syntax (consistent with existing toast `animate-[slideIn_0.2s_ease-out]` pattern).

### Responsive

| Breakpoint | Behavior                                                       |
| ---------- | -------------------------------------------------------------- |
| ≥768px     | Right-side drawer, width 380px                                 |
| <768px     | Bottom sheet, full width, max-height 85vh, rounded top corners |

Uses existing `useIsMobile` hook (768px breakpoint).

### Trigger Button

- LayoutGrid icon unchanged
- Add `title` attribute showing "工具 (⌘K)" hint

## Files Modified

| File                               | Change                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| `libs/tools.ts`                    | Add `icon`, `pinyinFull`, `pinyinInitials` fields to TOOLS; extend ToolCard with `icon` |
| `libs/tools-search.ts`             | **New file**: search logic with fuzzysort                                               |
| `components/tools-drawer.tsx`      | **New file**: drawer component                                                          |
| `components/header.tsx`            | Replace Dropdown with ToolsDrawer                                                       |
| `components/floating-toolbar.tsx`  | Replace Dropdown with ToolsDrawer                                                       |
| `app/[locale]/home-page.tsx`       | Remove local `toolIcons` mapping, use icon from `getToolCards`                          |
| `public/locales/en/common.json`    | Add search-related translations (extend existing `nav.search*`)                         |
| `public/locales/zh-CN/common.json` | Add search-related translations                                                         |
| `public/locales/zh-TW/common.json` | Add search-related translations                                                         |
| `app/globals.css`                  | Add slide-in animation keyframes                                                        |
| `package.json`                     | Add fuzzysort dependency                                                                |

## New Dependencies

| Package     | Version | Size (gzip) | Purpose               |
| ----------- | ------- | ----------- | --------------------- |
| `fuzzysort` | ^3.x    | ~5KB        | Fuzzy string matching |

**Removed from original spec**: `pinyin-pro` (~100-150KB gzip) — replaced by static pinyin mapping table in TOOLS array (~1KB).
