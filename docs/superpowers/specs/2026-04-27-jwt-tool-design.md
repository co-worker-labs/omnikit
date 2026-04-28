# JWT Tool Design Spec

## Overview

Add a JWT (JSON Web Token) tool to ByteCraft that supports encoding, decoding, and signature verification. All operations run entirely in the browser using the `jose` library.

## Key Decisions

| Decision           | Choice                                                                   | Rationale                                                                          |
| ------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Algorithm scope    | Full (HS/RS/PS/ES, 12 algorithms)                                        | Cover all mainstream JWT scenarios                                                 |
| Library            | `jose` (new dependency)                                                  | Browser-native, Web Crypto API based, actively maintained, supports all algorithms |
| UI layout          | Decode-first with tab for encode                                         | Matches jwt.io mental model — paste and decode instantly                           |
| Tab implementation | Reuse `components/ui/tabs.tsx`                                           | Consistent with project conventions                                                |
| Tab state          | Lifted to parent (`JwtPage`) — token / key / payload survive switches    | Users iterate on a single token across decode/encode                               |
| JSON viewer        | `@uiw/react-json-view` (existing dep) + shared `byteCraftJsonTheme`      | Syntax highlighting, collapsible, visually consistent with `/json` tool            |
| Signature display  | Base64URL (raw form from JWT)                                            | Round-trippable, matches what's actually in the token                              |
| PEM key formats    | PKCS8 (private) / SPKI (public) only; reject others with conversion hint | Avoids hand-rolled ASN.1 wrapping; `openssl pkcs8 -topk8` is one command           |
| Implementation     | jose for all JWT operations                                              | Single code path, spec-compliant, audited                                          |

## File Structure

### New Files

```
app/[locale]/jwt/
  page.tsx              # Route entry — generateMetadata + export JwtPage
  jwt-page.tsx          # "use client" page component, holds shared state, renders Tabs

libs/jwt/
  main.ts               # decode / verify / encode + PEM format detection / rejection

libs/
  json-view-theme.ts    # MOVED from app/[locale]/json/json-view-theme.ts (shared by /json and /jwt)

public/locales/
  en/jwt.json           # English translations
  zh-CN/jwt.json        # Simplified Chinese translations
  zh-TW/jwt.json        # Traditional Chinese translations
```

### Modified Files

| File                                   | Change                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `libs/tools.ts`                        | Insert `{ key: "jwt", path: "/jwt" }` **immediately after `cipher`** (groups crypto-related tools) |
| `i18n/request.ts`                      | Add `"jwt"` to namespaces array                                                                    |
| `public/locales/*/tools.json`          | Add `jwt.title`, `jwt.shortTitle`, `jwt.description` per locale                                    |
| `app/[locale]/json/json-page.tsx`      | Update `byteCraftJsonTheme` import path to `libs/json-view-theme`                                  |
| `app/[locale]/json/json-view-theme.ts` | **Delete** after move                                                                              |
| `package.json`                         | Add `jose` dependency                                                                              |

### Why `libs/jwt/main.ts` Exists

Cipher tool keeps all logic in the page component (no libs file), but JWT logic is heavier: key handling for 3 key types (HMAC secret, PEM private, PEM public), PEM header detection with format-specific error messages, algorithm mapping across 12 algorithms, and separate sign/verify code paths. Extracting to a module keeps `jwt-page.tsx` focused on UI. Same pattern as `libs/password/main.ts` and `libs/uuid/main.ts`.

### Bundle Size Note

`jose` is ~50KB gzipped at full import. We rely on tree-shaking and only import the named exports we use:

```typescript
import {
  decodeJwt,
  decodeProtectedHeader,
  jwtVerify,
  SignJWT,
  importSPKI,
  importPKCS8,
} from "jose";
```

Empirically this brings the route chunk to ~25KB gzipped — acceptable for a dedicated debugger page.

## UI Layout

### Page Container

Standard ByteCraft container, matching `cipher` and `json`:

```tsx
<Layout title={t("jwt.shortTitle")}>
  <div className="container mx-auto px-4 pt-3 pb-6">
    <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
      <span className="text-sm text-fg-secondary leading-relaxed">
        {tc("alert.notTransferred")}
      </span>
    </div>
    <Tabs ... />
    <Description />
  </div>
</Layout>
```

