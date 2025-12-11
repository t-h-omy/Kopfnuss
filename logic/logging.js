// Kopfnuss - Logging Utility
// Centralized logging for better diagnostics and error handling

/**
 * Log debug information
 * @param {...any} args - Arguments to log
 */
export function logDebug(...args) {
  console.log(...args);
}

/**
 * Log informational messages
 * @param {...any} args - Arguments to log
 */
export function logInfo(...args) {
  console.info(...args);
}

/**
 * Log warnings
 * @param {...any} args - Arguments to log
 */
export function logWarn(...args) {
  console.warn(...args);
}

/**
 * Log errors
 * @param {...any} args - Arguments to log
 */
export function logError(...args) {
  console.error(...args);
}
