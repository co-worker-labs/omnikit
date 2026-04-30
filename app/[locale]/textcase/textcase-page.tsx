"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { StyledInput } from "../../../components/ui/input";
import { CopyButton } from "../../../components/ui/copy-btn";
import { clipInput, detectFormats, convertAll } from "../../../libs/textcase/main";

const REFERENCE_ROWS: { key: string; example: string }[] = [
  { key: "camelCase", example: "myVariableName" },
  { key: "pascalCase", example: "MyVariableName" },
  { key: "snakeCase", example: "my_variable_name" },
  { key: "constantCase", example: "MY_VARIABLE_NAME" },
  { key: "kebabCase", example: "my-variable-name" },
  { key: "dotCase", example: "my.variable.name" },
  { key: "lowerCase", example: "my variable name" },
  { key: "upperCase", example: "MY VARIABLE NAME" },
  { key: "titleCase", example: "My Variable Name" },
  { key: "sentenceCase", example: "My variable name" },
  { key: "pathCase", example: "my/variable/name" },
];

function Conversion() {
  const t = useTranslations("textcase");
  const tc = useTranslations("common");
  const [rawInput, setRawInput] = useState("");

  const { value: input, clipped } = clipInput(rawInput);
  const detected = detectFormats(input);
  const detectedSet = new Set(detected);
  const results = convertAll(input);

  return (
    <section id="conversion">
      <div className="relative">
        <StyledInput
          autoFocus
          type="text"
          value={rawInput}
          placeholder={t("inputPlaceholder")}
          onChange={(e) => setRawInput(e.target.value)}
          className="text-base font-mono pr-9"
        />
        {rawInput && (
          <button
            type="button"
            aria-label={tc("clear")}
            onClick={() => setRawInput("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-primary transition-colors cursor-pointer"
          >
            ×
          </button>
        )}
      </div>
      {clipped && <div className="mt-1 text-xs text-fg-muted font-mono">{t("inputClipped")}</div>}
      {detected.length === 1 && (
        <div className="mt-1 text-xs text-fg-muted font-mono">
          {t("detectedFormat", { format: t(detected[0]) })}
        </div>
      )}
      {input !== "" && (
        <div className="mt-4 rounded-lg border border-border-default overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default bg-bg-elevated/40">
                <th className="py-2 px-4 text-fg-muted text-xs font-mono font-medium text-left whitespace-nowrap uppercase tracking-wider">
                  {t("format")}
                </th>
                <th className="py-2 px-4 text-fg-muted text-xs font-mono font-medium text-left whitespace-nowrap uppercase tracking-wider">
                  {t("output")}
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const isCurrent = detectedSet.has(r.key);
                return (
                  <tr
                    key={r.key}
                    className="border-b border-border-default last:border-b-0 odd:bg-bg-elevated/40 hover:bg-accent-cyan/10"
                  >
                    <th
                      scope="row"
                      className={`py-2.5 px-4 text-xs font-mono font-medium text-left whitespace-nowrap ${
                        isCurrent ? "text-accent-cyan" : "text-fg-secondary"
                      }`}
                    >
                      {t(r.key)}
                      {isCurrent && (
                        <span className="ms-2 inline-block rounded-full bg-accent-cyan/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent-cyan">
                          {t("current")}
                        </span>
                      )}
                    </th>
                    <td className="py-2.5 px-4 font-mono text-sm break-all">{r.output}</td>
                    <td className="py-2.5 px-2 align-middle">
                      <CopyButton
                        getContent={() => r.output}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Description() {
  const t = useTranslations("textcase");
  return (
    <section id="reference" className="mt-6">
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-border-default" />
        <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
          {t("referenceTable")}
        </span>
        <div className="flex-1 h-px bg-border-default" />
      </div>
      <div className="rounded-lg border border-border-default overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default bg-bg-elevated/40">
              <th className="py-2 px-4 text-fg-muted text-xs font-mono font-medium text-left whitespace-nowrap uppercase tracking-wider">
                {t("format")}
              </th>
              <th className="py-2 px-4 text-fg-muted text-xs font-mono font-medium text-left whitespace-nowrap uppercase tracking-wider">
                {t("example")}
              </th>
              <th className="py-2 px-4 text-fg-muted text-xs font-mono font-medium text-left whitespace-nowrap uppercase tracking-wider">
                {t("useCase")}
              </th>
            </tr>
          </thead>
          <tbody>
            {REFERENCE_ROWS.map((row) => (
              <tr
                key={row.key}
                className="border-b border-border-default last:border-b-0 odd:bg-bg-elevated/40 hover:bg-accent-cyan/10"
              >
                <th
                  scope="row"
                  className="py-2.5 px-4 text-fg-secondary text-xs font-mono font-medium text-left whitespace-nowrap"
                >
                  {t(row.key)}
                </th>
                <td className="py-2.5 px-4 font-mono text-sm break-all">{row.example}</td>
                <td className="py-2.5 px-4 text-sm text-fg-secondary">
                  {t(`useCases.${row.key}`)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function TextCasePage() {
  const t = useTranslations("tools");
  const tc = useTranslations("common");
  return (
    <Layout title={t("textcase.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>
        <Conversion />
        <Description />
      </div>
    </Layout>
  );
}