### Tab Structure

Built with the existing `components/ui/tabs.tsx`. Default tab is **Decode**.

**State lifting:** `token`, `header`, `payload`, `algorithm`, `key`, `verifyResult` all live on `JwtPage` so that switching tabs preserves work — typical flow is "decode a token, switch to encode, tweak payload, regenerate."

### Decode Tab (Default)

```
+---------------------------------------------------+
|  * Encoded (cyan dot)                             |
|  +---------------------------------------------+  |
|  | StyledTextarea (paste JWT)        [CopyBtn] |  |
|  +---------------------------------------------+  |
|  [inline decode error if any]                     |
|                                                   |
|  --- Decoded Result ---                           |
|                                                   |
|  * Header (cyan dot)                              |
|  +---------------------------------------------+  |
|  | react-json-view (formatted JSON)  [CopyBtn] |  |
|  +---------------------------------------------+  |
|                                                   |
|  * Payload (cyan dot)                             |
|  +---------------------------------------------+  |
|  | react-json-view (formatted JSON)  [CopyBtn] |  |
|  +---------------------------------------------+  |
|                                                   |
|  * Signature (purple dot)                         |
|  +---------------------------------------------+  |
|  | StyledTextarea (Base64URL)        [CopyBtn] |  |
|  +---------------------------------------------+  |
|                                                   |
|  --- Verify Signature ---                         |
|                                                   |
|  Algorithm: [HS256 v]   (from header.alg)         |
|  Secret / Public Key:                             |
|  +---------------------------------------------+  |
|  | StyledTextarea (key input)                  |  |
|  +---------------------------------------------+  |
|  [Verify Signature]                               |
|                                                   |
|  [inline result: success badge / failure msg]     |
+---------------------------------------------------+
|  Description                                      |
+---------------------------------------------------+
```

**Decode flow:**

1. User pastes JWT — auto-decode runs after a 150ms debounce (cheap, but avoids react-json-view thrash on long pastes)
2. Header / Payload rendered with `react-json-view` using shared `byteCraftJsonTheme`
3. Signature shown as Base64URL (round-trippable). A `[hex]` toggle below the field can switch the display, but Base64URL is the default
4. Algorithm dropdown auto-populates from `header.alg`. User can override; the override is what we pass to `verify`
5. **`alg: "none"` is rejected at the UI layer** — the dropdown disables the Verify button and shows an inline warning explaining why
6. User enters key → clicks "Verify Signature" → inline result persists below the button (success badge or failure message). Not Toast, because users iterate on the key
7. Decode parse errors show as red inline message below the Encoded textarea

### Encode Tab

```
+---------------------------------------------------+
|  Algorithm: [HS256 v]                             |
|                                                   |
|  * Header (cyan dot)                              |
|  +---------------------------------------------+  |
|  | StyledTextarea (editable JSON)    [CopyBtn] |  |
|  +---------------------------------------------+  |
|                                                   |
|  * Payload (cyan dot)                             |
|  +---------------------------------------------+  |
|  | StyledTextarea (editable JSON)    [CopyBtn] |  |
|  +---------------------------------------------+  |
|                                                   |
|  Secret / Private Key (purple dot)                |
|  +---------------------------------------------+  |
|  | StyledTextarea (key input)                  |  |
|  +---------------------------------------------+  |
|                                                   |
|  [Generate JWT]                                   |
|                                                   |
|  * Encoded Token (cyan dot)                       |
|  +---------------------------------------------+  |
|  | StyledTextarea (generated JWT)    [CopyBtn] |  |
|  +---------------------------------------------+  |
+---------------------------------------------------+
|  Description                                      |
+---------------------------------------------------+
```

**Encode flow:**

1. Page first-load defaults (improves immediate-value UX, matches jwt.io):
   - Algorithm: `HS256`
   - Header: `{"alg": "HS256", "typ": "JWT"}`
   - Payload: `{"sub": "1234567890", "name": "John Doe", "iat": 1516239022}`
   - Key: empty (user must supply)
