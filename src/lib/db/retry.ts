type RetryOptions = {
  attempts?: number;
  delayMs?: number;
};

const TRANSIENT_DB_ERROR_PATTERN =
  /fetch failed|timeout|timed out|econnreset|etimedout|und_err|socket|network/i;

function errorText(error: unknown): string {
  if (!error || typeof error !== "object") return String(error);

  const parts: string[] = [];
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as { cause?: unknown; message?: unknown; name?: unknown };
    if (typeof record.name === "string") parts.push(record.name);
    if (typeof record.message === "string") parts.push(record.message);
    current = record.cause;
  }

  return parts.join(" ");
}

function isTransientDbError(error: unknown): boolean {
  return TRANSIENT_DB_ERROR_PATTERN.test(errorText(error));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryTransientDbQuery<T>(
  operation: () => Promise<T>,
  { attempts = 3, delayMs = 150 }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientDbError(error)) throw error;
      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}
