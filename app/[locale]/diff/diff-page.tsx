"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { useIsMobile } from "../../../hooks/use-is-mobile";
import { showToast } from "../../../libs/toast";
import { STORAGE_KEYS } from "../../../libs/storage-keys";
import {
  compute,
  runDiffSync,
  AUTO_COMPUTE_MAX_BYTES,
  WORKER_THRESHOLD,
  DEBOUNCE_MS,
} from "../../../libs/diff/compute";
import { normalize } from "../../../libs/diff/normalize";
import { looksLikeJson } from "../../../libs/diff/json-tokenizer";
import type { DiffRowData } from "../../../libs/diff/types";
import { DiffInput } from "./components/DiffInput";
import { DiffToolbar, type DiffOptions, type LayoutMode } from "./components/DiffToolbar";
import { DiffViewer, type ViewMode, type ViewerState } from "./components/DiffViewer";

const DEFAULT_OPTIONS: DiffOptions = {
  ignoreWhitespace: false,
  ignoreCase: false,
};

type DiffPersisted = {
  viewMode: ViewMode;
  layoutMode: LayoutMode;
};

const DEFAULT_PERSISTED: DiffPersisted = {
  viewMode: "side",
  layoutMode: "horizontal",
};

function readPersisted(): DiffPersisted {
  if (typeof window === "undefined") return DEFAULT_PERSISTED;
  const raw = window.localStorage.getItem(STORAGE_KEYS.diff);
  if (!raw) return DEFAULT_PERSISTED;
  try {
    const parsed = JSON.parse(raw) as Partial<DiffPersisted>;
    return {
      viewMode: parsed.viewMode === "inline" ? "inline" : "side",
      layoutMode: parsed.layoutMode === "vertical" ? "vertical" : "horizontal",
    };
  } catch {
    return DEFAULT_PERSISTED;
  }
}

