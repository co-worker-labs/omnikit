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
  FileSpreadsheet,
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
  { key: "urlencoder", path: "/urlencoder", icon: Percent },
  { key: "yaml", path: "/yaml", icon: FileBraces },
  { key: "uuid", path: "/uuid", icon: FingerprintPattern },
  { key: "regex", path: "/regex", icon: Regex },
  { key: "qrcode", path: "/qrcode", icon: QrCode },
  { key: "diff", path: "/diff", icon: GitCompare },
  { key: "hashing", path: "/hashing", icon: Hash },
  { key: "password", path: "/password", icon: KeyRound },
  { key: "textcase", path: "/textcase", icon: CaseSensitive },
  { key: "cipher", path: "/cipher", icon: Lock },
  { key: "cron", path: "/cron", icon: Clock },
  { key: "unixtime", path: "/unixtime", icon: Timer },
  { key: "markdown", path: "/markdown", icon: FileText },
  { key: "dbviewer", path: "/dbviewer", icon: Database },
  { key: "checksum", path: "/checksum", icon: FileCheck },
  { key: "storageunit", path: "/storageunit", icon: HardDrive },
  { key: "ascii", path: "/ascii", icon: Type },
  { key: "htmlcode", path: "/htmlcode", icon: Code },
  { key: "httpstatus", path: "/httpstatus", icon: Globe },
  { key: "color", path: "/color", icon: Palette },
  { key: "numbase", path: "/numbase", icon: Binary },
  { key: "csv", path: "/csv", icon: FileSpreadsheet },
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
