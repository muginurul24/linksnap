type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

type SerializedError = {
  name: string;
  message: string;
  stack?: string;
};

function serializeError(error: unknown): SerializedError | unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack === undefined ? {} : { stack: error.stack }),
    };
  }

  return error;
}

function normalizeContext(context: LogContext = {}): LogContext {
  if (!("error" in context)) {
    return context;
  }

  return {
    ...context,
    error: serializeError(context.error),
  };
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
