"use client";

import { useRef, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FolderOpen, Upload, X, Trash2 } from "lucide-react";
import Layout from "../../../components/layout";
import { StyledTextarea, StyledInput } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { NeonTabs } from "../../../components/ui/tabs";
import { showToast } from "../../../libs/toast";
import { useDropZone } from "../../../hooks/useDropZone";
import {
  analyzeText,
  extractKeywords,
  trackKeywords,
  calculateReadingTime,
  calculateSpeakingTime,
} from "../../../libs/wordcounter/main";
import { ENGLISH_STOP_WORDS } from "../../../libs/wordcounter/stop-words";

function Conversion() {
  const t = useTranslations("wordcounter");
  const tc = useTranslations("common");
  const [text, setText] = useState("");
  const [readingWpm, setReadingWpm] = useState(200);
  const [speakingWpm, setSpeakingWpm] = useState(130);
  const [trackedKeywords, setTrackedKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [debouncedText, setDebouncedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dropZone = useDropZone(async (file) => {
    const content = await file.text();
    setText(content);
    showToast(tc("fileLoaded"), "success", 2000);
  });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((content) => {
      setText(content);
      showToast(tc("fileLoaded"), "success", 2000);
    });
    e.target.value = "";
  }

  const stats = analyzeText(text);
  const readingSeconds = calculateReadingTime(stats.words, stats.cjkCharacters, readingWpm);
  const speakingSeconds = calculateSpeakingTime(stats.words, stats.cjkCharacters, speakingWpm);

  function formatDuration(seconds: number): string {
    if (seconds === 0) return t("timeLessThan", { unit: t("timeSecUnit") });
    const rounded = Math.round(seconds);
    if (rounded >= 3600) {
      const hours = Math.floor(rounded / 3600);
      const mins = Math.floor((rounded % 3600) / 60);
      return t("timeHourFormat", { hours, minutes: mins });
    }
    const mins = Math.floor(rounded / 60);
    const secs = rounded % 60;
    if (mins === 0) return `${secs} ${t("timeSecUnit")}`;
    return t("timeMinFormat", { minutes: mins, seconds: secs });
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText(text), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const keywords = extractKeywords(debouncedText, ENGLISH_STOP_WORDS);
  const trackedResults = trackKeywords(debouncedText, trackedKeywords);

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    if (trackedKeywords.some((k) => k.toLowerCase() === trimmed.toLowerCase())) {
      showToast(t("keywordExists"), "danger", 2000);
      return;
    }
    setTrackedKeywords([...trackedKeywords, trimmed]);
    setNewKeyword("");
    showToast(t("keywordAdded"), "success", 2000);
  };

  const removeKeyword = (kw: string) => {
    setTrackedKeywords(trackedKeywords.filter((k) => k !== kw));
    showToast(t("keywordRemoved"), "danger", 2000);
  };

  const statCards = [
    { label: t("words"), value: stats.words },
    { label: t("characters"), value: stats.characters },
    { label: t("readingTime"), value: formatDuration(readingSeconds) },
    { label: t("speakingTime"), value: formatDuration(speakingSeconds) },
  ];

  return (
    <section id="conversion">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-bg-surface border border-border-default rounded-xl p-4 text-center"
          >
            <div className="text-xs text-fg-muted mb-1">{card.label}</div>
            <div className="text-2xl font-bold text-accent-cyan font-mono">{card.value}</div>
          </div>
        ))}
      </div>

      <div
        className="relative"
        onDragOver={dropZone.onDragOver}
        onDragEnter={dropZone.onDragEnter}
        onDragLeave={dropZone.onDragLeave}
        onDrop={dropZone.onDrop}
      >
        {dropZone.isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-accent-cyan bg-accent-cyan/5 backdrop-blur-sm pointer-events-none">
            <div className="text-center">
              <Upload size={40} className="mx-auto mb-3 text-accent-cyan" />
              <p className="text-lg font-semibold text-accent-cyan">{tc("dropActive")}</p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-1.5">
          <button
            type="button"
            className="text-fg-secondary text-xs hover:text-fg-primary transition-colors cursor-pointer inline-flex items-center gap-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <FolderOpen size={12} />
            {tc("loadFile")}
          </button>
          {text && (
            <button
              type="button"
              className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer inline-flex items-center gap-1"
              onClick={() => {
                setText("");
                showToast(tc("cleared"), "danger", 2000);
              }}
            >
              <X size={12} />
              {tc("clear")}
            </button>
          )}
        </div>
        <StyledTextarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("textareaPlaceholder")}
          className="font-mono h-[30vh] resize-y"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.log,.csv,.json,.html,.xml,.yaml,.yml,.text"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      <div className="mt-2 text-xs text-fg-muted font-mono">
        {t("charactersNoSpaces")}: {stats.charactersNoSpaces} · {t("sentences")}: {stats.sentences}{" "}
        · {t("paragraphs")}: {stats.paragraphs} · {t("cjkCharacters")}: {stats.cjkCharacters}
      </div>

      <div className="mt-4">
        <NeonTabs
          tabs={[
            {
              label: <span className="font-mono text-sm">{t("tabOverview")}</span>,
              content: (
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <label className="flex items-center gap-2 text-sm text-fg-secondary">
                    {t("readingSpeed")}:
                    <input
                      type="number"
                      value={readingWpm}
                      onChange={(e) => setReadingWpm(Number(e.target.value) || 200)}
                      min={1}
                      className="w-20 bg-bg-input border border-border-default rounded px-2 py-1 text-sm font-mono text-fg-primary"
                    />
                    {t("wpm")}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-fg-secondary">
                    {t("speakingSpeed")}:
                    <input
                      type="number"
                      value={speakingWpm}
                      onChange={(e) => setSpeakingWpm(Number(e.target.value) || 130)}
                      min={1}
                      className="w-20 bg-bg-input border border-border-default rounded px-2 py-1 text-sm font-mono text-fg-primary"
                    />
                    {t("wpm")}
                  </label>
                </div>
              ),
            },
            {
              label: <span className="font-mono text-sm">{t("tabKeywords")}</span>,
              content: (
                <div className="mt-4">
                  {keywords.words.length === 0 && keywords.bigrams.length === 0 ? (
                    <p className="text-sm text-fg-muted">{t("noKeywords")}</p>
                  ) : (
                    <>
                      <div>
                        <h4 className="text-sm font-semibold text-fg-secondary mb-2">
                          {t("topWords")}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {keywords.words.map((kw) => (
                            <span
                              key={kw.term}
                              className="inline-flex items-center gap-1 bg-bg-elevated border border-border-default rounded-full px-3 py-1 text-xs font-mono"
                            >
                              {kw.term} <span className="text-accent-cyan">{kw.count}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      {keywords.bigrams.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-fg-secondary mb-2">
                            {t("topPhrases")}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {keywords.bigrams.map((kw) => (
                              <span
                                key={kw.term}
                                className="inline-flex items-center gap-1 bg-bg-elevated border border-border-default rounded-full px-3 py-1 text-xs font-mono"
                              >
                                {kw.term} <span className="text-accent-cyan">{kw.count}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ),
            },
            {
              label: <span className="font-mono text-sm">{t("tabCustomTrack")}</span>,
              content: (
                <div className="mt-4">
                  <div className="flex gap-2">
                    <StyledInput
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder={t("addKeyword")}
                      className="font-mono text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addKeyword();
                      }}
                    />
                    <Button variant="primary" size="sm" onClick={addKeyword}>
                      {t("add")}
                    </Button>
                  </div>
                  {trackedKeywords.length === 0 ? (
                    <p className="mt-3 text-sm text-fg-muted">{t("noTrackedKeywords")}</p>
                  ) : (
                    <div className="mt-3 space-y-1">
                      {trackedResults.map((tk) => (
                        <div
                          key={tk.keyword}
                          className="flex items-center gap-3 text-sm font-mono py-1 px-2 rounded hover:bg-bg-elevated/40"
                        >
                          <span className="flex-1 text-fg-primary">{tk.keyword}</span>
                          <span className="text-accent-cyan">{tk.count}</span>
                          <span className="text-fg-muted w-16 text-right">
                            {tk.density.toFixed(1)}%
                          </span>
                          <button
                            onClick={() => removeKeyword(tk.keyword)}
                            className="text-fg-muted hover:text-danger cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}

export default function WordCounterPage() {
  const t = useTranslations("tools");
  const tc = useTranslations("common");
  return (
    <Layout title={t("wordcounter.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>
        <Conversion />
      </div>
    </Layout>
  );
}
