#!/bin/zsh
set -euo pipefail
cd "${0:A:h:h}"
node --test Tests/*.test.cjs
mkdir -p build
./scripts/build.sh > build/test-build.log 2>&1
test_dir="$(mktemp -d /tmp/dashboard2026-test.XXXXXX)"
test_status=0
DASHBOARD_DATA_DIR="$test_dir" 'build/Build/Products/Release/Dashboard 2026.app/Contents/MacOS/Dashboard 2026' --smoke-test --windowed "$@" || test_status=$?
if [[ -f "$test_dir/smoke-result.json" ]]; then
  cat "$test_dir/smoke-result.json"
else
  print -u2 "Native tests did not produce a report in $test_dir"
  test_status=1
fi
exit "$test_status"
