import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function terminate(child: ReturnType<typeof spawn>): Promise<void> {
  if (child.exitCode !== null) return;

  child.kill('SIGTERM');
  await Promise.race([
    new Promise<void>((resolveExit) => child.once('exit', () => resolveExit())),
    sleep(750),
  ]);

  if (child.exitCode === null) {
    child.kill('SIGKILL');
    await new Promise<void>((resolveExit) => child.once('exit', () => resolveExit()));
  }
}

describe('MCP stdio stream cleanliness', () => {
  it('does not write to stdout on startup', async () => {
    const entry = resolve(process.cwd(), 'src/index.ts');

    const child = spawn(process.execPath, ['--loader', 'tsx', entry], {
      env: {
        ...process.env,
        EDD_API_URL: 'https://example.com/edd-api/',
        EDD_API_KEY: 'test-key',
        EDD_API_TOKEN: 'test-token',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });

    try {
      await sleep(200);
      expect(stdout.trim()).toBe('');
    } finally {
      await terminate(child);
    }
  });
});

