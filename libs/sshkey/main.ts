import * as ed from "@noble/ed25519";
import {
  SSHReader,
  extractRsaFromPkcs8,
  extractRsaFromSpki,
  serializeRsaPublicBlob,
  serializeEd25519PublicBlob,
  buildEd25519PrivateData,
  buildRsaPrivateData,
  buildOpenSshPrivateKey,
} from "./formats";
import { buildOpenSshPrivateKeyEncrypted } from "./formats-encrypted";
import { sha256Fingerprint, md5Fingerprint, randomart } from "./fingerprint";

export interface PublicKeyInfo {
  type: string;
  bits: number;
  comment: string;
  fingerprintSha256: string;
  fingerprintMd5: string;
  randomart: string;
}

export async function parsePublicKey(input: string): Promise<PublicKeyInfo | { error: string }> {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return { error: "Invalid format: expected 'type base64 [comment]'" };

  const keyType = parts[0];
  const b64 = parts[1];
  const comment = parts.slice(2).join(" ");

  if (keyType !== "ssh-rsa" && keyType !== "ssh-ed25519") {
    return {
      error: `Unsupported key type: ${keyType}. Only ssh-rsa and ssh-ed25519 are supported.`,
    };
  }

  let blobBytes: Uint8Array;
  try {
    const binary = atob(b64);
    blobBytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return { error: "Invalid base64 encoding" };
  }

  const reader = new SSHReader(blobBytes);
  const readType = reader.readStringUtf8();
  if (readType !== keyType) {
    return {
      error: `Key type mismatch: header says ${keyType} but blob contains ${readType}`,
    };
  }

  let bits = 0;
  if (keyType === "ssh-ed25519") {
    const keyData = reader.readString();
    bits = keyData.length * 8;
  } else {
    reader.readString();
    const n = reader.readString();
    let start = 0;
    while (start < n.length && n[start] === 0) start++;
    bits = start >= n.length ? 0 : (n.length - start) * 8;
  }

  const fpSha256 = await sha256Fingerprint(blobBytes);
  const fpMd5 = await md5Fingerprint(blobBytes);
  const hash = await crypto.subtle.digest("SHA-256", blobBytes as BufferSource);
  const hashBytes = new Uint8Array(hash);
  const typeLabel = keyType === "ssh-rsa" ? "RSA" : "ED25519";
  const art = randomart(hashBytes, typeLabel, bits, "SHA256");

  return {
    type: keyType,
    bits,
    comment,
    fingerprintSha256: fpSha256,
    fingerprintMd5: fpMd5,
    randomart: art,
  };
}

export type KeyType = "rsa" | "ed25519";
export type RsaBits = 2048 | 3072 | 4096;

export interface SshKeyOptions {
  type: KeyType;
  rsaBits?: RsaBits;
  comment?: string;
  passphrase?: string;
}

export interface SshKeyResult {
  privateKey: string;
  publicKey: string;
  fingerprintSha256: string;
  fingerprintMd5: string;
  randomart: string;
  keyType: string;
  comment: string;
}

function blobToPublicString(blob: Uint8Array, type: string, comment: string): string {
  const b64 = btoa(String.fromCharCode(...blob));
  return comment ? `${type} ${b64} ${comment}` : `${type} ${b64}`;
}

export async function generateKeyPair(opts: SshKeyOptions): Promise<SshKeyResult> {
  const comment = opts.comment ?? "";
  const passphrase = opts.passphrase ?? "";

  if (opts.type === "ed25519") {
    const seed = ed.utils.randomSecretKey();
    const pub = await ed.getPublicKeyAsync(seed);
    const pubBlob = serializeEd25519PublicBlob(pub);
    const privData = buildEd25519PrivateData(pub, seed);

    let privateKey: string;
    if (passphrase) {
      privateKey = await buildOpenSshPrivateKeyEncrypted({
        publicKeyBlob: pubBlob,
        privateKeyData: privData,
        comment,
        passphrase,
      });
    } else {
      privateKey = buildOpenSshPrivateKey({
        publicKeyBlob: pubBlob,
        privateKeyData: privData,
        comment,
        passphrase: "",
      });
    }

    const fpSha256 = await sha256Fingerprint(pubBlob);
    const fpMd5 = await md5Fingerprint(pubBlob);
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", pubBlob as BufferSource));
    const art = randomart(hash, "ED25519", 256, "SHA256");

    return {
      privateKey,
      publicKey: blobToPublicString(pubBlob, "ssh-ed25519", comment),
      fingerprintSha256: fpSha256,
      fingerprintMd5: fpMd5,
      randomart: art,
      keyType: "ED25519 256",
      comment,
    };
  }

  const bits = opts.rsaBits ?? 4096;
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: bits,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", keyPair.publicKey));
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
  const pubComps = extractRsaFromSpki(spki);
  const privComps = extractRsaFromPkcs8(pkcs8);
  const pubBlob = serializeRsaPublicBlob(pubComps.e, pubComps.n);
  const privData = buildRsaPrivateData(privComps);

  let privateKey: string;
  if (passphrase) {
    privateKey = await buildOpenSshPrivateKeyEncrypted({
      publicKeyBlob: pubBlob,
      privateKeyData: privData,
      comment,
      passphrase,
    });
  } else {
    privateKey = buildOpenSshPrivateKey({
      publicKeyBlob: pubBlob,
      privateKeyData: privData,
      comment,
      passphrase: "",
    });
  }

  const fpSha256 = await sha256Fingerprint(pubBlob);
  const fpMd5 = await md5Fingerprint(pubBlob);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", pubBlob as BufferSource));
  const art = randomart(hash, "RSA", bits, "SHA256");

  return {
    privateKey,
    publicKey: blobToPublicString(pubBlob, "ssh-rsa", comment),
    fingerprintSha256: fpSha256,
    fingerprintMd5: fpMd5,
    randomart: art,
    keyType: `RSA ${bits}`,
    comment,
  };
}
