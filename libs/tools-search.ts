import fuzzysort from "fuzzysort";
import type { ToolCard } from "./tools";

export function searchTools(query: string, tools: ToolCard[]): ToolCard[] {
  if (!query.trim()) return tools;
  const results = fuzzysort.go(query, tools, {
    keys: ["title", "searchTerms"],
    threshold: -10000,
  });
  return results.map((r) => r.obj);
}
