import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  bundledCatalog, createConfiguredClassifier, defaultPolicy, mergePolicy,
  assessInitialRoute, type Classification, type Classifier, type Policy,
} from '@ruban24/switchboard';

export interface Route {
  /** Claude Code model alias for the Agent tool's `model` option. */
  alias: string;
  /** Full model ID from the Switchboard policy. */
  model: string;
  effort: string | null;
  profile: string | null;
  classification: Classification | null;
  adjustments: string[];
  classifierError?: string;
}

const POLICY_PATH = process.env.SWITCHBOARD_POLICY || join(homedir(), '.config', 'switchboard', 'policy.json');

export async function loadPolicy(): Promise<Policy> {
  try {
    return mergePolicy(defaultPolicy, JSON.parse(await readFile(POLICY_PATH, 'utf8')));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return defaultPolicy;
    throw error;
  }
}

/** Maps a full model ID onto the aliases the Agent tool accepts. */
export function aliasFor(model: string): string {
  const family = bundledCatalog.models.find(m => m.id === model)?.family.toLowerCase() ?? model.toLowerCase();
  for (const alias of ['haiku', 'sonnet', 'opus', 'fable']) if (family.includes(alias)) return alias;
  return model;
}

export interface RouteDeps {
  policy?: Policy;
  classify?: Classifier;
}

export async function routeTask(task: string, deps: RouteDeps = {}): Promise<Route> {
  const policy = deps.policy ?? await loadPolicy();
  const catalog = bundledCatalog;
  const classify = deps.classify ?? createConfiguredClassifier();
  let classification: Classification | null = null;
  let classifierError: string | undefined;
  try {
    classification = await classify(task.slice(0, policy.classifier.maxContextChars), AbortSignal.timeout(policy.classifier.timeoutMs), { tool: 'claude', policy, catalog });
  } catch (error) {
    classifierError = error instanceof Error ? error.message : String(error);
  }
  const { selection, adjustments } = assessInitialRoute(policy, catalog, 'claude', classification);
  return {
    alias: aliasFor(selection.model), model: selection.model, effort: selection.effort,
    profile: selection.profile, classification, adjustments, ...(classifierError ? { classifierError } : {}),
  };
}
