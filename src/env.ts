import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Load environment variables from .env file if present.
 * Searches in current directory, home directory, and common config locations.
 */
export function loadEnv(): void {
  const searchPaths = [
    '.env',
    join(process.cwd(), '.env'),
    join(process.env.HOME || '', '.mcp-edd.env'),
    join(process.env.HOME || '', '.config', 'mcp-edd', '.env'),
  ];

  for (const envPath of searchPaths) {
    if (existsSync(envPath)) {
      config({ path: envPath });
      return;
    }
  }

  // Try default dotenv behavior
  config();
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

  // Ensure URL ends with trailing slash
  const normalizedUrl = apiUrl!.endsWith('/') ? apiUrl! : `${apiUrl}/`;

  return {
    apiUrl: normalizedUrl,
    apiKey: apiKey!,
    apiToken: apiToken!,
  };
}
