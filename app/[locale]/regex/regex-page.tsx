"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { StyledInput, StyledTextarea } from "../../../components/ui/input";
import { NeonTabs } from "../../../components/ui/tabs";
import { CopyButton } from "../../../components/ui/copy-btn";
import {
  FLAGS,
  defaultFlags,
  toggleFlag,
  PATTERN_PRESETS,
  PRESET_CATEGORIES,
  stripDelimiters,
  executeRegex,
  executeReplace,
  explainPattern,
} from "../../../libs/regex/main";
import type {
  MatchResult,
  MatchOutput,
  ReplaceOutput,
  TokenExplanation,
} from "../../../libs/regex/main";
import type { FlagDef } from "../../../libs/regex/types";
import { showToast } from "../../../libs/toast";

// --- Flag Checkboxes ---

function FlagCheckboxes({ flags, onToggle }: { flags: string; onToggle: (char: string) => void }) {
  const t = useTranslations("regex");
  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {FLAGS.map((f: FlagDef) => (
        <label
          key={f.char}
          className="flex items-center gap-1.5 cursor-pointer select-none"
          title={t(f.description)}
        >
          <input
            type="checkbox"
            checked={flags.includes(f.char)}
            onChange={() => onToggle(f.char)}
            className="w-4 h-4 rounded border-border-default accent-accent-cyan"
          />
          <span className="text-xs text-fg-secondary font-mono">{f.char}</span>
          <span className="text-xs text-fg-secondary">{t(f.name)}</span>
        </label>
      ))}
    </div>
  );
}

// --- Error Caret ---

function ErrorCaret({ offset }: { offset: number }) {
  return (
    <div
      className="font-mono text-sm text-danger absolute top-full left-0 pt-0.5 pointer-events-none whitespace-pre"
      style={{ paddingLeft: `${offset * 0.6}em` }}
    >
      ^
    </div>
  );
}

// --- Privacy Banner ---

function PrivacyBanner() {
  const tc = useTranslations("common");
  return (
    <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
      <span className="text-sm text-fg-secondary leading-relaxed">
        {tc("alert.notTransferred")}
      </span>
    </div>
  );
}

// --- Match Highlight View ---

function MatchHighlightView({
  text,
  matches,
  hoveredIndex,
  onHover,
  onMatchClick,
}: {
  text: string;
  matches: { value: string; index: number; isZeroWidth: boolean }[];
  hoveredIndex: number | null;
  onHover: (idx: number | null) => void;
  onMatchClick: (idx: number) => void;
}) {
  if (!matches.length) return <span className="text-fg-muted text-sm">{text}</span>;

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  matches.forEach((m, i) => {
    // Non-match segment
    if (m.index > lastEnd) {
      parts.push(<span key={`text-${lastEnd}`}>{text.slice(lastEnd, m.index)}</span>);
    }

    const isHovered = hoveredIndex === i;
    const accent = i % 2 === 0 ? "bg-accent-cyan/20" : "bg-accent-purple/20";

    if (m.isZeroWidth) {
      const refCallback = (el: HTMLSpanElement | null) => {
        if (el && isHovered) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      };
      parts.push(
        <span
          key={`match-${i}`}
          ref={refCallback}
          className={`inline-block w-px h-[1.2em] align-middle ${accent} ${
            isHovered ? "ring-2 ring-accent-cyan rounded-sm" : ""
          }`}
          onMouseEnter={() => onHover(i)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onMatchClick(i)}
          title={`Match ${i + 1}: zero-width`}
        />
      );
    } else {
      const refCallback = (el: HTMLSpanElement | null) => {
        if (el && isHovered) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      };
      parts.push(
        <mark
          key={`match-${i}`}
          ref={refCallback}
          className={`${accent} ${
            isHovered ? "ring-2 ring-accent-cyan rounded-sm" : ""
          } cursor-pointer`}
          onMouseEnter={() => onHover(i)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onMatchClick(i)}
        >
          {m.value}
        </mark>
      );
    }

    lastEnd = m.index + (m.value.length || 0);
  });

  // Remaining text
  if (lastEnd < text.length) {
    parts.push(<span key={`text-${lastEnd}`}>{text.slice(lastEnd)}</span>);
  }

  return <span className="whitespace-pre-wrap break-words text-sm">{parts}</span>;
}

