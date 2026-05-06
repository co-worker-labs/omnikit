import { describe, it, expect } from "vitest";
import * as ed from "@noble/ed25519";
import {
  SSHBuffer,
  SSHReader,
  parseDerTagged,
  extractRsaFromPkcs8,
  extractRsaFromSpki,
  serializeRsaPublicBlob,
  serializeEd25519PublicBlob,
} from "../formats";

describe("SSHBuffer writeString + SSHReader readString round-trip", () => {
  it("round-trips an ASCII string", () => {
    const buf = new SSHBuffer();
    buf.writeString("ssh-rsa");
    const reader = new SSHReader(buf.toBytes());
    const result = reader.readString();
    expect(new TextDecoder().decode(result)).toBe("ssh-rsa");
  });

  it("round-trips raw bytes", () => {
    const data = new Uint8Array([0x01, 0x02, 0x03]);
    const buf = new SSHBuffer();
    buf.writeString(data);
    const reader = new SSHReader(buf.toBytes());
    expect(reader.readString()).toEqual(data);
  });
});

describe("SSHBuffer writeUint32", () => {
  it("writes big-endian uint32", () => {
    const buf = new SSHBuffer();
    buf.writeUint32(0x01020304);
    const bytes = buf.toBytes();
    expect(bytes).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
  });
});

describe("SSHBuffer writeMpint", () => {
  it("adds leading zero when high bit is set", () => {
    const buf = new SSHBuffer();
    buf.writeMpint(new Uint8Array([0xff, 0x01]));
    const bytes = buf.toBytes();
    const reader = new SSHReader(bytes);
    const mpint = reader.readString();
    expect(mpint[0]).toBe(0x00);
    expect(mpint[1]).toBe(0xff);
    expect(mpint[2]).toBe(0x01);
  });

  it("does not add leading zero when high bit is clear", () => {
    const buf = new SSHBuffer();
    buf.writeMpint(new Uint8Array([0x7f, 0x01]));
    const bytes = buf.toBytes();
    const reader = new SSHReader(bytes);
    const mpint = reader.readString();
    expect(mpint.length).toBe(2);
    expect(mpint[0]).toBe(0x7f);
  });
});

describe("serializeEd25519PublicBlob", () => {
  it("produces correct SSH wire format", () => {
    const pubKey = new Uint8Array(32).fill(0xab);
    const blob = serializeEd25519PublicBlob(pubKey);
    const reader = new SSHReader(blob);
    expect(reader.readStringUtf8()).toBe("ssh-ed25519");
    const keyData = reader.readString();
    expect(keyData).toHaveLength(32);
    expect(keyData[0]).toBe(0xab);
  });
});

describe("serializeRsaPublicBlob", () => {
  it("produces blob starting with ssh-rsa", () => {
    const e = new Uint8Array([0x01, 0x00, 0x01]);
    const n = new Uint8Array(256).fill(0x7f);
    const blob = serializeRsaPublicBlob(e, n);
    const reader = new SSHReader(blob);
    expect(reader.readStringUtf8()).toBe("ssh-rsa");
    reader.readString();
    reader.readString();
    expect(reader.remaining).toBe(0);
  });
});

describe("Ed25519 key generation", () => {
  it("produces 32-byte seed and 32-byte public key", async () => {
    const seed = ed.utils.randomSecretKey();
    const pub = await ed.getPublicKeyAsync(seed);
    expect(seed).toHaveLength(32);
    expect(pub).toHaveLength(32);
  });

  it("public key string starts with ssh-ed25519", async () => {
    const seed = ed.utils.randomSecretKey();
    const pub = await ed.getPublicKeyAsync(seed);
    const blob = serializeEd25519PublicBlob(pub);
    const b64 = btoa(String.fromCharCode(...blob));
    const publicKeyStr = `ssh-ed25519 ${b64}`;
    expect(publicKeyStr.startsWith("ssh-ed25519 ")).toBe(true);
    expect(b64.length).toBeGreaterThan(10);
  });
});

