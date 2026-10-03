import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function connect(env: Record<string, string>) {
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k, v]) => v !== undefined && !/KEY|SWITCHBOARD/.test(k))) as Record<string, string>;
  const transport = new StdioClientTransport({ command: process.execPath, args: ['src/server.ts'], env: { ...clean, ...env } });
  const client = new Client({ name: 'test', version: '0' });
  await client.connect(transport);
  return client;
}

test('server lists route_task', async () => {
  const client = await connect({});
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(t => t.name), ['route_task']);
  } finally { await client.close(); }
});

test('route_task returns an error result, not a crash, when no key is set', async () => {
  const client = await connect({});
  try {
    const result = await client.callTool({ name: 'route_task', arguments: { task: 'rename a variable' } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result.content), /before using Jev classification/);
  } finally { await client.close(); }
});

test('route_task rejects an empty task', async () => {
  const client = await connect({});
  try {
    const result = await client.callTool({ name: 'route_task', arguments: { task: '' } }).catch(e => e);
    assert.ok(result instanceof Error || result.isError);
  } finally { await client.close(); }
});
