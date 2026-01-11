import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Load environment variables from .env file if present.
 * Searches in current directory, home directory, and common config locations.
 */
export function loadEnv(): void {
  // IMPORTANT: dotenv@17 prints an informational runtime log to stdout by default.
  // For MCP stdio servers, stdout must be reserved exclusively for the protocol.
  process.env.DOTENV_CONFIG_QUIET = 'true';

  const searchPaths = [
    '.env',
    join(process.cwd(), '.env'),
    join(process.env.HOME || '', '.mcp-edd.env'),
    join(process.env.HOME || '', '.config', 'mcp-edd', '.env'),
  ];

  for (const envPath of searchPaths) {
    if (existsSync(envPath)) {
      config({ path: envPath, quiet: true });
      return;
    }
  }

  // Try default dotenv behavior
  config({ quiet: true });
}

/**
 * Validate required environment variables are present.
 * Returns validated config or throws descriptive error.
 */
export interface EDDConfig {
  apiUrl: string;
  apiKey: string;
  apiToken: string;
}

export function normalizeEddApiUrl(rawUrl: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error(
      'EDD_API_URL must be a valid URL including protocol (e.g., https://example.com/edd-api/)'
    );
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('EDD_API_URL must start with https:// or http://');
  }

  // Strip query / hash to avoid subtle mismatches like `...?foo=bar`.
  parsedUrl.search = '';
  parsedUrl.hash = '';

  const originalPath = parsedUrl.pathname || '/';

  // If someone pastes a specific endpoint like `/edd-api/products/`, normalize to the base `/edd-api/`.
  const eddApiPrefixIndex = originalPath.indexOf('/edd-api/');
  if (eddApiPrefixIndex !== -1) {
    parsedUrl.pathname = originalPath.slice(0, eddApiPrefixIndex + '/edd-api/'.length);
    return parsedUrl.toString();
  }

  if (originalPath === '/edd-api' || originalPath.endsWith('/edd-api')) {
    parsedUrl.pathname = `${originalPath.replace(/\/+$/, '')}/`;
    return parsedUrl.toString();
  }

  const basePath = originalPath.endsWith('/') ? originalPath : `${originalPath}/`;
  parsedUrl.pathname = `${basePath}edd-api/`;

  return parsedUrl.toString();
}

export function validateEnv(): EDDConfig {
  const apiUrl = process.env.EDD_API_URL;
  const apiKey = process.env.EDD_API_KEY;
  const apiToken = process.env.EDD_API_TOKEN;

  const missing: string[] = [];

  if (!apiUrl) missing.push('EDD_API_URL');
  if (!apiKey) missing.push('EDD_API_KEY');
  if (!apiToken) missing.push('EDD_API_TOKEN');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n\n` +
        'Please set the following environment variables:\n' +
        '  EDD_API_URL   - Your EDD store API URL (e.g., https://example.com/edd-api/)\n' +
        '  EDD_API_KEY   - Your EDD API public key\n' +
        '  EDD_API_TOKEN - Your EDD API token\n\n' +
        'You can set these in a .env file or as system environment variables.'
    );
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeEddApiUrl(apiUrl!);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Invalid EDD_API_URL: ${message}\n\n` +
        'Expected format:\n' +
        '  https://your-site.com/edd-api/\n' +
        '  https://your-site.com/subdir/edd-api/\n'
    );
  }

  return {
    apiUrl: normalizedUrl,
    apiKey: apiKey!,
    apiToken: apiToken!,
  };
}
