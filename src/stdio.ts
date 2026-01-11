import { format } from 'node:util';

const patchedKey = Symbol.for('vgp.mcp.stdio.consolePatched');

function writeStderr(prefix: string | null, args: unknown[]): void {
  const message = format(...(args as []));
  const line = prefix ? `${prefix}${message}\n` : `${message}\n`;
  process.stderr.write(line);
}

/**
 * Redirect stdout console methods (log/info/debug) to stderr so they can't
 * corrupt the MCP stdio transport stream.
 */
export function patchConsoleForMcpStdio(): void {
  const globalObj = globalThis as Record<string | symbol, unknown>;
  if (globalObj[patchedKey]) return;
  globalObj[patchedKey] = true;

  console.log = (...args: unknown[]) => writeStderr(null, args);
  console.info = (...args: unknown[]) => writeStderr(null, args);
  console.debug = (...args: unknown[]) => writeStderr(null, args);
}

patchConsoleForMcpStdio();