// --- Match List Item ---

function MatchItem({
  match,
  index,
  isHovered,
  onHover,
}: {
  match: MatchResult;
  index: number;
  isHovered: boolean;
  onHover: (idx: number | null) => void;
}) {
  const t = useTranslations("regex");
  const hasGroups = match.groups && Object.keys(match.groups).length > 0;
  const hasGroupValues = match.groupValues && match.groupValues.length > 1;

  return (
    <div
      className={`bg-bg-surface rounded-lg p-3 cursor-pointer transition-colors ${
        isHovered ? "ring-2 ring-accent-cyan" : "hover:bg-bg-elevated"
      }`}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-center gap-2 text-xs text-fg-secondary mb-1">
        <span className="font-mono font-semibold">#{index + 1}</span>
        <span>
          {t("matchItemIndex")}: {match.index}
        </span>
        {match.isZeroWidth && (
          <span className="text-accent-cyan italic">{t("matchItemZeroWidth")}</span>
        )}
      </div>
      <code className="block font-mono text-sm text-fg-primary bg-bg-input rounded px-2 py-1 break-all">
        {match.value || "▎"}
      </code>
      {(hasGroups || hasGroupValues) && (
        <div className="mt-2 text-xs text-fg-secondary space-y-0.5">
          <span className="font-semibold">{t("matchItemGroups")}:</span>
          {hasGroups &&
            Object.entries(match.groups).map(([name, value]) => (
              <div key={name} className="ml-2">
                <span className="font-mono text-accent-purple">{name}</span>:{" "}
                <code className="font-mono text-fg-primary bg-bg-input rounded px-1">
                  {value ?? ""}
                </code>
              </div>
            ))}
          {hasGroupValues &&
            match.groupValues.slice(1).map((val, gi) => (
              <div key={`g${gi}`} className="ml-2">
                <span className="font-mono text-accent-purple">${gi + 1}</span>:{" "}
                <code className="font-mono text-fg-primary bg-bg-input rounded px-1">
                  {val ?? ""}
                </code>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

function Conversion() {
  const t = useTranslations("regex");
  const tc = useTranslations("common");

  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<string>(defaultFlags());
  const [inputText, setInputText] = useState("");
  const [replacement, setReplacement] = useState("");
  const [hoveredMatchIndex, setHoveredMatchIndex] = useState<number | null>(null);

  const [matchOutput, setMatchOutput] = useState<MatchOutput | null>(null);
  const [replaceOutput, setReplaceOutput] = useState<ReplaceOutput | null>(null);
  const [explanations, setExplanations] = useState<TokenExplanation[]>([]);
  const [loading, setLoading] = useState(false);
  const [delimiterToastShown, setDelimiterToastShown] = useState(false);

  const matchRef = useRef<AbortController | null>(null);

  const trimmedPattern = pattern.trim();
  const activeMatchOutput = trimmedPattern && inputText ? matchOutput : null;
  const activeExplanations = trimmedPattern ? explanations : [];
  const activeReplaceOutput = trimmedPattern && inputText ? replaceOutput : null;

  /* eslint-disable react-hooks/set-state-in-effect -- effects sync async worker results to state */
  useEffect(() => {
    const trimmed = pattern.trim();
    if (!trimmed || !inputText) {
      return;
    }

    if (matchRef.current) {
      matchRef.current.abort();
    }
    const controller = new AbortController();
    matchRef.current = controller;
    let cancelled = false;

    setLoading(true);
    executeRegex(trimmed, flags, inputText)
      .then((result) => {
        if (cancelled) return;
        setLoading(false);
        setMatchOutput(result);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pattern, flags, inputText]);

  useEffect(() => {
    if (!pattern.trim()) {
      return;
    }
    const result = explainPattern(pattern.trim(), flags);
    setExplanations(Array.isArray(result) ? result : []);
  }, [pattern, flags]);

  useEffect(() => {
    if (!pattern.trim() || !inputText) {
      return;
    }
    let cancelled = false;
    executeReplace(pattern.trim(), flags, inputText, replacement).then((result) => {
      if (cancelled) return;
      setReplaceOutput(result);
    });
    return () => {
      cancelled = true;
    };
  }, [pattern, flags, inputText, replacement]);

  // Handle paste: auto-strip delimiters
  const handlePatternPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted) return;
    const result = stripDelimiters(pasted);
    if (result.stripped && !delimiterToastShown) {
      setDelimiterToastShown(true);
      showToast(t("delimiterToast"), "success", 2000);
      e.preventDefault();
      setPattern(result.pattern);
      if (result.flags) {
        setFlags(result.flags);
      }
    }
  };

  const handleFlagToggle = (char: string) => {
    setFlags((prev) => toggleFlag(prev, char));
  };

  const errorDisplay = activeMatchOutput?.error ? (
    <div
      className={`border-l-2 p-3 rounded-r-lg mt-2 ${
        activeMatchOutput.timedOut ? "border-warning bg-warning/10" : "border-danger bg-danger/10"
      }`}
    >
      <p className="text-sm text-fg-secondary">
        {activeMatchOutput.timedOut ? t("patternMaybeRedos") : activeMatchOutput.error}
      </p>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {/* Pattern Input Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="font-mono text-sm font-semibold text-accent-cyan">{t("pattern")}</label>
          {pattern && (
            <button
              type="button"
              className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
              onClick={() => {
                setPattern("");
                showToast(tc("cleared"), "danger", 2000);
              }}
            >
              {tc("clear")}
            </button>
          )}
        </div>
        <div className="relative">
          <StyledInput
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            onPaste={handlePatternPaste}
            placeholder={t("patternPlaceholder")}
            className={`font-mono text-sm ${activeMatchOutput?.error ? "border-danger" : ""}`}
          />
          {activeMatchOutput?.errorOffset != null && (
            <ErrorCaret offset={activeMatchOutput.errorOffset} />
          )}
        </div>
        <FlagCheckboxes flags={flags} onToggle={handleFlagToggle} />
      </div>

      {/* Pattern Presets */}
      <NeonTabs
        tabs={PRESET_CATEGORIES.filter((cat) =>
          PATTERN_PRESETS.some((p) => p.category === cat.key)
        ).map((cat) => ({
          label: t(cat.nameKey),
          content: (
            <div className="flex flex-wrap gap-2">
              {PATTERN_PRESETS.filter((p) => p.category === cat.key).map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setPattern(preset.pattern);
                    if (preset.flags) setFlags(preset.flags);
                  }}
                  title={preset.note ? t(preset.note) : t(preset.description)}
                  className="px-3 py-1.5 text-sm rounded-full border border-border-default text-fg-secondary hover:text-accent-cyan hover:border-accent-cyan transition-colors"
                >
                  {t(preset.name)}
                </button>
              ))}
            </div>
          ),
        }))}
      />

      {/* Error Display */}
      {errorDisplay}

      {/* Explanation Panel */}
      {activeExplanations.length > 0 && (
        <div className="space-y-1">
          <label className="block font-mono text-sm font-semibold text-accent-cyan">
            {t("explanation")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {activeExplanations.map((tok, i) => (
              <span
                key={i}
                className="bg-bg-elevated rounded px-2 py-0.5 text-xs text-fg-secondary border border-border-subtle"
                title={t(tok.explanationKey, tok.params as Record<string, string | number>)}
              >
                {tok.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Test Text Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="font-mono text-sm font-semibold text-accent-purple">
            {t("testText")}
          </label>
          {inputText && (
            <button
              type="button"
              className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
              onClick={() => {
                setInputText("");
                showToast(tc("cleared"), "danger", 2000);
              }}
            >
              {tc("clear")}
            </button>
          )}
        </div>
        <StyledTextarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t("testTextPlaceholder")}
          rows={6}
        />
      </div>

      {/* Mode Tabs */}
      <NeonTabs
        tabs={[
          {
            label: t("modeMatch"),
            content:
              activeMatchOutput && !activeMatchOutput.error ? (
                <div className="space-y-4">
                  {/* Highlight View */}
                  <div className="bg-bg-input rounded-lg p-4 font-mono text-sm leading-relaxed">
                    {inputText ? (
                      <MatchHighlightView
                        text={inputText}
                        matches={activeMatchOutput.matches.map((m) => ({
                          value: m.value,
                          index: m.index,
                          isZeroWidth: m.isZeroWidth,
                        }))}
                        hoveredIndex={hoveredMatchIndex}
                        onHover={setHoveredMatchIndex}
                        onMatchClick={(idx) => {
                          setHoveredMatchIndex(idx);
                        }}
                      />
                    ) : (
                      <span className="text-fg-muted">{t("emptyInput")}</span>
                    )}
                  </div>

                  {/* Match Info */}
                  <div className="flex items-center justify-between text-xs text-fg-secondary">
                    <span>
                      {activeMatchOutput.matchCount === 0
                        ? t("noMatch")
                        : `${activeMatchOutput.matchCount} ${
                            activeMatchOutput.matchCount === 1
                              ? t("matchCountSingle")
                              : t("matchCount")
                          }`}
                    </span>
                    {activeMatchOutput.truncated && (
                      <span className="text-warning">
                        {t("truncated", {
                          shown: 1000,
                          total: activeMatchOutput.matchCount,
                        })}
                      </span>
                    )}
                  </div>

                  {/* Match List */}
                  {activeMatchOutput.matches.length > 0 && (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {activeMatchOutput.matches.map((m, i) => (
                        <MatchItem
                          key={i}
                          match={m}
                          index={i}
                          isHovered={hoveredMatchIndex === i}
                          onHover={setHoveredMatchIndex}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-fg-muted py-4">
                  {!pattern.trim()
                    ? t("emptyPattern")
                    : !inputText
                      ? t("emptyInput")
                      : t("noMatch")}
                </div>
              ),
          },
          {
            label: t("modeReplace"),
            content: (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-sm font-semibold text-accent-cyan">
                      {t("replacement")}
                    </label>
                    {replacement && (
                      <button
                        type="button"
                        className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
                        onClick={() => {
                          setReplacement("");
                          showToast(tc("cleared"), "danger", 2000);
                        }}
                      >
                        {tc("clear")}
                      </button>
                    )}
                  </div>
                  <StyledInput
                    value={replacement}
                    onChange={(e) => setReplacement(e.target.value)}
                    placeholder={t("replacementPlaceholder")}
                    className="font-mono text-sm"
                    disabled={!!activeMatchOutput?.error}
                  />
                </div>
                {activeReplaceOutput && !activeReplaceOutput.error && (
                  <div className="bg-bg-input rounded-lg p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {activeReplaceOutput.output || (
                      <span className="text-fg-muted">{t("noMatch")}</span>
                    )}
                  </div>
                )}
                {activeReplaceOutput && !activeReplaceOutput.error && (
                  <div className="text-xs text-fg-secondary">
                    {flags.includes("g")
                      ? t("replaceCount", { count: activeReplaceOutput.replaceCount })
                      : t("replaceWithoutG", {
                          count: activeReplaceOutput.replaceCount,
                        })}
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Quick Actions */}
      {pattern.trim() && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border-subtle">
          <CopyButton getContent={() => `/${pattern.trim()}/${flags}`} label={t("copyLiteral")} />
          <CopyButton
            getContent={() =>
              `new RegExp(${JSON.stringify(pattern.trim())}, ${JSON.stringify(flags)})`
            }
            label={t("copyConstructor")}
          />
        </div>
      )}
    </div>
  );
}

// --- Description / SEO Content ---

function Description() {
  const t = useTranslations("regex");

  const CHEATSHEET_SECTIONS = [
    {
      heading: t("cheatsheetCharacterClasses"),
      rows: [
        {
          token: "\\d",
          meaning: t("cheatsheetDigit"),
          example: "123 → matches 1,2,3",
        },
        {
          token: "\\w",
          meaning: t("cheatsheetWord"),
          example: "a1_ → matches a,1,_",
        },
        {
          token: "\\s",
          meaning: t("cheatsheetWhitespace"),
          example: '"a b" → space match',
        },
        {
          token: "[...]",
          meaning: t("cheatsheetCustomClass"),
          example: "[aeiou] → vowels",
        },
        {
          token: "[^...]",
          meaning: t("cheatsheetNegatedClass"),
          example: "[^0-9] → non-digits",
        },
      ],
    },
    {
      heading: t("cheatsheetAnchors"),
      rows: [
        {
          token: "^",
          meaning: t("cheatsheetAnchorStart"),
          example: '"^hello" → at start',
        },
        {
          token: "$",
          meaning: t("cheatsheetAnchorEnd"),
          example: '"end$" → at end',
        },
        {
          token: "\\b",
          meaning: t("cheatsheetWordBoundary"),
          example: '"\\bword\\b" → word',
        },
        {
          token: "\\B",
          meaning: t("cheatsheetNonWordBoundary"),
          example: '"\\Bing\\B" → inside',
        },
      ],
    },
    {
      heading: t("cheatsheetQuantifiers"),
      rows: [
        {
          token: "*",
          meaning: t("cheatsheetZeroOrMore"),
          example: 'a* → "", a, aa, aaa',
        },
        {
          token: "+",
          meaning: t("cheatsheetOneOrMore"),
          example: "a+ → a, aa, aaa",
        },
        {
          token: "?",
          meaning: t("cheatsheetZeroOrOne"),
          example: 'a? → "", a',
        },
        {
          token: "{n}",
          meaning: t("cheatsheetExactlyN"),
          example: "a{3} → aaa",
        },
        {
          token: "{n,}",
          meaning: t("cheatsheetAtLeastN"),
          example: "a{2,} → aa, aaa",
        },
        {
          token: "{n,m}",
          meaning: t("cheatsheetBetweenNM"),
          example: "a{2,4} → aa, aaa, aaaa",
        },
        {
          token: "*?, +?, ??",
          meaning: t("cheatsheetLazyVariant"),
          example: '"<.*?>" → shortest match',
        },
      ],
    },
    {
      heading: t("cheatsheetGroups"),
      rows: [
        {
          token: "(...)",
          meaning: t("cheatsheetCapturingGroup"),
          example: "(abc)+ → capture abc",
        },
        {
          token: "(?:...)",
          meaning: t("cheatsheetNonCapturingGroup"),
          example: "(?:abc)+ → group w/o capture",
        },
        {
          token: "(?<name>...)",
          meaning: t("cheatsheetNamedGroup"),
          example: '"(?<year>\\d{4})"',
        },
        {
          token: "(?=...)",
          meaning: t("cheatsheetPositiveLookahead"),
          example: "q(?=u) → q followed by u",
        },
        {
          token: "(?!...)",
          meaning: t("cheatsheetNegativeLookahead"),
          example: "q(?!u) → q not followed by u",
        },
        {
          token: "(?<=...)",
          meaning: t("cheatsheetPositiveLookbehind"),
          example: '"(?<=@)\\w+"',
        },
        {
          token: "(?<!...)",
          meaning: t("cheatsheetNegativeLookbehind"),
          example: '"(?<!@)\\w+"',
        },
      ],
    },
    {
      heading: t("cheatsheetEscapes"),
      rows: [
        {
          token: "\\n",
          meaning: t("cheatsheetNewline"),
          example: '"line\\n" → newline',
        },
        {
          token: "\\t",
          meaning: t("cheatsheetTab"),
          example: '"col\\t" → tab',
        },
        {
          token: "\\\\",
          meaning: t("cheatsheetBackslash"),
          example: '"c:\\\\path"',
        },
        {
          token: "\\.",
          meaning: t("cheatsheetDot"),
          example: '"end\\." → literal dot',
        },
        {
          token: "\\/",
          meaning: t("cheatsheetSlash"),
          example: '"path\\/to\\/file"',
        },
      ],
    },
  ];

  return (
    <div className="mt-12 space-y-8 text-fg-secondary text-sm leading-relaxed">
      {/* What is Regex Tester */}
      <section>
        <h2 className="text-xl font-semibold text-fg-primary mb-3">
          {t("descriptions.whatIsTitle")}
        </h2>
        <p className="mb-2">{t("descriptions.whatIsP1")}</p>
        <p className="mb-2">{t("descriptions.whatIsP2")}</p>
        <p>{t("descriptions.whatIsP3")}</p>
      </section>

      {/* Key Features */}
      <section>
        <h2 className="text-xl font-semibold text-fg-primary mb-3">
          {t("descriptions.featuresTitle")}
        </h2>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("descriptions.featuresP1")}</li>
          <li>{t("descriptions.featuresP2")}</li>
          <li>{t("descriptions.featuresP3")}</li>
          <li>{t("descriptions.featuresP4")}</li>
          <li>{t("descriptions.featuresP5")}</li>
          <li>{t("descriptions.featuresP6")}</li>
        </ul>
      </section>

      {/* Common Use Cases */}
      <section>
        <h2 className="text-xl font-semibold text-fg-primary mb-3">
          {t("descriptions.useCasesTitle")}
        </h2>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("descriptions.useCasesP1")}</li>
          <li>{t("descriptions.useCasesP2")}</li>
          <li>{t("descriptions.useCasesP3")}</li>
          <li>{t("descriptions.useCasesP4")}</li>
          <li>{t("descriptions.useCasesP5")}</li>
        </ul>
      </section>

      {/* Cheatsheet */}
      <section>
        <h2 className="text-xl font-semibold text-fg-primary mb-4">{t("cheatsheet")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead>
              <tr className="border-b border-border-default">
                <th className="py-1.5 pr-4 font-semibold text-fg-secondary font-mono w-[140px]">
                  {t("cheatsheetToken")}
                </th>
                <th className="py-1.5 pr-4 font-semibold text-fg-secondary w-[40%]">
                  {t("cheatsheetMeaning")}
                </th>
                <th className="py-1.5 font-semibold text-fg-secondary">{t("cheatsheetExample")}</th>
              </tr>
            </thead>
            <tbody>
              {CHEATSHEET_SECTIONS.map((section, si) => (
                <>
                  <tr key={`heading-${si}`}>
                    <td
                      colSpan={3}
                      className="pt-4 pb-1.5 font-mono text-sm font-semibold text-accent-cyan"
                    >
                      {section.heading}
                    </td>
                  </tr>
                  {section.rows.map((row, ri) => (
                    <tr key={`${si}-${ri}`} className="border-b border-border-subtle">
                      <td className="py-1.5 pr-4 font-mono text-accent-cyan">{row.token}</td>
                      <td className="py-1.5 pr-4">{row.meaning}</td>
                      <td className="py-1.5 text-fg-muted">{row.example}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Limitations */}
      <section>
        <h2 className="text-xl font-semibold text-fg-primary mb-3">
          {t("descriptions.limitationsTitle")}
        </h2>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("descriptions.limitationsP1")}</li>
          <li>{t("descriptions.limitationsP2")}</li>
          <li>{t("descriptions.limitationsP3")}</li>
          <li>{t("descriptions.limitationsP4")}</li>
        </ul>
      </section>
    </div>
  );
}

// --- Default Export ---

export default function RegexPage() {
  const t = useTranslations("tools");
  const title = t("regex.shortTitle");

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <PrivacyBanner />
        <Conversion />
        <Description />
      </div>
    </Layout>
  );
}
