import type { PatternPreset } from "./types";

export const PATTERN_PRESETS: PatternPreset[] = [
  {
    name: "presetEmail",
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    flags: "",
    description: "presetEmailDesc",
    category: "network",
    note: "html5SpecEmail",
  },
  {
    name: "presetUrl",
    pattern:
      "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)",
    flags: "",
    description: "presetUrlDesc",
    category: "network",
  },
  {
    name: "presetIPv4",
    pattern: "^(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$",
    flags: "",
    description: "presetIPv4Desc",
    category: "network",
  },
  {
    name: "presetIPv6",
    pattern: "^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$",
    flags: "gi",
    description: "presetIPv6Desc",
    category: "network",
    note: "simplifiedIPv6",
  },
  {
    name: "presetChinaMobile",
    pattern: "^1[3-9]\\d{9}$",
    flags: "",
    description: "presetChinaMobileDesc",
    category: "phone",
  },
  {
    name: "presetISODate",
    pattern: "^\\d{4}-\\d{2}-\\d{2}$",
    flags: "",
    description: "presetISODateDesc",
    category: "datetime",
  },
  {
    name: "presetHtmlTag",
    pattern: "<(\\w+)[^>]*>(.*?)<\\/\\1>",
    flags: "gis",
    description: "presetHtmlTagDesc",
    category: "code",
  },
  {
    name: "presetHexColor",
    pattern: "#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?\\b",
    flags: "gi",
    description: "presetHexColorDesc",
    category: "code",
  },
  {
    name: "presetStrongPassword",
    pattern:
      '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\\d!@#$%^&*(),.?":{}|<>]{8,}$',
    flags: "",
    description: "presetStrongPasswordDesc",
    category: "security",
  },
  {
    name: "presetSemver",
    pattern:
      "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-]\\w*)))?$",
    flags: "",
    description: "presetSemverDesc",
    category: "code",
  },
  {
    name: "presetUUID",
    pattern: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
    flags: "gi",
    description: "presetUUIDDesc",
    category: "code",
  },
];

export const PRESET_CATEGORIES: { key: string; nameKey: string }[] = [
  { key: "general", nameKey: "categoryGeneral" },
  { key: "network", nameKey: "categoryNetwork" },
  { key: "phone", nameKey: "categoryPhone" },
  { key: "code", nameKey: "categoryCode" },
  { key: "security", nameKey: "categorySecurity" },
  { key: "datetime", nameKey: "categoryDatetime" },
];