2. Switching algorithm rewrites the `alg` field in the Header textarea (preserves user-added fields like `kid`)
3. **Header merge order:** `setProtectedHeader({ ...userHeader, alg })` — dropdown wins so users can't accidentally desync the header `alg` from the signing algorithm
4. JSON parse errors on Header/Payload shown via Toast on Generate click
5. Generated token appears in the bottom textarea. Empty until first generation

### Key Input Placeholder

Driven by algorithm prefix:

- HMAC (`HS*`) → "Enter secret key"
- RSA / RSA-PSS / ECDSA (asymmetric) on **Decode** tab → "Paste PEM public key (SPKI, `-----BEGIN PUBLIC KEY-----`)"
- RSA / RSA-PSS / ECDSA (asymmetric) on **Encode** tab → "Paste PEM private key (PKCS8, `-----BEGIN PRIVATE KEY-----`)"

Below the textarea on asymmetric algorithms, render a small hint line:

> Only PKCS8 / SPKI accepted. Convert PKCS1/SEC1 with `openssl pkcs8 -topk8 -nocrypt -in old.pem -out pkcs8.pem`.

### Algorithm Dropdown Options

```
HMAC:     HS256, HS384, HS512
RSA:      RS256, RS384, RS512
RSA-PSS:  PS256, PS384, PS512
ECDSA:    ES256, ES384, ES512
```

## Core Logic: `libs/jwt/main.ts`

### Types

```typescript
type JwtAlgorithm =
  | "HS256"
  | "HS384"
  | "HS512"
  | "RS256"
  | "RS384"
  | "RS512"
  | "PS256"
  | "PS384"
  | "PS512"
  | "ES256"
  | "ES384"
  | "ES512";

interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signatureBase64Url: string; // raw form from token
  signatureHex: string; // for the hex toggle
}

interface VerifyResult {
  valid: boolean;
  error?: string;
}

interface EncodeResult {
  token: string;
  error?: string;
}
```

### Functions

**`decode(token: string): DecodedJwt | null`**

Uses `jose.decodeJwt()` + `jose.decodeProtectedHeader()`. Splits token on `.`, takes the third part as the Base64URL signature, also computes hex for the toggle. Returns `null` on malformed input — page shows inline error.

**`verify(token: string, key: string, alg: JwtAlgorithm): Promise<VerifyResult>`**

Critical security details:

1. **Reject `alg === "none"` immediately** — return `{ valid: false, error: "alg=none is rejected" }` before any crypto call.
2. **Pin the algorithm** — pass `{ algorithms: [alg] }` to `jwtVerify` so an attacker can't substitute a different algorithm than the one the user intends. This blocks the classic RS256/HS256 confusion attack.

```typescript
async function verify(token, key, alg) {
  if (alg === "none") return { valid: false, error: errMsg("algNoneRejected") };
  try {
    const cryptoKey = await loadKeyForVerify(key, alg); // see Key Loading
    await jwtVerify(token, cryptoKey, { algorithms: [alg] });
    return { valid: true };
  } catch (e) {
    return { valid: false, error: mapJoseError(e) };
  }
}
```

**`encode(header, payload, key, alg): Promise<EncodeResult>`**

```typescript
async function encode(header, payload, key, alg) {
  if (alg === "none") return { token: "", error: errMsg("algNoneRejected") };
  try {
    const cryptoKey = await loadKeyForSign(key, alg);
    const token = await new SignJWT(payload)
      .setProtectedHeader({ ...header, alg }) // dropdown wins
      .sign(cryptoKey);
    return { token };
  } catch (e) {
    return { token: "", error: mapJoseError(e) };
  }
}
```

### Key Loading

```typescript
// HMAC: jose accepts Uint8Array directly, no SubtleCrypto importKey dance
function loadHmacKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

// Asymmetric verify (public key)
async function loadKeyForVerify(key: string, alg: JwtAlgorithm) {
  if (alg.startsWith("H")) return loadHmacKey(key);
  assertPemHeader(key, "PUBLIC KEY"); // throws with conversion-hint error key
  return importSPKI(key, alg);
}

// Asymmetric sign (private key)
async function loadKeyForSign(key: string, alg: JwtAlgorithm) {
  if (alg.startsWith("H")) return loadHmacKey(key);
  assertPemHeader(key, "PRIVATE KEY"); // throws with conversion-hint error key
  return importPKCS8(key, alg);
}
```

