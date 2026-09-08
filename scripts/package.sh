#!/bin/zsh
set -euo pipefail
cd "${0:A:h:h}"
./scripts/build.sh
mkdir -p dist/staging
ditto 'build/Build/Products/Release/Dashboard 2026.app' 'dist/staging/Dashboard.app'
if [[ -n "${DEVELOPER_ID_APPLICATION:-}" ]]; then
  codesign --force --options runtime --timestamp --entitlements Resources/Dashboard.entitlements --sign "$DEVELOPER_ID_APPLICATION" 'dist/staging/Dashboard.app'
fi
ditto -c -k --sequesterRsrc --keepParent 'dist/staging/Dashboard.app' 'dist/Dashboard.zip'
if [[ -n "${NOTARY_PROFILE:-}" ]]; then
  : "${DEVELOPER_ID_APPLICATION:?Set a Developer ID Application signing identity before notarizing.}"
  xcrun notarytool submit 'dist/Dashboard.zip' --keychain-profile "$NOTARY_PROFILE" --wait
  xcrun stapler staple 'dist/staging/Dashboard.app'
  ditto -c -k --sequesterRsrc --keepParent 'dist/staging/Dashboard.app' 'dist/Dashboard.zip'
fi
shasum -a 256 'dist/Dashboard.zip' > 'dist/Dashboard.zip.sha256'
print 'Packaged dist/Dashboard.zip'
