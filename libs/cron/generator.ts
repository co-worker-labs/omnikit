import { tokenToString } from "./canonical";
import { FIELD_SPECS } from "./field-spec";
import type { CronFieldValue, CronMode, CronFieldKind } from "./types";

export function generateCron(
  fields: Partial<Record<CronFieldKind, CronFieldValue>>,
  mode: CronMode
): string {
  const specs = FIELD_SPECS[mode];
  return specs.map((spec) => tokenToString(fields[spec.kind])).join(" ");
}