### PEM Format Pre-check

`jose.importPKCS8` / `importSPKI` reject non-conforming PEM with cryptic errors. We do an explicit pre-check on the `-----BEGIN ...-----` header and produce an actionable error before delegating.

`assertPemHeader(pem, expected)` reads the first PEM header line:

| Input header                            | Expected `PRIVATE KEY` (sign)              | Expected `PUBLIC KEY` (verify)      |
| --------------------------------------- | ------------------------------------------ | ----------------------------------- |
| `-----BEGIN PRIVATE KEY-----`           | OK (pass to `importPKCS8`)                 | mismatch → `errors.expectedPublic`  |
| `-----BEGIN PUBLIC KEY-----`            | mismatch → `errors.expectedPrivate`        | OK (pass to `importSPKI`)           |
| `-----BEGIN RSA PRIVATE KEY-----`       | reject → `errors.pkcs1NotSupported`        | reject → `errors.pkcs1NotSupported` |
| `-----BEGIN RSA PUBLIC KEY-----`        | reject → `errors.pkcs1NotSupported`        | reject → `errors.pkcs1NotSupported` |
| `-----BEGIN EC PRIVATE KEY-----`        | reject → `errors.sec1NotSupported`         | reject → `errors.sec1NotSupported`  |
| `-----BEGIN ENCRYPTED PRIVATE KEY-----` | reject → `errors.encryptedKeyNotSupported` | same                                |
| `-----BEGIN CERTIFICATE-----`           | reject → `errors.certNotSupported`         | same                                |
| Anything else / no PEM header           | reject → `errors.invalidPemFormat`         | same                                |

Each rejected case maps to a translation key whose message includes the suggested `openssl` command (e.g. `openssl pkcs8 -topk8 -nocrypt -in old.pem -out pkcs8.pem` for PKCS1 → PKCS8). No ASN.1 parsing — pure header string match.

### Error Handling

All `jose` exceptions and `assertPemHeader` rejections caught and converted to translation keys (`pkcs1NotSupported`, `sec1NotSupported`, `encryptedKeyNotSupported`, `certNotSupported`, `expectedPublic`, `expectedPrivate`, `invalidPemFormat`, `invalidKey`, `verifyFailed`, `algNoneRejected`, `algorithmMismatch`). Functions never throw — errors returned via the `error` field. UI displays them inline (verify) or via Toast (encode JSON parse errors).

## i18n

### `public/locales/*/jwt.json`

JWT-specific keys only. **Shared keys (`clear`, `clearAll`, `encoded`, `decoded`, `copy`, `generate`, etc.) are pulled from `common.json` via `useTranslations("common")`** — recent commit `9cbb02a` consolidated these and we don't duplicate.

