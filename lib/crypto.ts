/** WARNING: placeholder crypto. Replace with libsodium for prod GitHub secret encryption. */
export function encryptJson(input: unknown): string {
  return Buffer.from(JSON.stringify(input), "utf8").toString("base64");
}
export function decryptJson<T = any>(input: string): T {
  try {
    const buf = Buffer.from(input, "base64");
    return JSON.parse(buf.toString("utf8")) as T;
  } catch {
    return JSON.parse(input) as T;
  }
}
/** Simple API token generator (dev only). Replace with proper signer/HMAC in prod. */
export function generateApiToken(bytes = 32): string {
  const { randomBytes } = require("crypto");
  return randomBytes(bytes).toString("hex");
}
