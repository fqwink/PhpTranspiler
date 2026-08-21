#!/bin/sh
set -eu

TOOL_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PHPTRANSPILER_ROOT=$(CDPATH= cd -- "$TOOL_DIR/../.." && pwd)

if command -v deno >/dev/null 2>&1; then
  (
    cd "$PHPTRANSPILER_ROOT"
    deno task test
  )
  exit $?
fi

if command -v node >/dev/null 2>&1; then
  (
    cd "$PHPTRANSPILER_ROOT"
    node node-fallback/run-golden.mjs
  )
  exit 0
fi

echo "PhpTranspiler golden tests require Deno or Node.js fallback." >&2
exit 1
