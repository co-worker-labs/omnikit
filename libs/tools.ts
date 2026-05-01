import type { LucideIcon } from "lucide-react";
import type { useTranslations } from "next-intl";
import {
  FileJson,
  FileCode,
  FileBraces,
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
  Table,
  FileSpreadsheet,
  ImageDown,
} from "lucide-react";

export interface ToolCard {
  path: string;
  title: string;
  description: string;
  icon: LucideIcon;
  searchTerms: string;
}

export interface ToolEntry {
  key: string;
  path: string;
  icon: LucideIcon;
}

export type ToolCategory = "text" | "encoding" | "security" | "generators" | "visual" | "reference";

export interface CategoryGroup {
  key: ToolCategory;
  tools: string[]; // tool keys in display order
}

export const TOOL_CATEGORIES: CategoryGroup[] = [
  { key: "text", tools: ["json", "regex", "diff", "markdown", "textcase"] },
  {
    key: "encoding",
    tools: ["base64", "urlencoder", "csv", "csv-md", "numbase", "yaml", "storageunit"],
  },
  { key: "security", tools: ["jwt", "hashing", "password", "cipher", "checksum"] },
  { key: "generators", tools: ["uuid", "cron", "unixtime", "qrcode"] },
  { key: "visual", tools: ["color", "image"] },
  { key: "reference", tools: ["httpstatus", "dbviewer", "ascii", "htmlcode"] },
];

export const QUICK_ACCESS_DEFAULT: string[] = ["json", "base64", "jwt", "regex", "diff", "hashing"];

const PALETTE_SIZE = 20;

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 15;
  }
  return Math.abs(h);
}

export function getToolIconColor(path: string): string {
  const index = hashCode(path) % PALETTE_SIZE;
  return `var(--tool-icon-${index})`;
}

export const TOOLS: ToolEntry[] = [
  { key: "json", path: "/json", icon: FileJson },
  { key: "base64", path: "/base64", icon: FileCode },
  { key: "jwt", path: "/jwt", icon: ShieldCheck },
  { key: "regex", path: "/regex", icon: Regex },
  { key: "uuid", path: "/uuid", icon: FingerprintPattern },
  { key: "hashing", path: "/hashing", icon: Hash },
  { key: "urlencoder", path: "/urlencoder", icon: Percent },
  { key: "unixtime", path: "/unixtime", icon: Timer },
  { key: "diff", path: "/diff", icon: GitCompare },
  { key: "password", path: "/password", icon: KeyRound },
  { key: "color", path: "/color", icon: Palette },
  { key: "cron", path: "/cron", icon: Clock },
  { key: "markdown", path: "/markdown", icon: FileText },
  { key: "qrcode", path: "/qrcode", icon: QrCode },
  { key: "textcase", path: "/textcase", icon: CaseSensitive },
  { key: "csv", path: "/csv", icon: FileSpreadsheet },
  { key: "csv-md", path: "/csv-md", icon: Table },
  { key: "cipher", path: "/cipher", icon: Lock },
  { key: "numbase", path: "/numbase", icon: Binary },
  { key: "dbviewer", path: "/dbviewer", icon: Database },
  { key: "checksum", path: "/checksum", icon: FileCheck },
  { key: "storageunit", path: "/storageunit", icon: HardDrive },
  { key: "httpstatus", path: "/httpstatus", icon: Globe },
  { key: "yaml", path: "/yaml", icon: FileBraces },
  { key: "image", path: "/image", icon: ImageDown },
  { key: "htmlcode", path: "/htmlcode", icon: Code },
  { key: "ascii", path: "/ascii", icon: Type },
] as const;

export function getToolCards(t: ReturnType<typeof useTranslations>): ToolCard[] {
  return TOOLS.map((tool) => ({
    path: tool.path,
    title: t(`${tool.key}.shortTitle`),
    description: t(`${tool.key}.description`),
    icon: tool.icon,
    searchTerms: t.has(`${tool.key}.searchTerms`) ? t(`${tool.key}.searchTerms`) : "",
  }));
}

export function getToolCardMap(t: ReturnType<typeof useTranslations>): Map<string, ToolCard> {
  const cards = getToolCards(t);
  return new Map(cards.map((card) => [card.path, card]));
}

export function getToolCardsByKeys(keys: string[], cardMap: Map<string, ToolCard>): ToolCard[] {
  return keys
    .map((key) => {
      const path = `/${key}`;
      return cardMap.get(path);
    })
    .filter((card): card is ToolCard => card !== undefined);
}
