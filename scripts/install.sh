#!/bin/zsh
set -euo pipefail
cd "${0:A:h:h}"
./scripts/build.sh
destination="$HOME/Applications/Dashboard 2026.app"
mkdir -p "$HOME/Applications"
ditto 'build/Build/Products/Release/Dashboard 2026.app' "$destination"
open "$destination"