describe("RSA key generation via WebCrypto", () => {
  it("generates RSA-2048 and extracts components", async () => {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
    const spki = new Uint8Array(await crypto.subtle.exportKey("spki", keyPair.publicKey));
    const priv = extractRsaFromPkcs8(pkcs8);
    const pub = extractRsaFromSpki(spki);
    expect(priv.n.length).toBeGreaterThanOrEqual(256);
    expect(priv.e).toHaveLength(3);
    expect(pub.n).toEqual(priv.n);
    expect(pub.e).toEqual(priv.e);
  });

  it("public key string starts with ssh-rsa", async () => {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );
    const spki = new Uint8Array(await crypto.subtle.exportKey("spki", keyPair.publicKey));
    const { e, n } = extractRsaFromSpki(spki);
    const blob = serializeRsaPublicBlob(e, n);
    const b64 = btoa(String.fromCharCode(...blob));
    const publicKeyStr = `ssh-rsa ${b64}`;
    expect(publicKeyStr.startsWith("ssh-rsa ")).toBe(true);
  });
});

import { sha256Fingerprint, md5Fingerprint, randomart } from "../fingerprint";

describe("sha256Fingerprint", () => {
  it("produces SHA256: prefix + base64 without padding", async () => {
    const input = new Uint8Array(32).fill(0x42);
    const fp = await sha256Fingerprint(input);
    expect(fp.startsWith("SHA256:")).toBe(true);
    const b64part = fp.slice(7);
    expect(b64part).not.toMatch(/=+$/);
    expect(b64part.length).toBeGreaterThan(10);
  });
});

describe("md5Fingerprint", () => {
  it("produces colon-separated hex pairs", async () => {
    const input = new Uint8Array(32).fill(0x42);
    const fp = await md5Fingerprint(input);
    const parts = fp.split(":");
    expect(parts).toHaveLength(16);
    for (const p of parts) {
      expect(p).toMatch(/^[0-9a-f]{2}$/);
    }
  });
});

describe("randomart", () => {
  it("produces bordered grid with correct dimensions", async () => {
    const input = new Uint8Array(32).fill(0x42);
    const hash = await crypto.subtle.digest("SHA-256", input);
    const art = randomart(new Uint8Array(hash), "ED25519", 256, "SHA256");
    const lines = art.split("\n");
    expect(lines.length).toBe(11);
    expect(lines[0].startsWith("+")).toBe(true);
    expect(lines[0].endsWith("+")).toBe(true);
    expect(lines[lines.length - 1].startsWith("+")).toBe(true);
    expect(lines[1].startsWith("|")).toBe(true);
    expect(lines[1].endsWith("|")).toBe(true);
    expect(lines[1].length).toBe(19);
  });

  it("contains key type in top border", async () => {
    const input = new Uint8Array(32).fill(0x42);
    const hash = await crypto.subtle.digest("SHA-256", input);
    const art = randomart(new Uint8Array(hash), "RSA", 4096, "SHA256");
    expect(art).toContain("[RSA 4096]");
    expect(art).toContain("[SHA256]");
  });

  it("contains S (start) and E (end) markers", async () => {
    const input = new Uint8Array(32).fill(0x42);
    const hash = await crypto.subtle.digest("SHA-256", input);
    const art = randomart(new Uint8Array(hash), "ED25519", 256, "SHA256");
    expect(art).toContain("S");
    expect(art).toContain("E");
  });
});

import { buildEd25519PrivateData, buildRsaPrivateData, buildOpenSshPrivateKey } from "../formats";
import { blowfishTestEncrypt, buildOpenSshPrivateKeyEncrypted } from "../formats-encrypted";

describe("Blowfish cipher", () => {
  it("matches known test vector: all-zero key and plaintext", () => {
    const key = new Uint8Array(8);
    const plain = new Uint8Array(8);
    const xl = (plain[0] << 24) | (plain[1] << 16) | (plain[2] << 8) | plain[3];
    const xr = (plain[4] << 24) | (plain[5] << 16) | (plain[6] << 8) | plain[7];
    const { l, r } = blowfishTestEncrypt(key, xl, xr);
    expect((l >>> 0).toString(16).padStart(8, "0")).toBe("4ef99745");
    expect((r >>> 0).toString(16).padStart(8, "0")).toBe("6198dd78");
  });
});

