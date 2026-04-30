import type { useTranslations } from "next-intl";

export interface ToolCard {
  path: string;
  title: string;
  description: string;
}

export const TOOLS: { key: string; path: string }[] = [
  { key: "json", path: "/json" },
  { key: "base64", path: "/base64" },
  { key: "jwt", path: "/jwt" },
  { key: "urlencoder", path: "/urlencoder" },
  { key: "uuid", path: "/uuid" },
  { key: "regex", path: "/regex" },
  { key: "qrcode", path: "/qrcode" },
  { key: "diff", path: "/diff" },
  { key: "hashing", path: "/hashing" },
  { key: "password", path: "/password" },
  { key: "textcase", path: "/textcase" },
  { key: "cipher", path: "/cipher" },
  { key: "cron", path: "/cron" },
  { key: "unixtime", path: "/unixtime" },
  { key: "markdown", path: "/markdown" },
  { key: "dbviewer", path: "/dbviewer" },
  { key: "checksum", path: "/checksum" },
  { key: "storageunit", path: "/storageunit" },
  { key: "ascii", path: "/ascii" },
  { key: "htmlcode", path: "/htmlcode" },
  { key: "httpstatus", path: "/httpstatus" },
  { key: "color", path: "/color" },
  { key: "csv", path: "/csv" },
] as const;

export function getToolCards(t: ReturnType<typeof useTranslations>): ToolCard[] {
  return TOOLS.map((tool) => {
    return {
      path: tool.path,
      title: t(`${tool.key}.shortTitle`),
      description: t(`${tool.key}.description`),
    };
  });
}
