#!/bin/zsh
set -euo pipefail
cd "${0:A:h:h}"
node --test Tests/*.test.cjs
mkdir -p build
./scripts/build.sh > build/test-build.log 2>&1
test_dir="$(mktemp -d /tmp/dashboard2026-test.XXXXXX)"
DASHBOARD_DATA_DIR="$test_dir" 'build/Build/Products/Release/Dashboard 2026.app/Contents/MacOS/Dashboard 2026' --smoke-test --windowed "$@"
cat "$test_dir/smoke-result.json"