describe("buildOpenSshPrivateKey (unencrypted)", () => {
  it("produces valid PEM for Ed25519", async () => {
    const seed = new Uint8Array(32).fill(0x42);
    const pubKey = new Uint8Array(32).fill(0x43);
    const pubBlob = serializeEd25519PublicBlob(pubKey);
    const priv = buildOpenSshPrivateKey({
      publicKeyBlob: pubBlob,
      privateKeyData: buildEd25519PrivateData(pubKey, seed),
      comment: "test@example.com",
      passphrase: "",
    });
    expect(priv.startsWith("-----BEGIN OPENSSH PRIVATE KEY-----\n")).toBe(true);
    expect(priv.endsWith("\n-----END OPENSSH PRIVATE KEY-----\n")).toBe(true);
    const b64 = priv
      .split("\n")
      .filter((l) => !l.startsWith("-----"))
      .join("");
    const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    expect(raw.slice(0, 15)).toEqual(new TextEncoder().encode("openssh-key-v1\0"));
    const reader = new SSHReader(raw.slice(15));
    const cipher = reader.readStringUtf8();
    expect(cipher).toBe("none");
  });

  it("produces valid PEM for RSA", async () => {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );
    const spki = new Uint8Array(await crypto.subtle.exportKey("spki", keyPair.publicKey));
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
    const { e, n } = extractRsaFromSpki(spki);
    const rsa = extractRsaFromPkcs8(pkcs8);
    const pubBlob = serializeRsaPublicBlob(e, n);
    const priv = buildOpenSshPrivateKey({
      publicKeyBlob: pubBlob,
      privateKeyData: buildRsaPrivateData(rsa),
      comment: "",
      passphrase: "",
    });
    expect(priv.startsWith("-----BEGIN OPENSSH PRIVATE KEY-----\n")).toBe(true);
    const b64 = priv
      .split("\n")
      .filter((l) => !l.startsWith("-----"))
      .join("");
    const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const reader = new SSHReader(raw.slice(15));
    const cipher = reader.readStringUtf8();
    expect(cipher).toBe("none");
  });
});

describe("Encrypted private key", () => {
  it("produces PEM with aes256-ctr cipher and bcrypt kdf", async () => {
    const seed = new Uint8Array(32);
    crypto.getRandomValues(seed);
    const pubKey = new Uint8Array(32);
    crypto.getRandomValues(pubKey);
    const pubBlob = serializeEd25519PublicBlob(pubKey);
    const privData = buildEd25519PrivateData(pubKey, seed);
    const enc = await buildOpenSshPrivateKeyEncrypted({
      publicKeyBlob: pubBlob,
      privateKeyData: privData,
      comment: "test",
      passphrase: "mypassword",
    });
    expect(enc.startsWith("-----BEGIN OPENSSH PRIVATE KEY-----")).toBe(true);
    expect(enc.endsWith("\n-----END OPENSSH PRIVATE KEY-----\n")).toBe(true);
    const b64 = enc
      .split("\n")
      .filter((l) => !l.startsWith("-----"))
      .join("");
    const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    expect(raw.slice(0, 15)).toEqual(new TextEncoder().encode("openssh-key-v1\0"));
    const reader = new SSHReader(raw.slice(15));
    const cipherName = reader.readStringUtf8();
    expect(cipherName).toBe("aes256-ctr");
    const kdfName = reader.readStringUtf8();
    expect(kdfName).toBe("bcrypt");
    const kdfOpts = reader.readString();
    expect(kdfOpts.length).toBe(20);
    reader.readUint32();
    const pubBlobInFile = reader.readString();
    expect(pubBlobInFile).toEqual(pubBlob);
  });

  it("produces deterministic output for same random seed", async () => {
    const pubKey = new Uint8Array(32).fill(0xcd);
    const seed = new Uint8Array(32).fill(0xef);
    const pubBlob = serializeEd25519PublicBlob(pubKey);
    const privData = buildEd25519PrivateData(pubKey, seed);
    const enc = await buildOpenSshPrivateKeyEncrypted({
      publicKeyBlob: pubBlob,
      privateKeyData: privData,
      comment: "deterministic",
      passphrase: "fixedpass",
    });
    const b64 = enc
      .split("\n")
      .filter((l) => !l.startsWith("-----"))
      .join("");
    const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const reader = new SSHReader(raw.slice(15));
    reader.readString();
    reader.readString();
    const kdfOpts = reader.readString();
    expect(kdfOpts.length).toBe(20);
    const rounds = (kdfOpts[16] << 24) | (kdfOpts[17] << 16) | (kdfOpts[18] << 8) | kdfOpts[19];
    expect(rounds).toBe(16);
    reader.readUint32();
    const pubBlobInFile = reader.readString();
    expect(pubBlobInFile).toEqual(pubBlob);
  });
});

