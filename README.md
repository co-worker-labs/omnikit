# OmniKit

A collection of browser-based developer utilities, built with [Next.js](https://nextjs.org/).

## Tools

| Tool                    | Description                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Base64 Encode/Decode    | Base64 encoding & decoding, Basic Authentication header generation                         |
| URL Encoder/Decoder     | URL encoding & decoding with Component, Whole URL, and Form modes                          |
| UUID Generator          | UUID v1/v3/v4/v5/v7 generation (RFC 4122/9562)                                             |
| Password Generator      | Secure, random, memorable password generation                                              |
| Text Hashing            | MD5, SHA-1/224/256/384/512, SHA3 family, Keccak, RIPEMD-160                                |
| File Checksum           | Unlimited files, unlimited file size                                                       |
| JSON Format / Compress  | Format, minify, and validate JSON/JSON5 with configurable indentation                      |
| HTML Code               | HTML special characters and entity reference                                               |
| Storage Unit Conversion | Byte, kilobyte, megabyte, terabyte, petabyte and more                                      |
| ASCII Table             | Complete ASCII reference with hex, octal, HTML, decimal conversions                        |
| Text Encrypt/Decrypt    | AES, DES, Triple DES, Rabbit, RC4, RC4Drop                                                 |
| JWT                     | Encode, decode, and verify JSON Web Tokens (HS/RS/ES/PS 256/384/512)                       |
| Text Diff               | Side-by-side or inline text comparison with word-level highlights, Web Worker powered      |
| Markdown Editor         | Live preview with GFM support, syntax highlighting, export to PDF/PNG                      |
| DB Viewer               | SQLite database viewer with SQL editor, autocomplete, and CSV/JSON export                  |
| Unix Timestamp          | Convert between Unix timestamps and dates with live clock, supports seconds & milliseconds |
| Cron                    | Build and decode Cron expressions (Standard, Spring, Quartz) with next-run preview         |

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
  base64/           # Base64 encode/decode
  urlencoder/       # URL encode/decode
  uuid/             # UUID generator
  password/         # Password generator
  hashing/          # Text hashing
  checksum/         # File checksum
  json/             # JSON formatter/compressor
  htmlcode/         # HTML entity reference
  storageunit/      # Storage unit converter
  ascii/            # ASCII table
  cipher/           # Text encrypt/decrypt
  jwt/              # JWT debugger
  diff/             # Text diff comparison
  markdown/         # Markdown editor & preview
  dbviewer/         # SQLite database viewer
  unixtime/         # Unix timestamp converter
  cron/             # Cron expression builder
app/serwist/        # Serwist PWA runtime caching routes
components/         # Shared UI components
  ui/               # Reusable primitives (Button, Card, Tabs, etc.)
hooks/              # Custom React hooks (useFullscreen, useIsMobile)
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
