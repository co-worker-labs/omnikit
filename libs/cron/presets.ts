import type { Preset } from "./types";

export const PRESETS: Preset[] = [
  { id: "everyMinute", labelKey: "presets.everyMinute", mode: "standard", expression: "* * * * *" },
  {
    id: "every5Minutes",
    labelKey: "presets.every5Minutes",
    mode: "standard",
    expression: "*/5 * * * *",
  },
  {
    id: "every15Minutes",
    labelKey: "presets.every15Minutes",
    mode: "standard",
    expression: "*/15 * * * *",
  },
  { id: "everyHour", labelKey: "presets.everyHour", mode: "standard", expression: "0 * * * *" },
  {
    id: "every2Hours",
    labelKey: "presets.every2Hours",
    mode: "standard",
    expression: "0 */2 * * *",
  },
  { id: "everyDay", labelKey: "presets.everyDay", mode: "standard", expression: "0 0 * * *" },
  {
    id: "everyMondayMorning",
    labelKey: "presets.everyMondayMorning",
    mode: "standard",
    expression: "0 9 * * 1",
  },
  {
    id: "weekdays9am",
    labelKey: "presets.weekdays9am",
    mode: "standard",
    expression: "0 9 * * 1-5",
  },
  {
    id: "firstOfMonth",
    labelKey: "presets.firstOfMonth",
    mode: "standard",
    expression: "0 0 1 * *",
  },
  {
    id: "lastOfMonth",
    labelKey: "presets.lastOfMonth",
    mode: "quartz",
    expression: "0 0 0 L * ? *",
  },
  {
    id: "everyQuarter",
    labelKey: "presets.everyQuarter",
    mode: "standard",
    expression: "0 0 1 1,4,7,10 *",
  },
];