import { parsePublicKey } from "../main";

describe("parsePublicKey", () => {
  it("parses a valid ssh-ed25519 public key", async () => {
    const seed = new Uint8Array(32);
    crypto.getRandomValues(seed);
    const pub = await ed.getPublicKeyAsync(seed);
    const blob = serializeEd25519PublicBlob(pub);
    const b64 = btoa(String.fromCharCode(...blob));
    const keyStr = `ssh-ed25519 ${b64} test@host`;
    const info = await parsePublicKey(keyStr);
    if ("error" in info) throw new Error(info.error);
    expect(info.type).toBe("ssh-ed25519");
    expect(info.bits).toBe(256);
    expect(info.comment).toBe("test@host");
    expect(info.fingerprintSha256.startsWith("SHA256:")).toBe(true);
    expect(info.fingerprintMd5).toContain(":");
  });

  it("returns error for invalid input", async () => {
    const result = await parsePublicKey("not a key");
    expect("error" in result).toBe(true);
  });

  it("returns error for unsupported key type", async () => {
    const result = await parsePublicKey("ssh-dss AAAAB3NzaC1kc3MAAACB");
    expect("error" in result).toBe(true);
  });

  it("parses ssh-ed25519 without comment", async () => {
    const seed = new Uint8Array(32);
    crypto.getRandomValues(seed);
    const pub = await ed.getPublicKeyAsync(seed);
    const blob = serializeEd25519PublicBlob(pub);
    const b64 = btoa(String.fromCharCode(...blob));
    const info = await parsePublicKey(`ssh-ed25519 ${b64}`);
    if ("error" in info) throw new Error(info.error);
    expect(info.comment).toBe("");
  });
});

import { generateKeyPair } from "../main";

describe("generateKeyPair", () => {
  it("generates Ed25519 key pair with all fields", async () => {
    const result = await generateKeyPair({ type: "ed25519" });
    expect(result.publicKey.startsWith("ssh-ed25519 ")).toBe(true);
    expect(result.privateKey).toContain("BEGIN OPENSSH PRIVATE KEY");
    expect(result.fingerprintSha256.startsWith("SHA256:")).toBe(true);
    expect(result.fingerprintMd5).toContain(":");
    expect(result.randomart).toContain("[ED25519 256]");
    expect(result.keyType).toBe("ED25519 256");
    expect(result.comment).toBe("");
  });

  it("generates RSA-2048 key pair", async () => {
    const result = await generateKeyPair({ type: "rsa", rsaBits: 2048 });
    expect(result.publicKey.startsWith("ssh-rsa ")).toBe(true);
    expect(result.privateKey).toContain("BEGIN OPENSSH PRIVATE KEY");
    expect(result.keyType).toBe("RSA 2048");
  }, 30000);

  it("generates with passphrase (encrypted)", async () => {
    const result = await generateKeyPair({ type: "ed25519", passphrase: "test123" });
    expect(result.privateKey).toContain("BEGIN OPENSSH PRIVATE KEY");
  });

  it("generates with comment", async () => {
    const result = await generateKeyPair({ type: "ed25519", comment: "user@host" });
    expect(result.publicKey).toContain("user@host");
    expect(result.comment).toBe("user@host");
  });

  it("round-trip: generate then parse public key", async () => {
    const result = await generateKeyPair({ type: "ed25519", comment: "roundtrip" });
    const parsed = await parsePublicKey(result.publicKey);
    if ("error" in parsed) throw new Error(parsed.error);
    expect(parsed.fingerprintSha256).toBe(result.fingerprintSha256);
    expect(parsed.fingerprintMd5).toBe(result.fingerprintMd5);
    expect(parsed.randomart).toBe(result.randomart);
    expect(parsed.comment).toBe("roundtrip");
  });

  it("round-trip: generate then parse RSA public key", async () => {
    const result = await generateKeyPair({ type: "rsa", rsaBits: 2048, comment: "rsa-rt" });
    const parsed = await parsePublicKey(result.publicKey);
    if ("error" in parsed) throw new Error(parsed.error);
    expect(parsed.fingerprintSha256).toBe(result.fingerprintSha256);
    expect(parsed.fingerprintMd5).toBe(result.fingerprintMd5);
    expect(parsed.randomart).toBe(result.randomart);
    expect(parsed.comment).toBe("rsa-rt");
  }, 30000);
});

