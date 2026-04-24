import type { useTranslations } from "next-intl";

export interface ToolCard {
  path: string;
  title: string;
  description: string;
}

export const TOOLS: { key: string; path: string }[] = [
  { key: "base64", path: "/base64" },
  { key: "password", path: "/password" },
  { key: "hashing", path: "/hashing" },
  { key: "cipher", path: "/cipher" },
  { key: "checksum", path: "/checksum" },
  { key: "ascii", path: "/ascii" },
  { key: "htmlcode", path: "/htmlcode" },
  { key: "storageunit", path: "/storageunit" },
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
