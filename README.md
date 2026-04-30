# OmniKit

English | [简体中文](./README.zh-CN.md)

A collection of browser-based developer utilities, built with [Next.js](https://nextjs.org/).

## Tools

| Tool                    | Description                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| JSON Format / Compress  | Format, minify, and validate JSON/JSON5 with configurable indentation                                               |
| Base64 Encode/Decode    | Base64 encoding & decoding, Basic Authentication header generation                                                  |
| JWT                     | Encode, decode, and verify JSON Web Tokens (HS/RS/ES/PS 256/384/512)                                                |
| URL Encoder/Decoder     | URL encoding & decoding with Component, Whole URL, and Form modes                                                   |
| UUID Generator          | UUID v1/v3/v4/v5/v7 generation (RFC 4122/9562)                                                                      |
| Regex Tester            | Regex pattern testing with real-time matching, presets, and explain mode                                            |
| QR Code Generator       | Customizable QR code generation with logo overlay, SVG/PNG export                                                   |
| Text Diff               | Side-by-side or inline text comparison with word-level highlights, Web Worker powered                               |
| Text Hashing            | MD5, SHA-1/224/256/384/512, SHA3 family, Keccak, RIPEMD-160                                                         |
| Password Generator      | Secure, random, memorable password generation                                                                       |
| Text Case Converter     | camelCase, PascalCase, snake_case, kebab-case, and more text format conversions                                     |
| Text Encrypt/Decrypt    | AES, DES, Triple DES, Rabbit, RC4, RC4Drop                                                                          |
| Cron                    | Build and decode Cron expressions (Standard, Spring, Quartz) with next-run preview                                  |
| Unix Timestamp          | Convert between Unix timestamps and dates with live clock, supports seconds & milliseconds                          |
| Markdown Editor         | Live preview with GFM support, syntax highlighting, export to PDF/PNG                                               |
| DB Viewer               | SQLite database viewer with SQL editor, autocomplete, and CSV/JSON export                                           |
| File Checksum           | Unlimited files, unlimited file size                                                                                |
| Storage Unit Conversion | Byte, kilobyte, megabyte, terabyte, petabyte and more                                                               |
| Color Tool              | Color picker, multi-format conversion (HEX/RGB/HSL/OKLCH), image palette, contrast checker, color vision simulation |
| ASCII Table             | Complete ASCII reference with hex, octal, HTML, decimal conversions                                                 |
| HTML Code               | HTML special characters and entity reference                                                                        |
| HTTP Status Codes       | HTTP status code reference with categories, search, and spec links                                                  |
| Number Base Converter   | BIN/OCT/DEC/HEX conversion, two's complement, bit editor                                                            |
| CSV Converter           | CSV ↔ JSON / Markdown Table / TSV format conversion                                                                 |

All operations run entirely in the browser — no data is sent to any server.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **i18n**: next-intl (English, 简体中文, 繁體中文)
- **Crypto**: CryptoJS, jose (JWT)
- **PWA**: Serwist (Service Worker)
- **Editor**: CodeMirror 6 (SQL editor in DB Viewer)
- **Markdown**: markdown-it, mermaid, PrismJS
- **Database**: sql.js (client-side SQLite)
- **Diff**: diff (text comparison with Web Workers)
- **Color**: colord, react-colorful, colorthief
- **QR Code**: qr-code-styling
- **CSV**: papaparse
- **Search**: fuzzysort (fuzzy tool search)
- **Screenshot**: modern-screenshot (Markdown PDF/PNG export)
- **Analytics**: @vercel/analytics, @vercel/speed-insights
- **UI Components**: Headless UI, Lucide Icons, rc-slider, @tanstack/react-virtual

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command                  | Description                          |
| ------------------------ | ------------------------------------ |
| `npm run dev`            | Start development server             |
| `npm run build`          | Production build                     |
| `npm run start`          | Start production server              |
| `npm run prepare`        | Install Git hooks (Husky)            |
| `npm run test`           | Run tests (Vitest)                   |
| `npm run test:watch`     | Run tests in watch mode              |
| `npm run icons:generate` | Generate PWA icons from source image |
| `npm run typecheck:sw`   | Type-check Service Worker code       |

## Project Structure

```
app/[locale]/       # Pages (one directory per tool)
  json/             # JSON formatter/compressor
  base64/           # Base64 encode/decode
  jwt/              # JWT debugger
  urlencoder/       # URL encode/decode
  uuid/             # UUID generator
  regex/            # Regex tester
  qrcode/           # QR code generator
  diff/             # Text diff comparison
  hashing/          # Text hashing
  password/         # Password generator
  textcase/         # Text case converter
  cipher/           # Text encrypt/decrypt
  cron/             # Cron expression builder
  unixtime/         # Unix timestamp converter
  markdown/         # Markdown editor & preview
  dbviewer/         # SQLite database viewer
  checksum/         # File checksum
  storageunit/      # Storage unit converter
  color/            # Color tool
  ascii/            # ASCII table
  htmlcode/         # HTML entity reference
  httpstatus/       # HTTP status codes
  numbase/          # Number base converter
  csv/              # CSV converter
app/serwist/        # Serwist PWA runtime caching routes
components/         # Shared UI components
  ui/               # Reusable primitives (Button, Card, Tabs, etc.)
  color/            # Color-specific components (ColorPicker, etc.)
hooks/              # Custom React hooks
libs/               # Business logic (per-tool modules in subdirectories)
utils/              # Pure utility functions
i18n/               # Internationalization config & routing
styles/             # Global styles (PrismJS theme)
scripts/            # Build & generation scripts
public/locales/     # Translation files (en, zh-CN, zh-TW)
```

## i18n

Supports three locales:

- `en` — English (default)
- `zh-CN` — 简体中文
- `zh-TW` — 繁體中文

Locale prefix is `as-needed` — the default locale has no prefix in the URL.