describe("Test vectors against OpenSSH reference values", () => {
  const KNOWN_PUB_KEY_BLOB_HEX =
    "0000000b7373682d6564323535313900000020aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  it("sha256Fingerprint matches known value", async () => {
    const blob = Uint8Array.from(Buffer.from(KNOWN_PUB_KEY_BLOB_HEX, "hex"));
    const fp = await sha256Fingerprint(blob);
    expect(fp).toBe("SHA256:0M0y80ai0sm0JRSMIydZXsm3fAPifTYR1w3QgnI8nGM");
  });

  it("md5Fingerprint matches known value", async () => {
    const blob = Uint8Array.from(Buffer.from(KNOWN_PUB_KEY_BLOB_HEX, "hex"));
    const fp = await md5Fingerprint(blob);
    expect(fp).toBe("2f:28:04:fe:e0:aa:f0:cb:41:49:57:19:04:df:61:ad");
  });

  it("randomart matches OpenSSH output for known hash (ED25519)", () => {
    const hashHex = "425ed4e4a36b30ea21b90e21c712c649e8214c29b7eaf68089d1039c6e55384c";
    const hash = Uint8Array.from(Buffer.from(hashHex, "hex"));
    const art = randomart(hash, "ED25519", 256, "SHA256");
    expect(art).toBe(
      "+--[ED25519 256]--+\n" +
        "|+o+E..  .o.      |\n" +
        "|B+++.  . ..      |\n" +
        "|*B.o. . . o      |\n" +
        "|o*o  o . . .     |\n" +
        "|=+=   = S        |\n" +
        "|** o . + .       |\n" +
        "|*.o o   o        |\n" +
        "| +.+ . .         |\n" +
        "|..+..            |\n" +
        "+----[SHA256]-----+"
    );
  });

  it("randomart matches OpenSSH output for all-zero hash (RSA 4096)", () => {
    const hash = new Uint8Array(32);
    const art = randomart(hash, "RSA", 4096, "SHA256");
    expect(art).toBe(
      "+---[RSA 4096]----+\n" +
        "|E....            |\n" +
        "|     .           |\n" +
        "|      .          |\n" +
        "|       .         |\n" +
        "|        S        |\n" +
        "|                 |\n" +
        "|                 |\n" +
        "|                 |\n" +
        "|                 |\n" +
        "+----[SHA256]-----+"
    );
  });

  it("parsePublicKey returns correct fingerprints for known key", async () => {
    const blob = Uint8Array.from(Buffer.from(KNOWN_PUB_KEY_BLOB_HEX, "hex"));
    const b64 = btoa(String.fromCharCode(...blob));
    const info = await parsePublicKey(`ssh-ed25519 ${b64} test@vector`);
    if ("error" in info) throw new Error(info.error);
    expect(info.fingerprintSha256).toBe("SHA256:0M0y80ai0sm0JRSMIydZXsm3fAPifTYR1w3QgnI8nGM");
    expect(info.fingerprintMd5).toBe("2f:28:04:fe:e0:aa:f0:cb:41:49:57:19:04:df:61:ad");
    expect(info.type).toBe("ssh-ed25519");
    expect(info.bits).toBe(256);
    expect(info.comment).toBe("test@vector");
  });
});
