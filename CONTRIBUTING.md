# Contributing to Dashboard

Focused fixes, accessibility improvements, compatibility reports, and useful widgets are welcome.

## Start here

- Search [issues](https://github.com/heysaik/dashboard-2026/issues) before opening a duplicate.
- For bugs, include macOS version/build, CPU architecture, theme, Space/overlay mode, and reproducible steps. Redact personal information from screenshots and logs.
- Discuss substantial behavior changes or new dependencies in an issue first.
- Report vulnerabilities privately using [SECURITY.md](SECURITY.md).

## Development setup

You need a Mac, full Xcode 26 or later, XcodeGen, and Node.js 20 or later. Fork this repository on GitHub, then:

```sh
brew install xcodegen node gitleaks
git clone https://github.com/YOUR_GITHUB_USERNAME/dashboard-2026.git
cd dashboard-2026
git switch -c your-change
./scripts/setup-contributor.sh
./scripts/build.sh
```

Open `Dashboard 2026.xcodeproj` and run the **Dashboard 2026** scheme on **My Mac**. `project.yml` defines the Xcode project. After changing its settings, run `xcodegen generate` and commit both the configuration and generated project changes.

The default native tests use a temporary `DASHBOARD_DATA_DIR` and do not replace your saved layout. For manual testing with separate data:

```sh
mkdir -p artifacts/manual-profile
DASHBOARD_DATA_DIR="$PWD/artifacts/manual-profile" \
  'build/Build/Products/Release/Dashboard 2026.app/Contents/MacOS/Dashboard 2026' --windowed
```

This isolates Dashboard's saved layout. It does not isolate macOS preferences, Keychain, Contacts/Music permissions, or provider authentication. Avoid personal data and paid AI calls unless you deliberately choose to test them.

## Project map

| Location | Responsibility |
| --- | --- |
| `Sources/AppDelegate.swift` | Native window, lifecycle, menus, and shortcuts |
| `Sources/NativeBridge.swift` | WebKit-to-native requests and bundled resource serving |
| `Sources/PrivateSpaces.*`, `SpacePinning.swift` | Guarded private API integration for Spaces |
| `Sources/WidgetGenerator.swift` | Local provider adapters and generation instructions |
| `Sources/ConnectedWidget.swift`, `WeatherService.swift` | Data retrieval, validation, and Keychain integration |
| `Resources/Web/` | Widget behavior, styles, creator validation, and repair loop |
| `Tests/` | Node tests for pure logic and creator orchestration |
| `Sources/SmokeTest.swift`, `ConnectedTests.swift` | Native/WebKit integration checks |
| `Examples/` | Portable widgets with public endpoints and no credentials |

## Before a pull request

Use Conventional Commit subjects and the same format for the PR title, for example `fix(weather): preserve the selected city`. Allowed types are `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, and `test`; an optional lowercase scope and `!` breaking-change marker are supported. Keep the first line at most 100 characters.

The setup script installs repository-local Git hooks and a commit template. Commits check staged whitespace, secrets, and the message. Pushes check secrets and Node tests, and reject deleting/rewriting `main` or replacing release tags. Hooks are optional to install and can be bypassed locally; GitHub's rules and required CI checks enforce the shared policy independently.

Contributions to `main` require an approving code-owner review, dismissal of stale approvals after new changes, resolved review threads, verified signatures, and passing up-to-date CI. Use [GitHub's commit signing instructions](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits) to configure your own signing identity. Squash merging is enabled; merge and rebase merging are disabled. See [repository governance](docs/Governance.md) for the explicit owner bypass and protected release tags.

```sh
node --test Tests/*.test.cjs
./scripts/test.sh
git diff --check
```

For interface changes, inspect both themes at actual size, keyboard navigation, Reduce Motion, and relevant Small/Medium/Large layouts. Include sanitized screenshots where useful. For behavior changes, add a regression check that exercises the failure; avoid tests that simply restate the implementation.

Optional checks have side effects:

```sh
./scripts/test.sh --test-space # temporarily creates/reorders a Space
./scripts/test.sh --test-ai # uses your Codex account
./scripts/test.sh --test-connected # live APIs plus Codex/Claude research
./scripts/test.sh --test-creator # live GitHub widget creation
./scripts/test.sh --test-creator --repair-activity --creator-claude
./scripts/test.sh --test-creator --repair-counter
```

Do not run live provider checks in CI or provide personal credentials to contributors' code. Routine CI needs no API keys or signing certificates.

Keep imports at the top of files. Match the surrounding style, keep private APIs guarded, preserve saved layouts, and display unavailable data honestly. Never add decorative labels above or below headings. Keep changes focused; explain the user-visible behavior and what you tested in the pull request.

Before sharing, check for credentials, signing files, personal layout data, logs, screenshots, and cached responses. Build output and local artifacts stay ignored. For an additional local scan:

```sh
brew install gitleaks
gitleaks git --redact --log-opts=--all .
```

## Community expectations and license

Be respectful, assume good intent, and discuss the code rather than the person. Harassment and publishing someone's private information are not welcome. Maintainers may remove abusive content or restrict participation.

By contributing, you agree that your contribution can be distributed under the project's [MIT license](LICENSE). Include attribution and compatible licensing for any outside assets or code. AI-assisted changes are welcome when the contributor reviews, understands, and tests them; do not submit unverified generated output.