function DiffPageBody() {
  const t = useTranslations("diff");
  const tc = useTranslations("common");

  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("side");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("horizontal");
  const [options, setOptions] = useState<DiffOptions>(DEFAULT_OPTIONS);
  const [hydrated, setHydrated] = useState(false);

  const [rows, setRows] = useState<DiffRowData[] | null>(null);
  const [unifiedPatch, setUnifiedPatch] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [computing, setComputing] = useState(false);

  const isMobile = useIsMobile();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const persisted = readPersisted();
    setViewMode(persisted.viewMode);
    setLayoutMode(persisted.layoutMode);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: DiffPersisted = { viewMode, layoutMode };
    window.localStorage.setItem(STORAGE_KEYS.diff, JSON.stringify(payload));
  }, [viewMode, layoutMode, hydrated]);

  const bothEmpty = original.length === 0 && modified.length === 0;
  const tooLargeForAuto =
    original.length >= AUTO_COMPUTE_MAX_BYTES || modified.length >= AUTO_COMPUTE_MAX_BYTES;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestCallIdRef = useRef(0);

  function runDiff() {
    if (bothEmpty) {
      setRows(null);
      setUnifiedPatch("");
      setHasChanges(false);
      setComputing(false);
      return;
    }
    const n1 = normalize(original);
    const n2 = normalize(modified);
    const totalSize = n1.length + n2.length;

    if (totalSize < WORKER_THRESHOLD) {
      const res = runDiffSync(n1, n2, options.ignoreWhitespace, options.ignoreCase);
      setRows(res.rows);
      setUnifiedPatch(res.unifiedPatch);
      setHasChanges(res.hasChanges);
      setComputing(false);
      return;
    }

    const callId = ++latestCallIdRef.current;
    setComputing(true);
    compute(n1, n2, options.ignoreWhitespace, options.ignoreCase)
      .then((res) => {
        if (callId !== latestCallIdRef.current) return;
        setRows(res.rows);
        setUnifiedPatch(res.unifiedPatch);
        setHasChanges(res.hasChanges);
        setComputing(false);
      })
      .catch(() => {
        if (callId !== latestCallIdRef.current) return;
        showToast(t("workerFailed"), "danger", 3000);
        setRows(null);
        setUnifiedPatch("");
        setHasChanges(false);
        setComputing(false);
      });
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (bothEmpty) {
      setRows(null);
      setUnifiedPatch("");
      setHasChanges(false);
      return;
    }
    if (tooLargeForAuto) {
      setRows(null);
      setUnifiedPatch("");
      setHasChanges(false);
      setComputing(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runDiff, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original, modified, options, bothEmpty, tooLargeForAuto]);

  const effectiveViewMode: ViewMode = isMobile ? "inline" : viewMode;
  const effectiveLayoutMode: LayoutMode = isMobile ? "vertical" : layoutMode;

  let viewerState: ViewerState;
  if (bothEmpty) {
    viewerState = { kind: "idle" };
  } else if (tooLargeForAuto && !computing && rows === null) {
    viewerState = { kind: "manualHint", onCompare: runDiff };
  } else if (computing) {
    viewerState = { kind: "computing" };
  } else if (rows && rows.length > 0 && !hasChanges) {
    viewerState = { kind: "equal" };
  } else if (rows && hasChanges) {
    viewerState = { kind: "result", rows };
  } else if (rows && rows.length === 0) {
    viewerState = { kind: "equal" };
  } else {
    viewerState = { kind: "idle" };
  }

  const jsonMode = looksLikeJson(original) && looksLikeJson(modified);

  function onSwap() {
    setOriginal(modified);
    setModified(original);
  }

  function onClearAll() {
    setOriginal("");
    setModified("");
    setRows(null);
    setUnifiedPatch("");
    setHasChanges(false);
    showToast(tc("allCleared"), "danger", 2000);
  }

  function onCopyDiff() {
    if (unifiedPatch) {
      void navigator.clipboard.writeText(unifiedPatch);
    }
  }

  return (
    <>
      <div
        className={
          effectiveLayoutMode === "horizontal"
            ? "grid grid-cols-1 md:grid-cols-2 gap-4"
            : "flex flex-col gap-4"
        }
      >
        <DiffInput
          value={original}
          onChange={setOriginal}
          label={t("textA")}
          placeholder={t("textAPlaceholder")}
          accent="cyan"
          containerHeight={effectiveLayoutMode === "vertical" ? "25vh" : "35vh"}
        />
        <DiffInput
          value={modified}
          onChange={setModified}
          label={t("textB")}
          placeholder={t("textBPlaceholder")}
          accent="purple"
          containerHeight={effectiveLayoutMode === "vertical" ? "25vh" : "35vh"}
        />
      </div>

      <DiffToolbar
        viewMode={effectiveViewMode}
        onViewModeChange={setViewMode}
        layoutMode={effectiveLayoutMode}
        onLayoutModeChange={setLayoutMode}
        options={options}
        onOptionsChange={setOptions}
        onSwap={onSwap}
        onClearAll={onClearAll}
        onCopyDiff={onCopyDiff}
        hideViewToggle={isMobile}
        hideLayoutToggle={isMobile}
        canSwap={original.length > 0 || modified.length > 0}
        canCopyDiff={hasChanges && unifiedPatch.length > 0}
        canClearAll={original.length > 0 || modified.length > 0}
      />

      <DiffViewer state={viewerState} viewMode={effectiveViewMode} jsonMode={jsonMode} />
    </>
  );
}

function Description() {
  const t = useTranslations("diff");
  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">{t("descriptions.whatIsTitle")}</h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.whatIsP1")}</p>
          <p>{t("descriptions.whatIsP2")}</p>
        </div>
      </div>
      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">{t("descriptions.howTitle")}</h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.howP1")}</p>
          <p>{t("descriptions.howP2")}</p>
        </div>
      </div>
      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">
          {t("descriptions.algorithmTitle")}
        </h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.algorithmP1")}</p>
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
      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">
          {t("descriptions.limitationsTitle")}
        </h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.limitationsP1")}</p>
          <p>{t("descriptions.limitationsP2")}</p>
          <p>{t("descriptions.limitationsP3")}</p>
        </div>
      </div>
    </section>
  );
}

export default function DiffPage() {
  const tc = useTranslations("common");
  const tTools = useTranslations("tools");
  const title = tTools("diff.shortTitle");

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>

        <DiffPageBody />
        <Description />
      </div>
    </Layout>
  );
}
