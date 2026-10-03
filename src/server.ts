#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { routeTask } from './route.ts';

const server = new McpServer({ name: 'switchboard-mcp', version: '0.1.0' });

server.registerTool('route_task', {
  description: 'Pick a model and effort for a task before spawning a subagent. Pass the task text; use the returned `alias` as the Agent tool `model`. Skip for trivial tasks.',
  inputSchema: { task: z.string().min(1).describe('The task text the subagent will receive') },
}, async ({ task }) => {
  try {
    const r = await routeTask(task);
    const summary = {
      alias: r.alias, model: r.model, effort: r.effort, profile: r.profile,
      complexity: r.classification?.complexity ?? null, confidence: r.classification?.confidences.model ?? null,
      adjustments: r.adjustments, ...(r.classifierError ? { classifierError: r.classifierError, note: 'Classifier unavailable; fell back to the policy default' } : {}),
    };
    return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] };
  }
});

await server.connect(new StdioServerTransport());
