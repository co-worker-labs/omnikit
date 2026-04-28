"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogPanel } from "@headlessui/react";
import { Button } from "../../../components/ui/button";
import { StyledInput, StyledSelect, StyledCheckbox } from "../../../components/ui/input";
import {
  getFieldSpec,
  tokenToString,
  type CronFieldKind,
  type CronFieldValue,
  type CronMode,
  type FieldValueType,
} from "../../../libs/cron/main";

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (value: CronFieldValue) => void;
  mode: CronMode;
  kind: CronFieldKind;
  initial: CronFieldValue | undefined;
}

export function FieldEditor({ open, onClose, onApply, mode, kind, initial }: Props) {
  const t = useTranslations("cron");
  const tc = useTranslations("common");
  const spec = getFieldSpec(mode, kind)!;
  const [type, setType] = useState<FieldValueType>(initial?.type ?? "any");
  const [draft, setDraft] = useState<CronFieldValue>(initial ?? { type: "any" });

  /* eslint-disable react-hooks/set-state-in-effect -- reset on open */
  useEffect(() => {
    if (open) {
      setType(initial?.type ?? "any");
      setDraft(initial ?? { type: "any" });
    }
  }, [open, initial]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleTypeChange(next: FieldValueType) {
    setType(next);
    switch (next) {
      case "any":
        setDraft({ type: "any" });
        break;
      case "noSpecific":
        setDraft({ type: "noSpecific" });
        break;
      case "specific":
        setDraft({ type: "specific", values: [spec.min] });
        break;
      case "range":
        setDraft({ type: "range", range: { from: spec.min, to: spec.max } });
        break;
      case "step":
        setDraft({ type: "step", step: { start: "*", interval: 1 } });
        break;
      case "list":
        setDraft({ type: "list", listItems: [{ type: "specific", values: [spec.min] }] });
        break;
      case "lastDay":
        setDraft({ type: "lastDay" });
        break;
      case "weekday":
        setDraft({ type: "weekday", weekdayDay: 15 });
        break;
      case "nthDayOfWeek":
        setDraft({ type: "nthDayOfWeek", nthDayOfWeek: { weekday: spec.min, n: 1 } });
        break;
      case "lastDayOffset":
        setDraft({ type: "lastDayOffset", lastDayOffset: 1 });
        break;
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <DialogPanel className="w-full sm:max-w-md bg-bg-surface border border-border-default rounded-t-xl sm:rounded-xl p-4 space-y-3">
          <div className="text-sm font-medium text-fg-secondary">
            {t("editor.title")} — {t(`field.${kind}`)}
          </div>

          <StyledSelect
            label={t("editor.specialKind")}
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as FieldValueType)}
          >
            {spec.allowedTypes.map((tp) => (
              <option key={tp} value={tp}>
                {t(`fieldType.${tp}`)}
              </option>
            ))}
          </StyledSelect>

          <EditorControls type={type} draft={draft} setDraft={setDraft} spec={spec} t={t} />

          <div className="text-xs text-fg-muted font-mono">
            {t("editor.preview")}: {tokenToString(draft)}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onApply(draft);
                onClose();
              }}
            >
              {tc("save")}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function EditorControls({
  type,
  draft,
  setDraft,
  spec,
  t,
}: {
  type: FieldValueType;
  draft: CronFieldValue;
  setDraft: (v: CronFieldValue) => void;
  spec: ReturnType<typeof getFieldSpec> & {};
  t: ReturnType<typeof useTranslations>;
}) {
  switch (type) {
    case "any":
    case "noSpecific":
    case "lastDay":
      return null;

    case "weekday": {
      const wd = draft.weekdayDay === "L" ? "L" : (draft.weekdayDay ?? 15);
      return (
        <StyledSelect
          value={wd === "L" ? "L" : String(wd)}
          onChange={(e) =>
            setDraft({
              type: "weekday",
              weekdayDay: e.target.value === "L" ? "L" : parseInt(e.target.value, 10),
            })
          }
        >
          <option value="L">LW (last weekday)</option>
          {Array.from({ length: spec.max - spec.min + 1 }, (_, i) => spec.min + i).map((n) => (
            <option key={n} value={n}>{`${n}W`}</option>
          ))}
        </StyledSelect>
      );
    }

    case "specific":
      return (
        <StyledInput
          type="number"
          label={t("editor.specificValue")}
          min={spec.min}
          max={spec.max}
          value={draft.values?.[0] ?? spec.min}
          onChange={(e) =>
            setDraft({
              type: "specific",
              values: [Math.max(spec.min, Math.min(spec.max, parseInt(e.target.value, 10) || 0))],
            })
          }
        />
      );

    case "range":
      return (
        <div className="grid grid-cols-2 gap-2">
          <StyledInput
            type="number"
            label={t("editor.rangeFrom")}
            min={spec.min}
            max={spec.max}
            value={draft.range?.from ?? spec.min}
            onChange={(e) =>
              setDraft({
                type: "range",
                range: { from: parseInt(e.target.value, 10), to: draft.range?.to ?? spec.max },
              })
            }
          />
          <StyledInput
            type="number"
            label={t("editor.rangeTo")}
            min={spec.min}
            max={spec.max}
            value={draft.range?.to ?? spec.max}
            onChange={(e) =>
              setDraft({
                type: "range",
                range: { from: draft.range?.from ?? spec.min, to: parseInt(e.target.value, 10) },
              })
            }
          />
        </div>
      );

    case "step":
      return (
        <div className="grid grid-cols-2 gap-2">
          <StyledInput
            type="text"
            label={t("editor.stepStart")}
            value={draft.step?.start === "*" ? "*" : String(draft.step?.start ?? "*")}
            onChange={(e) => {
              const v = e.target.value === "*" ? "*" : parseInt(e.target.value, 10);
              setDraft({
                type: "step",
                step: { start: isNaN(v as number) ? "*" : v, interval: draft.step?.interval ?? 1 },
              });
            }}
          />
          <StyledInput
            type="number"
            label={t("editor.stepInterval")}
            min={1}
            max={spec.max}
            value={draft.step?.interval ?? 1}
            onChange={(e) =>
              setDraft({
                type: "step",
                step: {
                  start: draft.step?.start ?? "*",
                  interval: Math.max(1, parseInt(e.target.value, 10) || 1),
                },
              })
            }
          />
        </div>
      );

    case "list":
      return (
        <div className="grid grid-cols-6 gap-1 max-h-40 overflow-y-auto">
          {Array.from({ length: spec.max - spec.min + 1 }, (_, i) => spec.min + i).map((n) => {
            const checked =
              draft.listItems?.some((it) => it.type === "specific" && it.values?.[0] === n) ??
              false;
            return (
              <StyledCheckbox
                key={n}
                checked={checked}
                label={String(n)}
                onChange={(e) => {
                  const items = (draft.listItems ?? []).filter(
                    (it) => !(it.type === "specific" && it.values?.[0] === n)
                  );
                  if (e.target.checked) items.push({ type: "specific", values: [n] });
                  items.sort((a, b) => (a.values?.[0] ?? 0) - (b.values?.[0] ?? 0));
                  setDraft({ type: "list", listItems: items });
                }}
              />
            );
          })}
        </div>
      );

    case "nthDayOfWeek":
      return (
        <div className="grid grid-cols-2 gap-2">
          <StyledSelect
            label={t("field.dayOfWeek")}
            value={String(draft.nthDayOfWeek?.weekday ?? spec.min)}
            onChange={(e) =>
              setDraft({
                type: "nthDayOfWeek",
                nthDayOfWeek: {
                  weekday: parseInt(e.target.value, 10),
                  n: draft.nthDayOfWeek?.n ?? 1,
                },
              })
            }
          >
            {Array.from({ length: spec.max - spec.min + 1 }, (_, i) => spec.min + i).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </StyledSelect>
          <StyledSelect
            label="N"
            value={String(draft.nthDayOfWeek?.n ?? 1)}
            onChange={(e) =>
              setDraft({
                type: "nthDayOfWeek",
                nthDayOfWeek: {
                  weekday: draft.nthDayOfWeek?.weekday ?? spec.min,
                  n: parseInt(e.target.value, 10),
                },
              })
            }
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </StyledSelect>
        </div>
      );

    case "lastDayOffset":
      return (
        <StyledInput
          type="number"
          label="L − N"
          min={0}
          max={30}
          value={draft.lastDayOffset ?? 1}
          onChange={(e) =>
            setDraft({
              type: "lastDayOffset",
              lastDayOffset: Math.max(0, parseInt(e.target.value, 10) || 0),
            })
          }
        />
      );
  }
  return null;
}
