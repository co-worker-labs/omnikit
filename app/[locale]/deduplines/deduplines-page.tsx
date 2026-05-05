"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { StyledTextarea, StyledCheckbox } from "../../../components/ui/input";
import { CopyButton } from "../../../components/ui/copy-btn";
import { showToast } from "../../../libs/toast";
import { dedupLines, defaultOptions } from "../../../libs/deduplines/main";
import type { DedupOptions } from "../../../libs/deduplines/main";

function Conversion() {
  const t = useTranslations("deduplines");
  const tc = useTranslations("common");
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<DedupOptions>(defaultOptions);

  const result = dedupLines(input, options);
  const hasInput = input.length > 0;
  const hasDuplicates = result.removedCount > 0;

  return (
    <section id="conversion">
      <div>
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan/60" />
            <span className="font-mono text-sm font-semibold text-accent-cyan">
              {tc("plainText")}
            </span>
          </div>
          <button
            type="button"
            className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
            onClick={() => {
              setInput("");
              showToast(tc("cleared"), "danger", 2000);
            }}
          >
            {tc("clear")}
          </button>
        </div>
        <div className="relative mt-1">
          <StyledTextarea
            placeholder={t("inputPlaceholder")}
            rows={8}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="font-mono text-sm"
          />
          <CopyButton getContent={() => input} className="absolute end-2 top-2" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <StyledCheckbox
          label={t("options.caseSensitive")}
          checked={options.caseSensitive}
          onChange={(e) => setOptions({ ...options, caseSensitive: e.target.checked })}
        />
        <StyledCheckbox
          label={t("options.trimLines")}
          checked={options.trimLines}
          onChange={(e) => setOptions({ ...options, trimLines: e.target.checked })}
        />
        <StyledCheckbox
          label={t("options.removeEmpty")}
          checked={options.removeEmpty}
          onChange={(e) => setOptions({ ...options, removeEmpty: e.target.checked })}
        />
      </div>

      {hasInput && (
        <>
          <div className="mt-3 flex flex-wrap justify-between items-center">
            <span className="text-fg-muted text-sm font-mono">
              {hasDuplicates
                ? t("stats", {
                    original: result.originalCount,
                    result: result.resultCount,
                    removed: result.removedCount,
                  })
                : t("statsNoDupes", { original: result.originalCount })}
            </span>
            <CopyButton getContent={() => result.output} />
          </div>
          <div className="relative mt-1">
            <StyledTextarea
              readOnly
              placeholder={t("outputPlaceholder")}
              rows={8}
              value={result.output}
              className="font-mono text-sm"
            />
          </div>
        </>
      )}
    </section>
  );
}

function Description() {
  const t = useTranslations("deduplines");
  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">{t("descriptions.whatIsTitle")}</h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.whatIsP1")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">{t("descriptions.howTitle")}</h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.howP1")}</p>
          <p>{t("descriptions.howCase")}</p>
          <p>{t("descriptions.howTrim")}</p>
          <p>{t("descriptions.howEmpty")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">
          {t("descriptions.useCasesTitle")}
        </h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.useCasesP1")}</p>
          <p>{t("descriptions.useCasesP2")}</p>
          <p>{t("descriptions.useCasesP3")}</p>
        </div>
      </div>
    </section>
  );
}

export default function DeduplinesPage() {
  const t = useTranslations("tools");
  const tc = useTranslations("common");
  return (
    <Layout title={t("deduplines.shortTitle")}>
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
