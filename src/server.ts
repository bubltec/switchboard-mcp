#!/usr/bin/env node
// Process entry point only; all behaviour lives in tool.ts.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './tool.ts';

await createServer().connect(new StdioServerTransport());
