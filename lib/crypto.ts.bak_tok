export function encryptJson(input: unknown): string {
  // Placeholder: base64(JSON). Replace with libsodium sealed box for GitHub later.
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
