type ErrorLogLevel = 'error' | 'warn' | 'info';

interface ErrorLogEntry {
  timestamp: string;
  level: ErrorLogLevel;
  message: string;
  path?: string;
  method?: string;
  statusCode?: number;
  stack?: string;
  userAgent?: string;
  requestBody?: any;
  additionalInfo?: Record<string, any>;
}

const errorLogs: ErrorLogEntry[] = [];
const MAX_LOGS = 500;

export function logError(
  error: Error | string,
  context?: {
    path?: string;
    method?: string;
    statusCode?: number;
    userAgent?: string;
    requestBody?: any;
    additionalInfo?: Record<string, any>;
  }
): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'string' ? undefined : error.stack,
    ...context,
  };

  errorLogs.unshift(entry);
  
  if (errorLogs.length > MAX_LOGS) {
    errorLogs.pop();
  }

  console.error('[ERROR LOG]', JSON.stringify(entry, null, 2));
}

export function logWarning(message: string, additionalInfo?: Record<string, any>): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    level: 'warn',
    message,
    additionalInfo,
  };

  errorLogs.unshift(entry);
  
  if (errorLogs.length > MAX_LOGS) {
    errorLogs.pop();
  }

  console.warn('[WARN LOG]', JSON.stringify(entry, null, 2));
}

export function logInfo(message: string, additionalInfo?: Record<string, any>): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    additionalInfo,
  };

  errorLogs.unshift(entry);
  
  if (errorLogs.length > MAX_LOGS) {
    errorLogs.pop();
  }

  console.log('[INFO LOG]', JSON.stringify(entry, null, 2));
}

export function getRecentErrors(limit: number = 50): ErrorLogEntry[] {
  return errorLogs.slice(0, limit);
}

export function getErrorsByLevel(level: ErrorLogLevel, limit: number = 50): ErrorLogEntry[] {
  return errorLogs.filter(log => log.level === level).slice(0, limit);
}

export function clearLogs(): void {
  errorLogs.length = 0;
}
