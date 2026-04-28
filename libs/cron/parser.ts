// libs/cron/parser.ts
import type { CronFieldKind, CronFieldValue, CronMode, ParseError, ParsedCron } from "./types";
import { FIELD_SPECS, getFieldSpec } from "./field-spec";
import { tokenToString } from "./canonical";

const MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

function expandMacro(
  token: string,
  mode: CronMode
): { expression: string } | { error: ParseError } {
  const lower = token.toLowerCase();
  if (lower === "@reboot") {
    return { error: { messageKey: "errors.macroRebootUnsupported" } };
  }
  const standard = MACROS[lower];
  if (!standard) {
    return { error: { messageKey: "errors.unknownMacro", params: { macro: token } } };
  }
  if (mode === "standard") return { expression: standard };
  if (mode === "spring") return { expression: `0 ${standard}` };
  // quartz: prepend second, append year, swap DOW '*' to '?' so it passes Quartz dom/dow validation
  const parts = standard.split(" ");
  const dow = parts[4] === "*" ? "?" : parts[4];
  const dom = parts[2] === "*" && dow === "?" ? "*" : parts[2];
  return { expression: `0 ${parts[0]} ${parts[1]} ${dom} ${parts[3]} ${dow} *` };
}

export function parseCron(raw: string, mode: CronMode): ParsedCron {
  const errors: ParseError[] = [];
  const warnings: string[] = [];
  const trimmed = raw.trim().replace(/\s+/g, " ");

  let workingExpression = trimmed;
  if (trimmed.startsWith("@")) {
    const expanded = expandMacro(trimmed, mode);
    if ("error" in expanded) {
      return {
        mode,
        fields: {},
        expression: raw,
        raw,
        valid: false,
        errors: [expanded.error],
        warnings: [],
      };
    }
    workingExpression = expanded.expression;
  }

  const tokens = workingExpression.length === 0 ? [] : workingExpression.split(" ");
  const specs = FIELD_SPECS[mode];

  if (tokens.length !== specs.length) {
    errors.push({
      messageKey: "errors.wrongFieldCount",
      params: { expected: specs.length, got: tokens.length, mode },
    });
    return emptyResult(mode, raw, errors);
  }

  const fields: Partial<Record<CronFieldKind, CronFieldValue>> = {};

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const result = parseFieldToken(tokens[i], spec.kind, mode);
    if (result.errors.length) {
      errors.push(...result.errors);
    }
    if (result.value) fields[spec.kind] = result.value;
  }

  // Post-validation: Quartz DOM/DOW '?' rule
  if (mode === "quartz" && errors.length === 0) {
    const dom = fields.dayOfMonth;
    const dow = fields.dayOfWeek;
    const domQ = dom?.type === "noSpecific";
    const dowQ = dow?.type === "noSpecific";
    if (domQ && dowQ) {
      errors.push({ messageKey: "errors.quartzBothQuestionMarks" });
    } else if (!domQ && !dowQ) {
      errors.push({ messageKey: "errors.quartzNeedsQuestionMark" });
    }
  }

  // Post-normalization: Spring DOW 7→0
  if (mode === "spring" && fields.dayOfWeek) {
    fields.dayOfWeek = normalizeSpringDow(fields.dayOfWeek);
  }

  // Build canonical expression from fields
  const canonical = specs.map((spec) => tokenToString(fields[spec.kind]));

  return {
    mode,
    fields,
    expression: canonical.join(" "),
    raw,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function emptyResult(mode: CronMode, raw: string, errors: ParseError[]): ParsedCron {
  return { mode, fields: {}, expression: raw, raw, valid: false, errors, warnings: [] };
}

// --- Alias resolution ---

function resolveAliases(
  token: string,
  aliases: Record<string, number>
): { token: string; unknown?: string } {
  const re = /[A-Za-z]+/g;
  let unknown: string | undefined;
  const out = token.replace(re, (m) => {
    const upper = m.toUpperCase();
    if (upper in aliases) return String(aliases[upper]);
    unknown = m;
    return m;
  });
  return unknown ? { token, unknown } : { token: out };
}

// --- Field token parser ---

function parseFieldToken(
  token: string,
  kind: CronFieldKind,
  mode: CronMode
): { value?: CronFieldValue; errors: ParseError[] } {
  const spec = getFieldSpec(mode, kind)!;

  // List: comma-separated
  if (token.includes(",")) {
    const parts = token.split(",");
    const items: CronFieldValue[] = [];
    for (const part of parts) {
      if (part.length === 0) {
        return {
          errors: [
            { field: kind, messageKey: "errors.invalidSyntax", params: { char: ",", field: kind } },
          ],
        };
      }
      const sub = parseFieldToken(part, kind, mode);
      if (sub.errors.length) return sub;
      items.push(sub.value!);
    }
    return { value: { type: "list", listItems: items }, errors: [] };
  }

  // '?' — noSpecific
  if (token === "?") {
    if (!spec.allowedTypes.includes("noSpecific")) {
      return {
        errors: [
          {
            field: kind,
            messageKey: "errors.specialNotAllowed",
            params: { token: "?", field: kind, mode },
          },
        ],
      };
    }
    return { value: { type: "noSpecific" }, errors: [] };
  }

  // 'L' alone — lastDay
  if (token === "L") {
    if (!spec.allowedTypes.includes("lastDay")) {
      return {
        errors: [
          {
            field: kind,
            messageKey: "errors.specialNotAllowed",
            params: { token: "L", field: kind, mode },
          },
        ],
      };
    }
    return { value: { type: "lastDay" }, errors: [] };
  }

  // 'L-N' — lastDayOffset (Quartz dom only)
  if (token.startsWith("L-")) {
    if (!spec.allowedTypes.includes("lastDayOffset")) {
      return {
        errors: [
          {
            field: kind,
            messageKey: "errors.specialNotAllowed",
            params: { token, field: kind, mode },
          },
        ],
      };
    }
    const n = parseInt(token.slice(2), 10);
    if (!Number.isFinite(n) || n < 0 || n > 30) {
      return {
        errors: [
          { field: kind, messageKey: "errors.invalidSyntax", params: { char: token, field: kind } },
        ],
      };
    }
    return { value: { type: "lastDayOffset", lastDayOffset: n }, errors: [] };
  }

  // 'LW' — last weekday of month (Quartz dom only)
  if (token === "LW") {
    if (!spec.allowedTypes.includes("weekday")) {
      return {
        errors: [
          {
            field: kind,
            messageKey: "errors.specialNotAllowed",
            params: { token: "LW", field: kind, mode },
          },
        ],
      };
    }
    return { value: { type: "weekday", weekdayDay: "L" }, errors: [] };
  }

  // 'nW' — nearest weekday to dom n
  if (/^\d+W$/.test(token)) {
    if (kind !== "dayOfMonth") {
      return { errors: [{ field: kind, messageKey: "errors.weekdayOnNonDom" }] };
    }
    if (!spec.allowedTypes.includes("weekday")) {
      return {
        errors: [
          {
            field: kind,
            messageKey: "errors.specialNotAllowed",
            params: { token, field: kind, mode },
          },
        ],
      };
    }
    const n = parseInt(token.slice(0, -1), 10);
    if (n < spec.min || n > spec.max) {
      return {
        errors: [
          {
            field: kind,
            messageKey: "errors.outOfRange",
            params: { field: kind, min: spec.min, max: spec.max, value: n },
          },
        ],
      };
    }
    return { value: { type: "weekday", weekdayDay: n }, errors: [] };
  }

  // 'n#m' — nth occurrence of weekday n
  if (token.includes("#")) {
    if (kind !== "dayOfWeek") {
      return { errors: [{ field: kind, messageKey: "errors.nthOnNonDow" }] };
    }
    if (!spec.allowedTypes.includes("nthDayOfWeek")) {
      return {
        errors: [
          {
            field: kind,
            messageKey: "errors.specialNotAllowed",
            params: { token, field: kind, mode },
          },
        ],
      };
    }
    const [w, m] = token.split("#").map((p) => parseInt(p, 10));
    if (
      !Number.isFinite(w) ||
      !Number.isFinite(m) ||
      w < spec.min ||
      w > spec.max ||
      m < 1 ||
      m > 5
    ) {
      return {
        errors: [
          { field: kind, messageKey: "errors.invalidSyntax", params: { char: token, field: kind } },
        ],
      };
    }
    return { value: { type: "nthDayOfWeek", nthDayOfWeek: { weekday: w, n: m } }, errors: [] };
  }

  // 'nL' — last <weekday> of month (Quartz dow only)
  if (/^\d+L$/.test(token)) {
    if (kind !== "dayOfWeek") {
      return {
        errors: [
          {
            field: kind,
            messageKey: "errors.specialNotAllowed",
            params: { token, field: kind, mode },
          },
        ],
      };
    }
    if (!spec.allowedTypes.includes("lastDay")) {
      return {
        errors: [
          {
            field: kind,
            messageKey: "errors.specialNotAllowed",
            params: { token, field: kind, mode },
          },
        ],
      };
    }
    const w = parseInt(token.slice(0, -1), 10);
    if (w < spec.min || w > spec.max) {
      return {
        errors: [
          {
            field: kind,
            messageKey: "errors.outOfRange",
            params: { field: kind, min: spec.min, max: spec.max, value: w },
          },
        ],
      };
    }
    return { value: { type: "lastDay", weekdayDay: w }, errors: [] };
  }

  // Resolve aliases before further parsing (after special chars that contain letters)
  if (spec.aliases) {
    const resolved = resolveAliases(token, spec.aliases);
    if (resolved.unknown) {
      return {
        errors: [
          {
            field: kind,
            messageKey: "errors.unknownAlias",
            params: { name: resolved.unknown, field: kind },
          },
        ],
      };
    }
    token = resolved.token;
  }

  // '*' — any
  if (token === "*") return { value: { type: "any" }, errors: [] };

  // Step: <start>/<interval>
  if (token.includes("/")) {
    const [startPart, intervalPart] = token.split("/");
    const interval = parseInt(intervalPart, 10);
    if (!Number.isFinite(interval) || interval <= 0) {
      return {
        errors: [
          { field: kind, messageKey: "errors.invalidStep", params: { value: intervalPart } },
        ],
      };
    }
    if (startPart === "*") {
      return { value: { type: "step", step: { start: "*", interval } }, errors: [] };
    }
    if (startPart.includes("-")) {
      const rangeRes = parseRange(startPart, kind, spec);
      if (rangeRes.errors.length) return rangeRes;
      const { from, to } = rangeRes.value!.range!;
      return { value: { type: "step", step: { start: from, from, to, interval } }, errors: [] };
    }
    const n = parseSingleNumber(startPart, kind, spec);
    if (n.errors.length) return n;
    return { value: { type: "step", step: { start: n.value!.values![0], interval } }, errors: [] };
  }

  // Range: n-m
  if (token.includes("-")) return parseRange(token, kind, spec);

  // Specific number
  return parseSingleNumber(token, kind, spec);
}

function parseSingleNumber(
  token: string,
  kind: CronFieldKind,
  spec: ReturnType<typeof getFieldSpec> & {}
): { value?: CronFieldValue; errors: ParseError[] } {
  const n = parseInt(token, 10);
  if (!Number.isFinite(n) || String(n) !== token) {
    return {
      errors: [
        { field: kind, messageKey: "errors.invalidSyntax", params: { char: token, field: kind } },
      ],
    };
  }
  if (n < spec.min || n > spec.max) {
    return {
      errors: [
        {
          field: kind,
          messageKey: "errors.outOfRange",
          params: { field: kind, min: spec.min, max: spec.max, value: n },
        },
      ],
    };
  }
  return { value: { type: "specific", values: [n] }, errors: [] };
}

function parseRange(
  token: string,
  kind: CronFieldKind,
  spec: ReturnType<typeof getFieldSpec> & {}
): { value?: CronFieldValue; errors: ParseError[] } {
  const [a, b] = token.split("-");
  const aN = parseSingleNumber(a, kind, spec);
  if (aN.errors.length) return aN;
  const bN = parseSingleNumber(b, kind, spec);
  if (bN.errors.length) return bN;
  const from = aN.value!.values![0];
  const to = bN.value!.values![0];
  if (from > to) {
    return {
      errors: [
        { field: kind, messageKey: "errors.rangeReversed", params: { field: kind, from, to } },
      ],
    };
  }
  return { value: { type: "range", range: { from, to } }, errors: [] };
}

// --- Spring DOW normalization ---

function normalizeSpringDow(v: CronFieldValue): CronFieldValue {
  if (v.type === "specific" && v.values?.[0] === 7) return { type: "specific", values: [0] };
  if (v.type === "list" && v.listItems) {
    return { type: "list", listItems: v.listItems.map(normalizeSpringDow) };
  }
  if (v.type === "range" && v.range) {
    const from = v.range.from === 7 ? 0 : v.range.from;
    const to = v.range.to === 7 ? 0 : v.range.to;
    if (from > to) {
      return {
        type: "list",
        listItems: [
          { type: "range", range: { from: 0, to } },
          { type: "specific", values: [from] },
        ],
      };
    }
    return { type: "range", range: { from, to } };
  }
  return v;
}