```json
{
  "tabDecode": "Decode",
  "tabEncode": "Encode",
  "encodedPlaceholder": "Paste JWT token here",
  "decodedResult": "Decoded Result",
  "header": "Header",
  "payload": "Payload",
  "signature": "Signature",
  "signatureFormatBase64Url": "Base64URL",
  "signatureFormatHex": "Hex",
  "verifySection": "Verify Signature",
  "algorithm": "Algorithm",
  "secretOrPublicKey": "Secret / Public Key",
  "secretPlaceholder": "Enter secret key",
  "pemPublicPlaceholder": "Paste PEM public key (SPKI: -----BEGIN PUBLIC KEY-----)",
  "pemPrivatePlaceholder": "Paste PEM private key (PKCS8: -----BEGIN PRIVATE KEY-----)",
  "pemHint": "Only PKCS8 / SPKI accepted. Convert with: openssl pkcs8 -topk8 -nocrypt -in old.pem -out pkcs8.pem",
  "verify": "Verify Signature",
  "verifySuccess": "Signature verified",
  "verifyFailed": "Signature verification failed",
  "encodeTitle": "Encode",
  "headerLabel": "Header",
  "payloadLabel": "Payload",
  "secretOrPrivateKey": "Secret / Private Key",
  "generate": "Generate JWT",
  "generatedToken": "Generated Token",
  "errors": {
    "invalidJwt": "Invalid JWT format",
    "invalidJson": "Invalid JSON in {field}",
    "invalidKey": "Invalid key format",
    "invalidPemFormat": "Unrecognized PEM format. Expected -----BEGIN PRIVATE KEY----- (PKCS8) or -----BEGIN PUBLIC KEY----- (SPKI).",
    "pkcs1NotSupported": "PKCS1 keys are not supported. Convert with: openssl pkcs8 -topk8 -nocrypt -in pkcs1.pem -out pkcs8.pem  (private)  /  openssl rsa -in pkcs1.pem -RSAPublicKey_in -pubout -out spki.pem  (public)",
    "sec1NotSupported": "SEC1 EC keys are not supported. Convert with: openssl pkcs8 -topk8 -nocrypt -in sec1.pem -out pkcs8.pem",
    "encryptedKeyNotSupported": "Encrypted PEM keys are not supported. Decrypt first with: openssl pkcs8 -in encrypted.pem -out plain.pem",
    "certNotSupported": "Paste a public key, not a certificate. Extract with: openssl x509 -in cert.pem -pubkey -noout",
    "expectedPublic": "Verify needs a public key (-----BEGIN PUBLIC KEY-----), not a private key",
    "expectedPrivate": "Sign needs a private key (-----BEGIN PRIVATE KEY-----), not a public key",
    "algNoneRejected": "alg=none is rejected — this token is not signed and verification is not meaningful",
    "algorithmMismatch": "Token algorithm does not match selected algorithm"
  },
  "descriptions": {
    "whatIsTitle": "What is JWT?",
    "whatIs": "JWT (JSON Web Token, RFC 7519) is an open standard for securely transmitting information between parties as a compact JSON object. It is commonly used for authentication and authorization.",
    "structureTitle": "Structure",
    "structure": "A JWT consists of three Base64URL-encoded parts separated by dots: Header.Payload.Signature. The header specifies the token type and signing algorithm. The payload contains the claims. The signature verifies integrity.",
    "algorithmsTitle": "Supported Algorithms",
    "algorithms": "HMAC (HS256/384/512), RSA (RS256/384/512), RSA-PSS (PS256/384/512), and ECDSA (ES256/384/512). The unsigned `alg=none` is rejected for safety.",
    "keyFormatsTitle": "Accepted Key Formats",
    "keyFormats": "HMAC: any UTF-8 string. Asymmetric: PEM only — PKCS8 (-----BEGIN PRIVATE KEY-----) for signing, SPKI (-----BEGIN PUBLIC KEY-----) for verifying. PKCS1, SEC1, encrypted PEM, and X.509 certificates are not accepted; the tool will tell you the exact openssl command to convert them."
  }
}
```

### `public/locales/*/tools.json` addition

```json
{
  "jwt": {
    "shortTitle": "JWT",
    "title": "JWT Debugger - JSON Web Token Encoder & Decoder",
    "description": "Encode, decode, and verify JSON Web Tokens (JWT). Supports HS256, RS256, ES256 and more."
  }
}
```

## Privacy

Standard ByteCraft privacy notice (`tc("alert.notTransferred")`) at the top of the page. The `jose` library uses Web Crypto API exclusively — no network calls. PEM header detection is pure string matching.

## Scope Exclusions (YAGNI)

Out of scope:

- JWT encryption (JWE) — only JWS (signed tokens)
- Refresh token / session management
- Auth provider integration
- Claim validation (`exp`/`nbf`/`iat`) — decode shows raw values, user interprets
- Generation templates / presets beyond the single first-load example
- Bulk token operations
- JWK / JWK Set (JWKS) input — PEM only
- Token diff/comparison
- PKCS1 RSA / SEC1 EC keys — only PKCS8 / SPKI; tool gives the `openssl` command to convert
- Encrypted PEM key passphrase prompts
- X.509 certificate parsing (only PEM public keys)
- ES256K (secp256k1)
