import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/tool.ts';
import type { Route } from '../src/route.ts';

async function call(route: (task: string) => Promise<Route>, task = 'do a thing') {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([createServer(route as never).connect(b), client.connect(a)]);
  try {
    return await client.callTool({ name: 'route_task', arguments: { task } });
  } finally { await client.close(); }
}

const base: Route = { alias: 'sonnet', model: 'claude-sonnet-5', effort: 'medium', profile: 'claude-sonnet', classification: null, adjustments: [] };
const text = (r: Awaited<ReturnType<typeof call>>) => (r.content as { text: string }[])[0]!.text;

test('route_task returns the route as JSON', async () => {
  const result = await call(async () => base);
  assert.notEqual(result.isError, true);
  const body = JSON.parse(text(result));
  assert.equal(body.alias, 'sonnet');
  assert.equal(body.effort, 'medium');
  assert.equal(body.complexity, null);
  assert.equal(body.classifierError, undefined);
});

test('route_task includes complexity and confidence when classified', async () => {
  const classification = { taskType: 'edit', complexity: 'complex', reasoning: 'high', sufficientContext: true,
    confidences: { model: 0.9, effort: 0.9, context: 0.9, taskType: 0.9 } } as Route['classification'];
  const body = JSON.parse(text(await call(async () => ({ ...base, alias: 'opus', classification }))));
  assert.equal(body.complexity, 'complex');
  assert.equal(body.confidence, 0.9);
});

test('route_task reports a classifier fallback', async () => {
  const body = JSON.parse(text(await call(async () => ({ ...base, classifierError: 'Jev classification failed' }))));
  assert.equal(body.classifierError, 'Jev classification failed');
  assert.match(body.note, /fell back/);
});

test('route_task returns an error result when routing throws an Error', async () => {
  const result = await call(async () => { throw new Error('boom'); });
  assert.equal(result.isError, true);
  assert.equal(text(result), 'boom');
});

test('route_task stringifies non-Error throws', async () => {
  const result = await call(async () => { throw 'plain'; });
  assert.equal(result.isError, true);
  assert.equal(text(result), 'plain');
});
