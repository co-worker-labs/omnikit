/**
 * Apple device specs for iOS PWA launch splash screens.
 * Source: Apple HIG device specs as of 2026-04. Portrait only.
 *
 * @typedef {Object} SplashDevice
 * @property {number} width  CSS reference points (device-width media query)
 * @property {number} height CSS reference points (device-height media query)
 * @property {2 | 3}  dpr    Device pixel ratio
 * @property {string} label  File slug
 */

/** @type {SplashDevice[]} */
export const SPLASH_DEVICES = [
  { width: 440, height: 956, dpr: 3, label: "iphone-16-pro-max" },
  { width: 402, height: 874, dpr: 3, label: "iphone-16-pro" },
  { width: 430, height: 932, dpr: 3, label: "iphone-16-plus" },
  { width: 393, height: 852, dpr: 3, label: "iphone-16" },
  { width: 428, height: 926, dpr: 3, label: "iphone-14-plus" },
  { width: 390, height: 844, dpr: 3, label: "iphone-14" },
  { width: 375, height: 812, dpr: 3, label: "iphone-13-mini" },
  { width: 414, height: 896, dpr: 3, label: "iphone-11-pro-max" },
  { width: 414, height: 896, dpr: 2, label: "iphone-11" },
  { width: 1032, height: 1376, dpr: 2, label: "ipad-pro-13" },
  { width: 1024, height: 1366, dpr: 2, label: "ipad-pro-12-9" },
  { width: 834, height: 1194, dpr: 2, label: "ipad-pro-11" },
  { width: 820, height: 1180, dpr: 2, label: "ipad-air" },
  { width: 768, height: 1024, dpr: 2, label: "ipad-mini" },
];
