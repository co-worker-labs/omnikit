import { GetStaticProps, InferGetStaticPropsType } from "next";
import { useState, useMemo } from "react";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout";
import { ControlCode, getControlCodes, getPrintableCharacters } from "../libs/ascii";
import { findTool, ToolData } from "../libs/tools";
import { NeonTabs } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { StyledInput } from "../components/ui/input";

function beautyPrint(
  code: number,
  radix: number,
  perLen: number,
  minLen: number,
  fillChar: string
) {
  let str = code.toString(radix);
  const fillCount = str.length % perLen;
  if (fillCount > 0) {
    let prefix = "";
    for (let i = 0; i < perLen - fillCount; i++) {
      prefix += fillChar;
    }
    str = prefix + str;
  }
  if (str.length < minLen) {
    for (let i = 0; i < minLen - str.length; i++) {
      str = fillChar + str;
    }
  }
  const divided = str.length / perLen;
  if (divided == 1) {
    return str;
  } else {
    const result: string[] = [];
    for (let i = 0; i < divided; i++) {
      const start = i * perLen;
      result.push(str.substring(start, start + perLen));
    }
    return (
      <>
        {result.map((data, index) => {
          if (index == result.length - 1) {
            return (
              <span key={code + "_" + radix + "_" + index} className="text-accent-cyan">
                {data}
              </span>
            );
          } else {
            return <span key={code + "_" + radix + "_" + index}>{data}&nbsp;&nbsp;</span>;
          }
        })}
      </>
    );
  }
}

