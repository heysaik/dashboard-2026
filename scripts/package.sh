#!/bin/zsh
set -euo pipefail
cd "${0:A:h:h}"
if [[ -n "${NOTARY_PROFILE:-}" && -z "${DEVELOPER_ID_APPLICATION:-}" ]]; then
  print -u2 'Set a Developer ID Application signing identity before notarizing.'
  exit 1
fi
./scripts/build.sh
mkdir -p dist
package_stage="$(mktemp -d "$PWD/dist/staging.XXXXXX")"
trap 'rm -rf "$package_stage"' EXIT
ditto 'build/Build/Products/Release/Dashboard 2026.app' "$package_stage/Dashboard.app"
cp LICENSE THIRD_PARTY_NOTICES.md "$package_stage/Dashboard.app/Contents/Resources/"
if [[ -n "${DEVELOPER_ID_APPLICATION:-}" ]]; then
  codesign --force --options runtime --timestamp --entitlements Resources/Dashboard.entitlements --sign "$DEVELOPER_ID_APPLICATION" "$package_stage/Dashboard.app"
else
  codesign --force --options runtime --timestamp=none --entitlements Resources/Dashboard.entitlements --sign - "$package_stage/Dashboard.app"
fi
codesign --verify --deep --strict "$package_stage/Dashboard.app"
ditto -c -k --sequesterRsrc --keepParent "$package_stage/Dashboard.app" 'dist/Dashboard.zip'
if [[ -n "${NOTARY_PROFILE:-}" ]]; then
  xcrun notarytool submit 'dist/Dashboard.zip' --keychain-profile "$NOTARY_PROFILE" --wait
  xcrun stapler staple "$package_stage/Dashboard.app"
  ditto -c -k --sequesterRsrc --keepParent "$package_stage/Dashboard.app" 'dist/Dashboard.zip'
fi
(cd dist && shasum -a 256 'Dashboard.zip' > 'dist/Dashboard.zip.sha256')
print 'Packaged dist/Dashboard.zip'
