// "Simple" logging module for ElectionGuard.

// This code supports eager and lazy specification of a log string:
// just use a lambda returning the log string for lazy behavior.
// Also, everything logged here is stored and can be fetched using
// getAllLogs(). Useful when gathering an extended error dump.

// TODO: capture stack traces or allow them to be rendered
//   in some useful way to the logs.

// TODO; maintain log in a more structured way, to make it
//   easier for an external entity to parse the logs.

const allLogs: string[] = [];
type LogTypes = 'INFO' | 'WARN' | 'ERROR';
let logLevel: LogTypes = 'INFO';

type LogStringType = string | (() => string);

/**
 * Sets which logs are ignored. INFO gives all logs. WARN
 * gives only WARN and ERROR. ERROR gives only ERROR logs.
 */
export function verbosity(type: LogTypes) {
  logLevel = type;
}

/** Logs some information. */
export function info(module: string, contents: LogStringType) {
  common('INFO', module, contents);
}

/** Logs a warning. */
export function warn(module: string, contents: LogStringType) {
  common('WARN', module, contents);
}

/** Logs an error, also throws Error with the same string. */
export function errorAndThrow(module: string, contents: LogStringType) {
  common('ERROR', module, contents, true);
}

function common(
  type: LogTypes,
  module: string,
  contents: LogStringType,
  error = false
) {
  const contentsStr = typeof contents === 'string' ? contents : contents();

  const date = new Date().toISOString();
  const consoleLogStr = `${type} ${module}: ${contentsStr}`;
  const fullLogStr = `${date} ${consoleLogStr}`;
  switch (type) {
    case 'INFO':
      if (logLevel === 'INFO') console.info(consoleLogStr);
      break;
    case 'WARN':
      if (logLevel === 'INFO' || logLevel === 'WARN')
        console.warn(consoleLogStr);
      break;
    case 'ERROR':
      console.error(consoleLogStr);
      break;
  }
  allLogs.push(fullLogStr);

  if (error) throw new Error(fullLogStr);
}

/** Returns an array of every logged string. */
export function getAllLogs(): string[] {
  return allLogs;
}
