import CryptoJS from "crypto-js";

export async function sha256Fingerprint(publicKeyBlob: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", publicKeyBlob as BufferSource);
  const bytes = new Uint8Array(hash);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return "SHA256:" + btoa(binary).replace(/=+$/, "");
}

export async function md5Fingerprint(publicKeyBlob: Uint8Array): Promise<string> {
  const wordArray = CryptoJS.lib.WordArray.create(publicKeyBlob as any);
  const hash = CryptoJS.MD5(wordArray);
  return hash.toString(CryptoJS.enc.Hex).match(/.{2}/g)!.join(":");
}

export function randomart(hash: Uint8Array, keyType: string, keyBits: number, alg: string): string {
  const FLDBASE = 8;
  const FLDSIZE_X = FLDBASE * 2 + 1;
  const FLDSIZE_Y = FLDBASE + 1;
  const AUG = " .o+=*BOX@%&#/^SE";
  const len = AUG.length - 1;

  const field: number[][] = Array.from({ length: FLDSIZE_X }, () => new Array(FLDSIZE_Y).fill(0));
  const CX = (FLDSIZE_X / 2) | 0;
  const CY = (FLDSIZE_Y / 2) | 0;
  let x = CX;
  let y = CY;

  for (let i = 0; i < hash.length; i++) {
    let input = hash[i];
    for (let b = 0; b < 4; b++) {
      x += input & 1 ? 1 : -1;
      y += input & 2 ? 1 : -1;
      x = Math.max(0, Math.min(x, FLDSIZE_X - 1));
      y = Math.max(0, Math.min(y, FLDSIZE_Y - 1));
      if (field[x][y] < len - 2) field[x][y]++;
      input >>= 2;
    }
  }

  field[CX][CY] = len - 1;
  field[x][y] = len;

  const title = `[${keyType} ${keyBits}]`;
  const hashStr = `[${alg}]`;

  const topPad = Math.floor((FLDSIZE_X - title.length) / 2);
  const topRest = FLDSIZE_X - topPad - title.length;
  let result = "+" + "-".repeat(topPad) + title + "-".repeat(topRest) + "+\n";

  for (let row = 0; row < FLDSIZE_Y; row++) {
    result += "|";
    for (let col = 0; col < FLDSIZE_X; col++) {
      result += AUG[Math.min(field[col][row], len)];
    }
    result += "|\n";
  }

  const botPad = Math.floor((FLDSIZE_X - hashStr.length) / 2);
  const botRest = FLDSIZE_X - botPad - hashStr.length;
  result += "+" + "-".repeat(botPad) + hashStr + "-".repeat(botRest) + "+";

  return result;
}
