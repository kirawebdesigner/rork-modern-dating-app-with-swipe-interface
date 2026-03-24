/**
 * Fix #11: Centralized Logger
 * Replaces scattered console.log with structured, level-aware logging.
 * In production, this can be swapped for a remote logging service
 * (e.g., Sentry, LogRocket, or a custom webhook).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  timestamp: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Set via env: LOG_LEVEL=debug|info|warn|error
const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatEntry(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}]`;
  return entry.data
    ? `${prefix} ${entry.message} ${JSON.stringify(entry.data)}`
    : `${prefix} ${entry.message}`;
}

function createEntry(level: LogLevel, module: string, message: string, data?: any): LogEntry {
  return {
    level,
    module,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

/** Remote log buffer for future integration */
const logBuffer: LogEntry[] = [];
const MAX_BUFFER = 100;

function bufferLog(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER) {
    logBuffer.shift();
  }
}

export function createLogger(module: string) {
  return {
    debug(message: string, data?: any) {
      const entry = createEntry('debug', module, message, data);
      bufferLog(entry);
      if (shouldLog('debug')) console.log(formatEntry(entry));
    },
    info(message: string, data?: any) {
      const entry = createEntry('info', module, message, data);
      bufferLog(entry);
      if (shouldLog('info')) console.log(formatEntry(entry));
    },
    warn(message: string, data?: any) {
      const entry = createEntry('warn', module, message, data);
      bufferLog(entry);
      if (shouldLog('warn')) console.warn(formatEntry(entry));
    },
    error(message: string, data?: any) {
      const entry = createEntry('error', module, message, data);
      bufferLog(entry);
      if (shouldLog('error')) console.error(formatEntry(entry));
    },
  };
}

/** Get recent logs for debugging */
export function getRecentLogs(count = 50): LogEntry[] {
  return logBuffer.slice(-count);
}

/** Flush logs (for future remote integration) */
export function flushLogs(): LogEntry[] {
  const logs = [...logBuffer];
  logBuffer.length = 0;
  return logs;
}

export default createLogger;
