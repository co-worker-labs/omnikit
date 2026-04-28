# OmniKit

A collection of browser-based developer utilities, built with [Next.js](https://nextjs.org/).

## Tools

| Tool                    | Description                                                                    |
| ----------------------- | ------------------------------------------------------------------------------ |
| Base64 Encode/Decode    | Base64 encoding & decoding, Basic Authentication header generation             |
| Password Generator      | Secure, random, memorable password generation                                  |
| Text Hashing            | MD5, SHA1, SHA-224, SHA-256, SHA-384, SHA-512, SHA3 family, Keccak, RIPEMD-160 |
| Text Encrypt/Decrypt    | AES, DES, Triple DES, Rabbit, RC4, RC4Drop                                     |
| File Checksum           | Unlimited files, unlimited file size                                           |
| ASCII Table             | Complete ASCII reference with hex, octal, HTML, decimal conversions            |
| HTML Code               | HTML special characters and entity reference                                   |
| Storage Unit Conversion | Byte, kilobyte, megabyte, terabyte, petabyte and more                          |

All operations run entirely in the browser — no data is sent to any server.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **i18n**: next-intl (English, 简体中文, 繁體中文)
- **Crypto**: CryptoJS
- **UI Components**: Headless UI, Lucide Icons, rc-slider

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command           | Description               |
| ----------------- | ------------------------- |
| `npm run dev`     | Start development server  |
| `npm run build`   | Production build          |
| `npm run start`   | Start production server   |
| `npm run prepare` | Install Git hooks (Husky) |

## Project Structure

```
app/[locale]/       # Pages (one directory per tool)
  base64/
  password/
  hashing/
  cipher/
  checksum/
  ascii/
  htmlcode/
  storageunit/
components/         # Shared UI components
  ui/               # Reusable primitives
libs/               # Business logic (ascii, htmlcode, password, etc.)
utils/              # Pure utility functions
i18n/               # Internationalization config & routing
```

## i18n

Supports three locales:

- `en` — English (default)
- `zh-CN` — 简体中文
- `zh-TW` — 繁體中文

Locale prefix is `as-needed` — the default locale has no prefix in the URL.
