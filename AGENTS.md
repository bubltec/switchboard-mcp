# Agent instructions

**The source of truth for agent instructions in this repo is [`.cursor/rules/`](.cursor/rules/).**
This file and `CLAUDE.md` are pointers only; add or change rules in `.cursor/rules/`.

| Rule | Applies | Covers |
| --- | --- | --- |
| [`sync-before-code-changes`](.cursor/rules/sync-before-code-changes.mdc) | always | Fetch origin, compare branches, check whether the PR merged |
| [`recover-from-merged-branch`](.cursor/rules/recover-from-merged-branch.mdc) | on request | Stash-and-restart when a branch's PR already merged |
| [`write-tests`](.cursor/rules/write-tests.mdc) | always | Every change ships with tests; which layer to test at |
| [`switchboard-mcp-architecture`](.cursor/rules/switchboard-mcp-architecture.mdc) | globs | Scope, secrets, stdout rules, policy, verification |

Never push to `main`: branch, push, open a PR. The user approves and merges.
Human-facing docs: [`README.md`](README.md).
