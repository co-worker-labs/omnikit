import {
  decodeJwt,
  decodeProtectedHeader,
  jwtVerify,
  SignJWT,
  importSPKI,
  importPKCS8,
} from "jose";

// --- Types ---

export type JwtAlgorithm =
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

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signatureBase64Url: string;
}

export interface VerifyResult {
  valid: boolean;
  error?: string;
}

export interface EncodeResult {
  token: string;
  error?: string;
}

// --- Constants ---

export const JWT_ALGORITHMS: { group: string; algos: JwtAlgorithm[] }[] = [
  { group: "HMAC", algos: ["HS256", "HS384", "HS512"] },
  { group: "RSA", algos: ["RS256", "RS384", "RS512"] },
  { group: "RSA-PSS", algos: ["PS256", "PS384", "PS512"] },
  { group: "ECDSA", algos: ["ES256", "ES384", "ES512"] },
];

export const ALL_ALGORITHMS: JwtAlgorithm[] = JWT_ALGORITHMS.flatMap((g) => g.algos);

// --- Decode ---

export function decode(token: string): DecodedJwt | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const header = decodeProtectedHeader(token) as Record<string, unknown>;
    const payload = decodeJwt(token) as Record<string, unknown>;
    const signatureBase64Url = parts[2];

    return { header, payload, signatureBase64Url };
  } catch {
    return null;
  }
}

// --- PEM Format Pre-check ---

function assertPemHeader(pem: string, expected: "PUBLIC KEY" | "PRIVATE KEY"): void {
  const match = pem.match(/-----BEGIN ([^-]+)-----/);
  if (!match) throw new Error("errors.invalidPemFormat");

  const header = match[1];

  if (header === expected) return;

  if (header === "RSA PRIVATE KEY" || header === "RSA PUBLIC KEY") {
    throw new Error("errors.pkcs1NotSupported");
  }
  if (header === "EC PRIVATE KEY") {
    throw new Error("errors.sec1NotSupported");
  }
  if (header === "ENCRYPTED PRIVATE KEY") {
    throw new Error("errors.encryptedKeyNotSupported");
  }
  if (header === "CERTIFICATE") {
    throw new Error("errors.certNotSupported");
  }

  if (expected === "PUBLIC KEY" && header === "PRIVATE KEY") {
    throw new Error("errors.expectedPublic");
  }
  if (expected === "PRIVATE KEY" && header === "PUBLIC KEY") {
    throw new Error("errors.expectedPrivate");
  }

  throw new Error("errors.invalidPemFormat");
}

// --- Key Loading ---

function loadHmacKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

async function loadKeyForVerify(key: string, alg: JwtAlgorithm): Promise<CryptoKey | Uint8Array> {
  if (alg.startsWith("H")) return loadHmacKey(key);
  assertPemHeader(key, "PUBLIC KEY");
  return importSPKI(key, alg);
}

async function loadKeyForSign(key: string, alg: JwtAlgorithm): Promise<CryptoKey | Uint8Array> {
  if (alg.startsWith("H")) return loadHmacKey(key);
  assertPemHeader(key, "PRIVATE KEY");
  return importPKCS8(key, alg);
}

// --- Error Mapping ---

function mapJoseError(e: unknown): string {
  if (e instanceof Error) {
    // If the error message is already a translation key, return it directly
    if (e.message.startsWith("errors.")) return e.message;
    return "errors.invalidKey";
  }
  return "errors.invalidKey";
}

// --- Verify ---

export async function verify(token: string, key: string, alg: JwtAlgorithm): Promise<VerifyResult> {
  // Defensive: alg=none blocked at UI layer, but reject here too
  if ((alg as string) === "none") {
    return { valid: false, error: "errors.algNoneRejected" };
  }
  try {
    const cryptoKey = await loadKeyForVerify(key, alg);
    await jwtVerify(token, cryptoKey, { algorithms: [alg] });
    return { valid: true };
  } catch (e) {
    return { valid: false, error: mapJoseError(e) };
  }
}

// --- Encode ---

export async function encode(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  key: string,
  alg: JwtAlgorithm
): Promise<EncodeResult> {
  if ((alg as string) === "none") {
    return { token: "", error: "errors.algNoneRejected" };
  }
  try {
    const cryptoKey = await loadKeyForSign(key, alg);
    const token = await new SignJWT(payload).setProtectedHeader({ ...header, alg }).sign(cryptoKey);
    return { token };
  } catch (e) {
    return { token: "", error: mapJoseError(e) };
  }
}
