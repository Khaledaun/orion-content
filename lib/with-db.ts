export async function withDB<T>(fn: () => Promise<T>, fallback: T, label = "db") {
  try { return await fn(); }
  catch (err) {
    console.error(`[withDB:${label}]`, err);
    return fallback;
  }
}
