import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { defaultPolicy, type Classification, type Classifier, type Complexity } from '@ruban24/switchboard';

const classification = (complexity: Complexity, confidence = 0.95): Classification => ({
  taskType: 'edit', complexity, reasoning: 'medium', sufficientContext: true,
  confidences: { model: confidence, effort: confidence, context: confidence, taskType: confidence },
});
const fake = (c: Classification): Classifier => async () => c;
const failing: Classifier = async () => { throw new Error('Jev classification failed'); };

test('aliasFor maps model IDs onto Agent tool aliases', async () => {
  const { aliasFor } = await import('../src/route.ts');
  assert.equal(aliasFor('claude-haiku-4-5-20251001'), 'haiku');
  assert.equal(aliasFor('claude-sonnet-5'), 'sonnet');
  assert.equal(aliasFor('claude-opus-5-5'), 'opus');
  assert.equal(aliasFor('claude-opus-5'), 'opus');
  assert.equal(aliasFor('claude-fable-5-1'), 'fable');
  assert.equal(aliasFor('some-unknown-model'), 'some-unknown-model');
});

test('routeTask maps each complexity tier to its policy model', async () => {
  const { routeTask } = await import('../src/route.ts');
  const expected: Record<Complexity, string> = { routine: 'haiku', standard: 'sonnet', complex: 'opus', demanding: 'fable' };
  for (const [complexity, alias] of Object.entries(expected) as [Complexity, string][]) {
    const route = await routeTask('task', { policy: defaultPolicy, classify: fake(classification(complexity)) });
    assert.equal(route.alias, alias, complexity);
    assert.equal(route.classifierError, undefined);
  }
});

test('routeTask falls back to the policy default when the classifier fails', async () => {
  const { routeTask } = await import('../src/route.ts');
  const route = await routeTask('task', { policy: defaultPolicy, classify: failing });
  assert.equal(route.classification, null);
  assert.equal(route.classifierError, 'Jev classification failed');
  assert.equal(route.profile, defaultPolicy.routing.claude.uncertain);
  assert.equal(route.alias, 'opus');
});

test('routeTask bumps a low-confidence routine task up to the standard tier', async () => {
  const { routeTask } = await import('../src/route.ts');
  const route = await routeTask('task', { policy: defaultPolicy, classify: fake(classification('routine', 0.1)) });
  assert.equal(route.alias, 'sonnet');
  assert.ok(route.adjustments.includes('model-confidence-floor'));
});

test('routeTask routes insufficient-context classifications to the uncertain profile', async () => {
  const { routeTask } = await import('../src/route.ts');
  const route = await routeTask('task', {
    policy: defaultPolicy, classify: fake({ ...classification('routine'), sufficientContext: false }),
  });
  assert.equal(route.profile, defaultPolicy.routing.claude.uncertain);
  assert.ok(route.adjustments.includes('insufficient-context'));
});

test('routeTask truncates task text to the policy limit before classifying', async () => {
  const { routeTask } = await import('../src/route.ts');
  let seen = 0;
  const classify: Classifier = async task => { seen = task.length; return classification('standard'); };
  await routeTask('x'.repeat(defaultPolicy.classifier.maxContextChars + 500), { policy: defaultPolicy, classify });
  assert.equal(seen, defaultPolicy.classifier.maxContextChars);
});

test('routeTask throws when no API key is configured and no classifier is injected', async () => {
  const { routeTask } = await import('../src/route.ts');
  const saved = { ...process.env };
  for (const key of Object.keys(process.env)) if (/KEY|SWITCHBOARD_PROVIDER/.test(key)) delete process.env[key];
  try {
    await assert.rejects(routeTask('task', { policy: defaultPolicy }), /Set .* before using Jev classification/);
  } finally {
    Object.assign(process.env, saved);
  }
});

test('loadPolicy returns the default policy when the policy file is missing', async () => {
  process.env.SWITCHBOARD_POLICY = join(tmpdir(), 'switchboard-mcp-does-not-exist.json');
  const { loadPolicy } = await import('../src/route.ts');
  assert.deepEqual(await loadPolicy(), defaultPolicy);
});
