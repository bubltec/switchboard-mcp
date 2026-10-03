import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// SWITCHBOARD_POLICY is read at import time, so this file gets its own process.
const dir = await mkdtemp(join(tmpdir(), 'switchboard-mcp-'));

test('loadPolicy merges a personal policy over the defaults', async () => {
  const file = join(dir, 'policy.json');
  await writeFile(file, JSON.stringify({ classifier: { timeoutMs: 1234 } }));
  process.env.SWITCHBOARD_POLICY = file;
  const { loadPolicy } = await import('../src/route.ts');
  const policy = await loadPolicy();
  assert.equal(policy.classifier.timeoutMs, 1234);
  assert.equal(policy.classifier.maxContextChars, 16000);
});

test('loadPolicy rejects a malformed policy file', async () => {
  const file = join(dir, 'bad.json');
  await writeFile(file, '{not json');
  process.env.SWITCHBOARD_POLICY = file;
  const { loadPolicy } = await import('../src/route.ts?bad');
  await assert.rejects(loadPolicy());
});