function ControlCodeChart({ list }: { list: ControlCode[] }) {
  const { t } = useTranslation("ascii");
  return (
    <div className="rounded-lg border border-border-default overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead className="bg-bg-elevated/40">
            <tr className="border-b border-border-default">
              <th className="py-2.5 px-4 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                {t("tableHeaders.decimal")}
              </th>
              <th className="py-2.5 px-4 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                {t("tableHeaders.binary")}
              </th>
              <th className="py-2.5 px-4 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                {t("tableHeaders.oct")}
              </th>
              <th className="py-2.5 px-4 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                {t("tableHeaders.hex")}
              </th>
              <th className="py-2.5 px-4 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                {t("tableHeaders.abbr")}
              </th>
              <th className="py-2.5 px-4 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                {t("tableHeaders.desc")}
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((data, idx) => {
              const isLast = idx === list.length - 1;
              return (
                <tr
                  key={data.code}
                  className={`border-b border-border-default transition-colors duration-150 hover:bg-bg-elevated/60 ${isLast ? "border-b-0" : ""}`}
                >
                  <td className="py-2.5 px-4 text-sm text-fg-secondary">{data.code}</td>
                  <td className="py-2.5 px-4 text-sm font-mono">
                    {beautyPrint(data.code, 2, 4, 8, "0")}
                  </td>
                  <td className="py-2.5 px-4 text-sm font-mono">
                    {beautyPrint(data.code, 8, 3, 3, "0")}
                  </td>
                  <td className="py-2.5 px-4 text-sm font-mono uppercase">
                    {beautyPrint(data.code, 16, 2, 2, "0")}
                  </td>
                  <td className="py-2.5 px-4 text-sm uppercase">
                    {data.popular ? <Badge variant="danger">{data.abbr}</Badge> : data.abbr}
                  </td>
                  <td className="py-2.5 px-4 text-sm">
                    {data.popular ? (
                      <span className="text-danger font-medium">{data.desc}</span>
                    ) : (
                      <span className="text-fg-secondary">{data.desc}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getCharCategory(code: number): "digit" | "upper" | "lower" | "special" {
  if (code >= 48 && code <= 57) return "digit";
  if (code >= 65 && code <= 90) return "upper";
  if (code >= 97 && code <= 122) return "lower";
  return "special";
}

const categoryBadge: Record<
  string,
  { variant: "cyan" | "purple" | "default" | "danger"; label: string }
> = {
  digit: { variant: "cyan", label: "0-9" },
  upper: { variant: "purple", label: "A-Z" },
  lower: { variant: "default", label: "a-z" },
  special: { variant: "danger", label: "SYM" },
};

function PrintableCharacters({ list }: { list: number[] }) {
  const { t } = useTranslation("ascii");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((code) => {
      const dec = code.toString();
      const hex = code.toString(16).toUpperCase();
      const char = String.fromCharCode(code);
      return dec.includes(q) || hex.toLowerCase().includes(q) || char.toLowerCase().includes(q);
    });
  }, [list, search]);

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
      <div className="rounded-lg border border-border-default overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center">
            <thead className="bg-bg-elevated/40">
              <tr className="border-b border-border-default">
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.decimal")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.binary")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.oct")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.hex")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.html")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  Type
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.glyph")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((data, idx) => {
                const isLast = idx === filtered.length - 1;
                const cat = getCharCategory(data);
                const char = String.fromCharCode(data);
                const isSectionStart = [48, 65, 97].includes(data);
                const badge = categoryBadge[cat];
                return (
                  <tr
                    key={data}
                    className={`border-b border-border-default transition-colors duration-150 hover:bg-bg-elevated/60 ${isLast ? "border-b-0" : ""} ${isSectionStart ? "bg-accent-purple-dim/10" : ""}`}
                  >
                    <td className="py-2 px-3 text-sm text-fg-secondary">{data}</td>
                    <td className="py-2 px-3 text-sm font-mono">
                      {beautyPrint(data, 2, 4, 8, "0")}
                    </td>
                    <td className="py-2 px-3 text-sm font-mono">
                      {beautyPrint(data, 8, 3, 3, "0")}
                    </td>
                    <td className="py-2 px-3 text-sm font-mono uppercase">
                      {beautyPrint(data, 16, 2, 2, "0")}
                    </td>
                    <td className="py-2 px-3 text-sm">
                      <code className="text-accent-cyan">{"&#" + data + ";"}</code>
                    </td>
                    <td className="py-2 px-3 text-sm">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="py-2 px-3 text-lg font-mono">
                      {char === " " ? (
                        <span className="text-fg-muted text-xs" title="Space (U+0020)">
                          ␣
                        </span>
                      ) : (
                        <span
                          className={
                            cat === "digit"
                              ? "text-accent-cyan"
                              : cat === "special"
                                ? "text-danger"
                                : "text-fg-primary"
                          }
                        >
                          {char}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-fg-muted text-sm">
                    No results found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-2 text-xs text-fg-muted text-right">
        {filtered.length} / {list.length} {t("printableCharacters").toLowerCase()}
      </div>
    </div>
  );
}

function AsciiPage({
  toolData,
  printableCharacters,
  controlCodes,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const { t } = useTranslation(["ascii", "common", "tools"]);
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <ToolPageHeadBuilder toolPath="/ascii" />
      <Layout title={t("tools:ascii.title")}>
        <div className="container mx-auto px-4 pt-3 pb-6">
          <section id="description" className="py-3">
            <div className="relative">
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  expanded ? "max-h-[500px]" : "max-h-20"
                }`}
              >
                <p className="text-fg-secondary text-sm leading-8 indent-12">
                  {t("ascii:description.text")}
                </p>
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
                  {t("ascii:description.showLess")}
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  {t("ascii:description.showMore")}
                </>
              )}
            </button>
          </section>
          <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
            <span className="text-sm text-fg-secondary leading-relaxed">{t("ascii:tip")}</span>
          </div>
          <section>
            <NeonTabs
              tabs={[
                {
                  label: (
                    <span className="font-mono text-sm font-bold">
                      {t("ascii:printableCharacters")}
                    </span>
                  ),
                  content: <PrintableCharacters list={printableCharacters} />,
                },
                {
                  label: (
                    <span className="font-mono text-sm font-bold">
                      {t("ascii:controlCodeCharts")}
                    </span>
                  ),
                  content: <ControlCodeChart list={controlCodes} />,
                },
              ]}
            />
          </section>
        </div>
      </Layout>
    </>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const locale = context.locale || "en";
  const path = "/ascii";
  const toolData: ToolData = findTool(path);
  const printableCharacters: number[] = getPrintableCharacters();
  const controlCodes: ControlCode[] = getControlCodes();

  return {
    props: {
      toolData: toolData,
      printableCharacters: printableCharacters,
      controlCodes: controlCodes,
      ...(await serverSideTranslations(locale, ["common", "ascii", "tools"])),
    },
  };
};

export default AsciiPage;
