type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

type SerializedError = {
  name: string;
  message: string;
  stack?: string;
};

const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|password|secret|token|api[-_]?key|keyhash|passwordhash|refreshtokenhash|twofactorsecret/i;
const REDACTED_VALUE = "[REDACTED]";
const MAX_REDACTION_DEPTH = 4;

function shouldIncludeStackTrace(): boolean {
  return process.env.NODE_ENV !== "production";
}

function serializeError(error: unknown): SerializedError | unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(shouldIncludeStackTrace() && error.stack !== undefined
        ? { stack: error.stack }
        : {}),
    };
  }

  return redactSensitiveValues(error);
}

function redactSensitiveValues(value: unknown, depth = 0): unknown {
  if (value instanceof Error) return serializeError(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_REDACTION_DEPTH) return "[MaxDepth]";

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValues(item, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key)
        ? REDACTED_VALUE
        : redactSensitiveValues(entry, depth + 1),
    ]),
  );
}

function normalizeContext(context: LogContext = {}): LogContext {
  return redactSensitiveValues(context) as LogContext;
}

function writeLog(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    ...normalizeContext(context),
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  const payload = JSON.stringify(entry);

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.log(payload);
}

export const logger = {
  info(message: string, context?: LogContext) {
    writeLog("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    writeLog("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    writeLog("error", message, context);
  },
};
