# Releasing Dashboard

Releases are published manually by a maintainer. Never publish a local layout, reference screenshots, credentials, signing keys, test reports with private inputs, or a checkout archive containing `.git` or ignored files.

## Prepare

1. Update `CFBundleShortVersionString` and `CFBundleVersion` in `project.yml`, then run `xcodegen generate`.
2. Run `node --test Tests/*.test.cjs`, `./scripts/test.sh`, and `git diff --check`.
3. Review both themes and representative widget interactions on a Mac. Record the tested macOS and CPU; do not infer Intel or older-OS support from compilation alone.
4. Run `gitleaks git --redact --log-opts=--all .`. Check authorship metadata, filenames, assets, and packaging output as well as source text.
5. Commit and push the reviewed changes. Build a release from that exact commit in a clean checkout.

## Package

```sh
./scripts/package.sh
```

This creates `dist/Dashboard.zip` and `dist/Dashboard.zip.sha256`. The package is universal, includes the license and asset notices, and is ad-hoc signed by default. Only the app bundle is included. Staging starts in a fresh temporary directory so stale files cannot be carried into a release.

For Developer ID signing and notarization, explicitly supply your own credentials:

```sh
DEVELOPER_ID_APPLICATION='Developer ID Application: Your Name (TEAMID)' \
NOTARY_PROFILE='your-keychain-profile' ./scripts/package.sh
```

The notary profile must already exist in your Keychain. Never place its password, certificate, or private key in Git. No signing credential is required by the default build or CI.

## Verify and publish

```sh
cd dist
shasum -a 256 -c Dashboard.zip.sha256
ditto -x -k Dashboard.zip verification
codesign --verify --deep --strict verification/Dashboard.app
lipo -archs 'verification/Dashboard.app/Contents/MacOS/Dashboard 2026'
```

Inspect the archive inventory and scan the extracted bundle before uploading. Test an extracted app with a separate `DASHBOARD_DATA_DIR`. Upload only the ZIP and checksum as assets, not the verification directory, local logs, dSYM, or Xcode archive.

Create a GitHub release for a tag on the tested commit. Release notes should state installation steps, minimum macOS, tested platform, signing/notarization status, and relevant limitations. Keep early releases clearly labeled experimental.
