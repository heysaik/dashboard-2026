#!/bin/zsh
set -euo pipefail
cd "${0:A:h:h}"
if ! command -v xcodegen >/dev/null 2>&1; then
  print -u2 'XcodeGen is required. Install it with: brew install xcodegen'
  exit 1
fi
if ! xcode_version="$(xcodebuild -version 2>/dev/null)" || [[ "$xcode_version" != Xcode* ]]; then
  print -u2 'Install and open full Xcode 26 or later, then select it with xcode-select. Command Line Tools alone are insufficient.'
  exit 1
fi
xcode_major="${${xcode_version#Xcode }%%.*}"
if (( xcode_major < 26 )); then
  print -u2 'Xcode 26 or later is required to compile native glass materials.'
  exit 1
fi
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
xcodebuild -project 'Dashboard 2026.xcodeproj' -scheme 'Dashboard 2026' -configuration Release -derivedDataPath build CODE_SIGN_IDENTITY=- ARCHS='arm64 x86_64' ONLY_ACTIVE_ARCH=NO build
