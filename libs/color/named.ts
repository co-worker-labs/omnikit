import type { ColorObject } from "./convert";
import "./convert";

export function closestName(c: ColorObject): string {
  const name = (
    c as ColorObject & { toName: (opts?: { closest?: boolean }) => string | undefined }
  ).toName({ closest: true });
  return name ?? "";
}
