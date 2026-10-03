# switchboard-mcp

Local stdio MCP server that exposes [Switchboard](https://github.com/ruban-24/switchboard)'s
model/effort routing to an agent. One tool, `route_task(task)`, returns the model alias
(`haiku`/`sonnet`/`opus`/`fable`) and effort to use when spawning a subagent.

Built on the `@ruban24/switchboard` library (Apache-2.0): Jev classifies the task, your
Switchboard policy (`~/.config/switchboard/policy.json`, or `$SWITCHBOARD_POLICY`) maps it to a model.

## Setup

```sh
npm install
export JEV_API_KEY=...   # or TYPESAFE_API_KEY, or SWITCHBOARD_PROVIDER + a provider key
claude mcp add switchboard -- node /Users/johnjosef/Projects/switchboard-mcp/src/server.ts
```

Tell the agent to use it (e.g. in `CLAUDE.md`): "Before spawning a non-trivial subagent, call
`route_task` and pass its `alias` as the Agent `model`."

Only the task text is sent to the classifier. Requires Node >= 22.18.
