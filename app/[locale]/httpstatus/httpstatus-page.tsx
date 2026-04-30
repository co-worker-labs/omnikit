"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import Layout from "../../../components/layout";
import { Badge } from "../../../components/ui/badge";
import { StyledInput } from "../../../components/ui/input";
import { useIsMobile } from "../../../hooks/use-is-mobile";
import { HttpStatusCode, getCategory, getStatusCodes } from "../../../libs/httpstatus";

const statusCodes = getStatusCodes();

const CATEGORIES = ["all", "1xx", "2xx", "3xx", "4xx", "5xx", "unofficial"] as const;

const categoryBadgeVariant: Record<string, "default" | "cyan" | "purple" | "danger"> = {
  "1xx": "default",
  "2xx": "cyan",
  "3xx": "purple",
  "4xx": "danger",
  "5xx": "danger",
  unofficial: "default",
};

const sourceBadgeVariant: Record<string, "default" | "cyan" | "purple"> = {
  IANA: "default",
  Cloudflare: "cyan",
  Nginx: "purple",
  IIS: "purple",
};

function StatusCodeTable() {
  const t = useTranslations("httpstatus");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [expandedCode, setExpandedCode] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const byCategory =
    category === "all" ? statusCodes : statusCodes.filter((c) => getCategory(c) === category);

  const q = search.trim().toLowerCase();
  const filtered = !q
    ? byCategory
    : byCategory.filter(
        (c) =>
          c.code.toString().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          t(`codes.${c.code}.description`).toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );

  const handleRowHover = (code: number) => {
    if (!isMobile) {
      setExpandedCode(code);
    }
  };

  const handleRowLeave = () => {
    if (!isMobile) {
      setExpandedCode(null);
    }
  };

  const handleRowClick = (code: number) => {
    if (isMobile) {
      setExpandedCode(expandedCode === code ? null : code);
    }
  };

  return (
    <div>
      <div className="relative mb-3">
        <StyledInput
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none"
          size={16}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map((cat) => {
          const isActive = category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
                isActive
                  ? "bg-accent-cyan text-bg-base"
                  : "bg-bg-elevated text-fg-secondary hover:bg-bg-elevated/80"
              }`}
            >
              {t(`categories.${cat}`)}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-border-default overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="grid">
            <thead className="bg-bg-elevated/40">
              <tr className="border-b border-border-default">
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider text-left">
                  {t("tableHeaders.code")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider text-left">
                  {t("tableHeaders.name")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider text-left">
                  {t("tableHeaders.description")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider text-left">
                  {t("tableHeaders.spec")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider text-left">
                  {t("tableHeaders.source")}
                </th>
              </tr>
            </thead>
            {filtered.map((data, idx) => {
              const isLast = idx === filtered.length - 1;
              const cat = getCategory(data);
              const isExpanded = expandedCode === data.code;
              return (
                <tbody key={data.code}>
                  <tr
                    role="row"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onMouseEnter={() => handleRowHover(data.code)}
                    onMouseLeave={handleRowLeave}
                    onClick={() => handleRowClick(data.code)}
                    onFocus={() => setExpandedCode(data.code)}
                    className={`border-b border-border-default transition-colors duration-150 hover:bg-bg-elevated/60 cursor-pointer outline-none ${
                      isLast ? "border-b-0" : ""
                    } ${isExpanded ? "bg-bg-elevated/60" : ""}`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {data.popular && (
                          <span
                            className="text-accent-cyan text-[8px] leading-none"
                            aria-hidden="true"
                          >
                            ●
                          </span>
                        )}
                        <Badge
                          variant={categoryBadgeVariant[cat]}
                          className={`font-mono ${cat === "unofficial" ? "italic" : ""}`}
                        >
                          {data.code}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-sm text-fg-primary font-medium">{data.name}</td>
                    <td className="py-2.5 px-3 text-sm text-fg-secondary">
                      {t(`codes.${data.code}.description`)}
                    </td>
                    <td className="py-2.5 px-3">
                      {data.spec ? (
                        <span className="font-mono text-accent-cyan text-xs">{data.spec}</span>
                      ) : (
                        <span className="text-fg-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={sourceBadgeVariant[data.source || "IANA"]}>
                        {data.source || "IANA"}
                      </Badge>
                    </td>
                  </tr>
                  {isExpanded && data.details && (
                    <tr aria-live="polite" className="bg-bg-elevated/30">
                      <td colSpan={5} className="py-3 px-6">
                        <div className="space-y-3">
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-accent-cyan">
                              {t("detailLabels.usage")}
                            </span>
                            <p className="mt-1 text-sm text-fg-secondary leading-relaxed">
                              {t(`codes.${data.code}.details.usage`)}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-accent-cyan">
                              {t("detailLabels.commonCauses")}
                            </span>
                            <ul className="mt-1 list-disc list-inside space-y-0.5">
                              {(t.raw(`codes.${data.code}.details.commonCauses`) as string[]).map(
                                (cause, i) => (
                                  <li key={i} className="text-sm text-fg-secondary">
                                    {cause}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
            {filtered.length === 0 && (
              <tbody>
                <tr>
                  <td colSpan={5} className="py-8 text-fg-muted text-sm text-center">
                    {t("noResults")}
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>

      <div className="mt-2 text-xs text-fg-muted text-right">
        {filtered.length} / {statusCodes.length} status codes
      </div>
    </div>
  );
}

function Description() {
  const t = useTranslations("httpstatus");
  const tc = useTranslations("common");
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="description" className="py-3">
      <div className="relative">
        <div
          className={`overflow-hidden transition-all duration-300 ${
            expanded ? "max-h-[500px]" : "max-h-20"
          }`}
        >
          <p className="text-fg-secondary text-sm leading-8 indent-12">{t("description.text")}</p>
        </div>
        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-bg-base to-transparent pointer-events-none" />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-1 flex items-center gap-1 text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp size={14} />
            {tc("showLess")}
          </>
        ) : (
          <>
            <ChevronDown size={14} />
            {tc("showMore")}
          </>
        )}
      </button>
    </section>
  );
}

export default function HttpStatusPage() {
  const t = useTranslations("tools");
  const th = useTranslations("httpstatus");

  return (
    <Layout title={t("httpstatus.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <Description />
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">{th("tip")}</span>
        </div>
        <section>
          <StatusCodeTable />
        </section>
      </div>
    </Layout>
  );
}
