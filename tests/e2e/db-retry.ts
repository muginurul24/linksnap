type ErrorWithCause = Error & { cause?: unknown };

function isTransientDbError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);

    const message = current.message.toLowerCase();
    if (
      message.includes("fetch failed") ||
      message.includes("error connecting to database") ||
      message.includes("connection terminated") ||
      message.includes("econnreset") ||
      message.includes("etimedout")
    ) {
      return true;
    }

    current = (current as ErrorWithCause).cause;
  }

  return false;
}

export async function retryTransientDb<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === 5) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }

  throw lastError;
}
