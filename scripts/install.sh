#!/bin/zsh
set -euo pipefail
cd "${0:A:h:h}"
./scripts/build.sh
destination="$HOME/Applications/Dashboard.app"
mkdir -p "$HOME/Applications"
legacy_destination="$HOME/Applications/Dashboard 2026.app"
if [[ ! -e "$destination" && -d "$legacy_destination" ]]; then
  mv "$legacy_destination" "$destination"
fi
ditto 'build/Build/Products/Release/Dashboard 2026.app' "$destination"
open "$destination"
