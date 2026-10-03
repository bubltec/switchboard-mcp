#!/bin/bash
# Launcher for MCP clients (the Claude app doesn't source ~/.zshrc, so PATH and
# keys may be missing). Picks a Node that satisfies package.json engines (>=22.18)
# and loads the classifier key from the user's login shell if it isn't already set.
# stdout is the MCP protocol: everything diagnostic goes to stderr.
set -u
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ok() { "$1" -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=18)?0:1)' 2>/dev/null; }

node_bin=""
for candidate in "${SWITCHBOARD_MCP_NODE:-}" \
  $(ls -d "$HOME"/.nvm/versions/node/v*/bin/node 2>/dev/null | sort -V -r) \
  /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node || true)"; do
  [ -n "$candidate" ] && [ -x "$candidate" ] && ok "$candidate" && { node_bin="$candidate"; break; }
done
[ -n "$node_bin" ] || { echo "switchboard-mcp: no Node >= 22.18 found (set SWITCHBOARD_MCP_NODE)" >&2; exit 1; }

if [ -z "${JEV_API_KEY:-}${TYPESAFE_API_KEY:-}${SWITCHBOARD_API_KEY:-}${OPENROUTER_API_KEY:-}${AI_GATEWAY_API_KEY:-}" ]; then
  key="$(zsh -ic 'printf "__KEY__%s\n" "${JEV_API_KEY:-}"' 2>/dev/null | sed -n 's/^__KEY__//p' | tail -1)"
  [ -n "$key" ] && export JEV_API_KEY="$key"
fi

exec "$node_bin" "$dir/src/server.ts"
