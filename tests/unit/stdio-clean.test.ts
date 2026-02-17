import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function terminate(child: ReturnType<typeof spawn>): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;

  const exited = new Promise<void>((r) => child.once('exit', () => r()));

  child.kill('SIGTERM');
  const settled = await Promise.race([
    exited.then(() => true as const),
    sleep(750).then(() => false as const),
  ]);

  if (!settled) {
    child.kill('SIGKILL');
    await exited;
  }
}

describe('MCP stdio stream cleanliness', () => {
  it('does not write to stdout on startup', async () => {
    const entry = resolve(process.cwd(), 'src/index.ts');

    const child = spawn(process.execPath, ['--import', 'tsx', entry], {
      env: {
        ...process.env,
        EDD_API_URL: 'https://example.com/edd-api/',
        EDD_API_KEY: 'test-key',
        EDD_API_TOKEN: 'test-token',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });

    try {
      await sleep(200);

      if (child.exitCode !== null) {
        throw new Error(
          `Process exited early (code ${child.exitCode}) before stdout could be asserted.\n` +
            `stderr: ${stderr.trim() || '(empty)'}`,
        );
      }

      expect(stdout.trim()).toBe('');
    } finally {
      await terminate(child);
    }
  }, 10_000);
});

