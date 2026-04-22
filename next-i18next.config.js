/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh-CN", "zh-TW"],
  },
  fallbackLng: "en",
  ns: [
    "common",
    "tools",
    "home",
    "password",
    "hashing",
    "base64",
    "ascii",
    "htmlcode",
    "checksum",
    "cipher",
    "storageunit",
    "terms",
    "privacy",
  ],
  defaultNS: "common",
};
