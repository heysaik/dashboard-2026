#!/bin/zsh
set -euo pipefail
cd "${0:A:h:h}"
if [[ ! -f Resources/AppIcon.icns ]]; then
  mkdir -p build/AppIcon.iconset
  swift scripts/make-icon.swift build/icon-1024.png
  for dimension in 16 32 128 256 512; do
    sips -z "$dimension" "$dimension" build/icon-1024.png --out "build/AppIcon.iconset/icon_${dimension}x${dimension}.png" >/dev/null
    double=$((dimension * 2))
    sips -z "$double" "$double" build/icon-1024.png --out "build/AppIcon.iconset/icon_${dimension}x${dimension}@2x.png" >/dev/null
  done
  iconutil -c icns build/AppIcon.iconset -o Resources/AppIcon.icns
fi
xcodegen generate
xcodebuild -project 'Dashboard 2026.xcodeproj' -scheme 'Dashboard 2026' -configuration Release -derivedDataPath build CODE_SIGN_IDENTITY=- build
