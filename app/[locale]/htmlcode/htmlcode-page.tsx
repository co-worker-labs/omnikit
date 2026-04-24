"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import Layout from "../../../components/layout";
import {
  getLetters,
  CharacterData,
  getPunctuations,
  getCurrencies,
  getMathematical,
  getDiacritics,
  getAscii,
  getIcons,
  getPronunciations,
  PronunciationCharacterData,
} from "../../../libs/htmlcode";
import { NeonTabs } from "../../../components/ui/tabs";
import { StyledInput } from "../../../components/ui/input";

function printEntityName(code: string | undefined) {
  if (code && code.startsWith("&")) {
    return <code className="text-accent-cyan">{code}</code>;
  }
  return code;
}

function PronunciationPrinter({
  desc,
  list,
}: {
  list: PronunciationCharacterData[];
  desc: string;
}) {
  const t = useTranslations("htmlcode");
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filtered = !q
    ? list
    : list.filter((data) => {
        const fields = [data.entityName, data.ipaEntityName, data.code, data.ipaCode, data.example];
        return fields.some((f) => f?.toLowerCase().includes(q));
      });

  return (
    <div>
      <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 mb-3">
        <span className="text-sm text-fg-secondary leading-relaxed">{desc}</span>
      </div>
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
                  {t("tableHeaders.character")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.entityName")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.entityCode")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.ipa")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.ipaEntityName")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.ipaEntityCode")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.example")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((data, idx) => {
                const isLast = idx === filtered.length - 1;
                return (
                  <tr
                    key={idx}
                    className={`border-b border-border-default transition-colors duration-150 hover:bg-bg-elevated/60 ${isLast ? "border-b-0" : ""}`}
                  >
                    <td className="py-2.5 px-3 text-sm">
                      <span dangerouslySetInnerHTML={{ __html: data.code }}></span>
                    </td>
                    <td className="py-2.5 px-3 text-sm">{printEntityName(data.entityName)}</td>
                    <td className="py-2.5 px-3 text-sm font-mono text-fg-secondary">{data.code}</td>
                    <td className="py-2.5 px-3 text-sm">
                      {data.ipaCode ? (
                        <span dangerouslySetInnerHTML={{ __html: data.ipaCode }}></span>
                      ) : (
                        <span className="text-fg-muted">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-sm">
                      {printEntityName(data.ipaEntityName) || (
                        <span className="text-fg-muted">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-sm font-mono text-fg-secondary">
                      {data.ipaCode || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-sm">
                      <span dangerouslySetInnerHTML={{ __html: data.example }}></span>
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
        {filtered.length} / {list.length}
      </div>
    </div>
  );
}

function CharacterPrinter({ desc, list }: { list: CharacterData[]; desc: string }) {
  const t = useTranslations("htmlcode");
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filtered = !q
    ? list
    : list.filter((data) => {
        const dec = data.entityNumber.toString();
        const hex = data.entityNumber.toString(16).toUpperCase();
        const char = String.fromCharCode(data.entityNumber);
        return (
          dec.includes(q) ||
          hex.toLowerCase().includes(q) ||
          char.toLowerCase().includes(q) ||
          data.description.toLowerCase().includes(q) ||
          (data.entityName?.toLowerCase().includes(q) ?? false)
        );
      });

  return (
    <div>
      <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 mb-3">
        <span className="text-sm text-fg-secondary leading-relaxed">{desc}</span>
      </div>
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
                  {t("tableHeaders.character")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.entityName")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.entityNumber")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.hexCode")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.description")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((data, idx) => {
                const isLast = idx === filtered.length - 1;
                return (
                  <tr
                    key={idx}
                    className={`border-b border-border-default transition-colors duration-150 hover:bg-bg-elevated/60 ${isLast ? "border-b-0" : ""}`}
                  >
                    <td className="py-2.5 px-3 text-lg font-mono">
                      <span
                        dangerouslySetInnerHTML={{
                          __html: "&#" + data.entityNumber + ";",
                        }}
                      ></span>
                    </td>
                    <td className="py-2.5 px-3 text-sm">{printEntityName(data.entityName)}</td>
                    <td className="py-2.5 px-3 text-sm font-mono text-fg-secondary">
                      {"&#" + data.entityNumber + ";"}
                    </td>
                    <td className="py-2.5 px-3 text-sm font-mono text-fg-secondary">
                      {"&#x" + data.entityNumber.toString(16).toUpperCase() + ";"}
                    </td>
                    <td className="py-2.5 px-3 text-sm text-fg-secondary">{data.description}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-fg-muted text-sm">
                    No results found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-2 text-xs text-fg-muted text-right">
        {filtered.length} / {list.length}
      </div>
    </div>
  );
}

function PrintLetters({ list }: { list: CharacterData[] }) {
  const t = useTranslations("htmlcode");
  const [search, setSearch] = useState("");

  const letters: number[] = [];
  for (let i = "A".charCodeAt(0); i <= "Z".charCodeAt(0); i++) {
    letters.push(i);
  }

  const q = search.trim().toLowerCase();
  const filtered = !q
    ? list
    : list.filter((data) => {
        const dec = data.entityNumber.toString();
        const hex = data.entityNumber.toString(16).toUpperCase();
        const char = String.fromCharCode(data.entityNumber);
        return (
          dec.includes(q) ||
          hex.toLowerCase().includes(q) ||
          char.toLowerCase().includes(q) ||
          data.description.toLowerCase().includes(q) ||
          (data.entityName?.toLowerCase().includes(q) ?? false)
        );
      });

  return (
    <div>
      <div className="mb-3 bg-bg-surface border border-border-default rounded-lg p-3">
        <div className="flex flex-wrap gap-1">
          {letters.map((code) => {
            const chr = String.fromCharCode(code);
            return (
              <a
                key={"letters-goto-" + chr}
                className="w-8 h-8 flex items-center justify-center rounded-md text-sm font-mono font-medium text-fg-secondary hover:bg-accent-cyan-dim hover:text-accent-cyan transition-colors duration-150"
                href={"#letters-" + chr}
              >
                {chr}
              </a>
            );
          })}
        </div>
      </div>
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
                  {t("tableHeaders.character")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.entityName")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.entityNumber")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.hexCode")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                  {t("tableHeaders.description")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((data, idx) => {
                const isLast = idx === filtered.length - 1;
                const chr = String.fromCharCode(data.entityNumber);
                const isLetter = chr >= "A" && chr <= "Z";
                return (
                  <tr
                    key={idx}
                    id={isLetter ? "letters-" + chr : undefined}
                    className={`border-b border-border-default transition-colors duration-150 hover:bg-bg-elevated/60 ${isLast ? "border-b-0" : ""} ${isLetter ? "bg-accent-cyan-dim/5" : ""}`}
                  >
                    <td className="py-2.5 px-3 text-lg font-mono font-medium">{chr}</td>
                    <td className="py-2.5 px-3 text-sm">{printEntityName(data.entityName)}</td>
                    <td className="py-2.5 px-3 text-sm font-mono text-fg-secondary">
                      {"&#" + data.entityNumber + ";"}
                    </td>
                    <td className="py-2.5 px-3 text-sm font-mono text-fg-secondary">
                      {"&#x" + data.entityNumber.toString(16).toUpperCase() + ";"}
                    </td>
                    <td className="py-2.5 px-3 text-sm text-fg-secondary">{data.description}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-fg-muted text-sm">
                    No results found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-2 text-xs text-fg-muted text-right">
        {filtered.length} / {list.length}
      </div>
    </div>
  );
}

function Description() {
  const t = useTranslations("htmlcode");
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="description" className="py-3">
      <div className="relative">
        <div
          className={`overflow-hidden transition-all duration-300 ${
            expanded ? "max-h-[500px]" : "max-h-20"
          }`}
        >
          <p className="text-fg-secondary text-sm leading-8 indent-12">{t("description.p1")}</p>
          <p className="text-fg-secondary text-sm leading-8 indent-12">{t("description.p2")}</p>
          <div className="mt-3">
            <pre className="inline-block border border-border-default rounded-lg py-2 px-5 bg-bg-elevated text-fg-secondary font-mono text-sm">
              &lt;meta charset=&quot;utf-8&quot; &gt;
            </pre>
          </div>
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
            {t("description.showLess")}
          </>
        ) : (
          <>
            <ChevronDown size={14} />
            {t("description.showMore")}
          </>
        )}
      </button>
    </section>
  );
}

export default function HtmlCodePage() {
  const t = useTranslations("tools");
  const th = useTranslations("htmlcode");

  const letters = getLetters();
  const punctuations = getPunctuations();
  const currencies = getCurrencies();
  const mathematical = getMathematical();
  const diacritics = getDiacritics();
  const ascii = getAscii();
  const icons = getIcons();
  const pronunciations = getPronunciations();

  return (
    <Layout title={t("htmlcode.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <Description />
        <section>
          <NeonTabs
            tabs={[
              {
                label: <span className="font-mono text-sm font-bold">{th("tabs.letters")}</span>,
                content: <PrintLetters list={letters} />,
              },
              {
                label: (
                  <span className="font-mono text-sm font-bold">{th("tabs.punctuation")}</span>
                ),
                content: (
                  <CharacterPrinter desc={th("tabDescriptions.punctuation")} list={punctuations} />
                ),
              },
              {
                label: <span className="font-mono text-sm font-bold">{th("tabs.currencies")}</span>,
                content: (
                  <CharacterPrinter desc={th("tabDescriptions.currencies")} list={currencies} />
                ),
              },
              {
                label: (
                  <span className="font-mono text-sm font-bold">{th("tabs.mathematical")}</span>
                ),
                content: (
                  <CharacterPrinter desc={th("tabDescriptions.mathematical")} list={mathematical} />
                ),
              },
              {
                label: (
                  <span className="font-mono text-sm font-bold">{th("tabs.pronunciations")}</span>
                ),
                content: (
                  <PronunciationPrinter
                    desc={th("tabDescriptions.pronunciations")}
                    list={pronunciations}
                  />
                ),
              },
              {
                label: <span className="font-mono text-sm font-bold">{th("tabs.diacritics")}</span>,
                content: (
                  <CharacterPrinter desc={th("tabDescriptions.diacritics")} list={diacritics} />
                ),
              },
              {
                label: <span className="font-mono text-sm font-bold">{th("tabs.ascii")}</span>,
                content: <CharacterPrinter desc={th("tabDescriptions.ascii")} list={ascii} />,
              },
              {
                label: <span className="font-mono text-sm font-bold">{th("tabs.icons")}</span>,
                content: <CharacterPrinter desc={th("tabDescriptions.icons")} list={icons} />,
              },
            ]}
          />
        </section>
      </div>
    </Layout>
  );
}
