#!/bin/sh
set -eu

TOOL_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PHPTRANSPILER_ROOT=$(CDPATH= cd -- "$TOOL_DIR/../.." && pwd)
GOLDEN_RUNNER="$PHPTRANSPILER_ROOT/Tools/check/run-golden.sh"

for path in \
  AGENTS.md \
  VERSION \
  README.md \
  Docs/Document_Index \
  Docs/Project_Charter \
  Docs/Change_History \
  Docs/GENERATED_PHP_STANDARD.md \
  deno.json \
  src/main.ts \
  tests/run-golden.ts \
  tests/golden/basic.input.ts \
  tests/golden/basic.expected.php \
  tests/golden/collections.input.ts \
  tests/golden/collections.expected.php \
  tests/golden/control.input.ts \
  tests/golden/control.expected.php \
  tests/golden/functional.input.ts \
  tests/golden/functional.expected.php \
  tests/golden/functions.input.ts \
  tests/golden/functions.expected.php \
  tests/golden/guards.input.ts \
  tests/golden/guards.expected.php \
  tests/golden/indexing.input.ts \
  tests/golden/indexing.expected.php \
  tests/golden/literals.input.ts \
  tests/golden/literals.expected.php \
  tests/golden/loops.input.ts \
  tests/golden/loops.expected.php \
  tests/golden/migration.input.ts \
  tests/golden/migration.expected.php \
  tests/golden/object-access.input.ts \
  tests/golden/object-access.expected.php \
  tests/golden/object-utils.input.ts \
  tests/golden/object-utils.expected.php \
  tests/golden/runtime.input.ts \
  tests/golden/runtime.expected.php \
  tests/golden/server-runtime.input.ts \
  tests/golden/server-runtime.expected.php \
  tests/golden/server-io.input.ts \
  tests/golden/server-io.expected.php \
  tests/golden/server-migration-critical.input.ts \
  tests/golden/server-migration-critical.expected.php \
  tests/golden/server-collections.input.ts \
  tests/golden/server-collections.expected.php \
  tests/golden/server-foundation.input.ts \
  tests/golden/server-foundation.expected.php \
  tests/golden/statements.input.ts \
  tests/golden/statements.expected.php \
  tests/golden/static.input.ts \
  tests/golden/static.expected.php \
  tests/golden/switch-flow.input.ts \
  tests/golden/switch-flow.expected.php \
  tests/golden/types.input.ts \
  tests/golden/types.expected.php \
  tests/golden/variables.input.ts \
  tests/golden/variables.expected.php \
  tests/errors/async.input.ts \
  tests/errors/async.expected-error.txt \
  tests/golden/server-wide-syntax.input.ts \
  tests/golden/server-wide-syntax.expected.php \
  tests/errors/type-assertion.input.ts \
  tests/errors/type-assertion.expected-error.txt \
  tests/projects/golden/import/input/App.ts \
  tests/projects/golden/import/input/Helper.ts \
  tests/projects/golden/import/expected/App.php \
  tests/projects/golden/import/expected/Helper.php \
  tests/projects/errors/duplicate/input/A.ts \
  tests/projects/errors/duplicate/input/B.ts \
  tests/projects/errors/duplicate/expected-error.txt \
  tests/projects/errors/import-path/input/App.ts \
  tests/projects/errors/import-path/expected-error.txt \
  node-fallback/run-golden.mjs \
  Tools/check/run-golden.sh; do
  if [ ! -f "$PHPTRANSPILER_ROOT/$path" ]; then
    echo "missing PhpTranspiler required path: $PHPTRANSPILER_ROOT/$path" >&2
    exit 1
  fi
done

version=$(sed -n '1p' "$PHPTRANSPILER_ROOT/VERSION")
case "$version" in
  pt.*.*) ;;
  *)
    echo "PhpTranspiler version must use pt.<major>.<minor>: $version" >&2
    exit 1
    ;;
esac

version_numbers=${version#pt.}
major_version=${version_numbers%%.*}
minor_version=${version_numbers#*.}
case "$major_version" in
  ''|*[!0-9]*)
    echo "PhpTranspiler major version must be numeric: $version" >&2
    exit 1
    ;;
esac
case "$minor_version" in
  ''|*[!0-9]*|*.*)
    echo "PhpTranspiler minor version must be numeric: $version" >&2
    exit 1
    ;;
esac

if [ -e "$PHPTRANSPILER_ROOT/Documents" ]; then
  echo "PhpTranspiler must use Docs/, not Documents/." >&2
  exit 1
fi

if find "$PHPTRANSPILER_ROOT" \( -name 'package.json' -o -name 'package-lock.json' -o -name 'node_modules' -o -name 'tsconfig.json' \) -print | grep . >/dev/null 2>&1; then
  echo "PhpTranspiler must not use Node.js/npm project files." >&2
  exit 1
fi

if ! grep -F "\"test\": \"deno run --allow-read --allow-write --allow-run tests/run-golden.ts\"" "$PHPTRANSPILER_ROOT/deno.json" >/dev/null 2>&1; then
  echo "PhpTranspiler deno.json must define the golden test task." >&2
  exit 1
fi

"$GOLDEN_RUNNER"

if command -v php >/dev/null 2>&1; then
  php -v >/dev/null
elif [ "${ADLAIRE_ECOSYSTEM_ROOT:-}" != "" ] && [ -x "$ADLAIRE_ECOSYSTEM_ROOT/Tools/build/run-build-tool.sh" ]; then
  "$ADLAIRE_ECOSYSTEM_ROOT/Tools/build/run-build-tool.sh" "$PHPTRANSPILER_ROOT" php -v >/dev/null
elif [ -x "$PHPTRANSPILER_ROOT/../Adlaire-Ecosystem/Tools/build/run-build-tool.sh" ]; then
  "$PHPTRANSPILER_ROOT/../Adlaire-Ecosystem/Tools/build/run-build-tool.sh" "$PHPTRANSPILER_ROOT" php -v >/dev/null
else
  echo "PhpTranspiler check requires PHP CLI or Adlaire-Ecosystem Docker build tools." >&2
  exit 1
fi

echo "phptranspiler-check-ok"
