# Dashboard

Mac OS X Leopard's Dashboard, rebuilt for modern macOS. Bring back dimensional widgets, glossy controls, the metal widget shelf, preference backs, and a dedicated Space—or switch to the native Liquid Glass theme.

Create new widgets with your own Codex, Claude Code, or LM Studio installation. The creator checks real data, tests Small/Medium/Large layouts and controls, and asks the model to repair failures before presenting a working preview.

[Download](https://github.com/heysaik/dashboard-2026/releases/latest) · [Contribute](CONTRIBUTING.md) · [Widget guide](docs/WidgetFormat.md) · [Report a bug](https://github.com/heysaik/dashboard-2026/issues/new/choose)

Independent, community-maintained software with new code and artwork. Not affiliated with Apple. This is an early release: private macOS APIs and some third-party data sources can change between OS or service updates.

## Install

**Requires macOS 14 Sonoma or later.** The download includes both Apple Silicon and Intel code. Live testing has been on Apple Silicon; Intel and older supported macOS releases still need community testing. Native glass requires macOS 26 or later; earlier systems use a visual-effect fallback.

### Download the app

1. Open the [latest release](https://github.com/heysaik/dashboard-2026/releases/latest) and download **Dashboard.zip**.
2. Unzip it, then drag **Dashboard.app** into **Applications** (or `~/Applications`).
3. Open Dashboard. Press **Control–Option–D** to show it again from another app.

The current release is **ad-hoc signed, not Developer ID signed or notarized**. macOS may block its first launch. After attempting to open it, use **System Settings → Privacy & Security → Open Anyway** if you trust the download. See [Apple's instructions](https://support.apple.com/en-us/102445). Building from source is also supported. Do not disable Gatekeeper system-wide.

To verify the download, save `Dashboard.zip.sha256` from the same release beside the ZIP, then run in that folder:

```sh
shasum -a 256 -c Dashboard.zip.sha256
```

No Xcode, Node.js, or AI subscription is needed to run the downloaded app. AI providers are optional; built-in offline widgets work without them.

### Build and install from source

Install the full **Xcode 26 or later**, open it once to complete setup, and install [Homebrew](https://brew.sh/) if you do not already have it. Command Line Tools alone are insufficient.

```sh
brew install xcodegen
git clone https://github.com/heysaik/dashboard-2026.git
cd dashboard-2026
./scripts/install.sh
```

This builds a universal Release app, installs it at `~/Applications/Dashboard.app`, and opens it. No Apple developer membership or signing certificate is required for a local build. If `xcodebuild` points to Command Line Tools, select your full Xcode installation:

```sh
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

For development, open `Dashboard 2026.xcodeproj`, choose the **Dashboard 2026** scheme, and run on **My Mac**. `project.yml` is the source of truth for the generated Xcode project.

### First launch and updates

- Dashboard opens in its own Space. Switch to **Use as an Overlay** in the Dashboard menu if you prefer.
- **Settings → Appearance** selects Leopard or Liquid Glass. **Open Dashboard at login** is optional.
- Weather starts in Cupertino; open its preferences to select your city. It does not infer your location.
- Contacts and Music request macOS permissions only when you use those integrations.
- To update, quit Dashboard and replace the app with the new release. Your layout is stored separately and retained. There is no automatic updater.
- To uninstall, turn off its login option if enabled, quit Dashboard, and remove the app. Optionally remove `~/Library/Application Support/Dashboard 2026` to erase saved widgets and layout. API keys stored in Keychain are separate; remove Dashboard entries there if desired.

## What it includes

- **21 built-in widgets:** Weather, World Clock, iCal, Calculator, Stickies, Dictionary, Unit Converter, Currency Converter, Stocks, Translation, Address Book, Tile Game, iTunes/Music, Google, Business, People, Flight Tracker, ESPN, Ski Report, Movies, and Web Clip.
- **Leopard interactions:** drag to arrange, multiple instances, flip to preferences, calendar expansion, resizable Dictionary/Web Clip, calculator memory, and persistent notes and state.
- **Two appearances:** Leopard materials and a native Liquid Glass theme, with separate layouts and accessibility preferences.
- **Full-display Space:** uses the area beside a MacBook's camera housing and attempts to remain leftmost in Spaces through private SkyLight APIs. The real notch stays visible.
- **Portable custom widgets:** import, export, remix, and choose among tested sizes.

Original online services that no longer exist have replacements. Flight Tracker opens FlightAware, People opens a directory search, Movies uses Apple's movie catalog rather than cinema showtimes, and Ski Report shows weather rather than lift status. Music controls the current macOS Music app. See the [full widget interaction guide](docs/Interactions.md) for behavior and limitations.

## Controls

| Action | Control |
| --- | --- |
| Show Dashboard | Control–Option–D; F12 when delivered as a function key |
| Return to previous app | Escape or the bottom-right arrow |
| Add widgets | Bottom-left +; click or drag from the shelf |
| Remove a widget | −, then its close button; Option also reveals close buttons |
| Move a widget | Drag its noninteractive surface; arrow keys move a focused widget |
| Widget preferences | Hover to reveal ⓘ and flip to the back |
| Create a widget | Create a Widget… or Command–N |
| Import | Command–O or drop a `.dashboardwidget` / `.html` file |
| Refresh focused widget | Command–R |
| Switch Space / overlay | Dashboard menu → Use as a Space / Use as an Overlay |

Leftmost pinning was verified on macOS 27.0 build 26A5425a, not on every supported OS or display arrangement. If it fails, try **Pin Dashboard to the Left** or use overlay mode. See [Spaces implementation](docs/Spaces.md).

## Optional AI widget creation

Install and sign in to your chosen provider before opening **Create a Widget…**:

| Provider | Setup | Runs |
| --- | --- | --- |
| [Codex](https://developers.openai.com/codex/cli/) | Install the Codex CLI and sign in | Through your OpenAI account |
| [Claude Code](https://code.claude.com/docs/en/setup) | Install Claude Code and sign in | Through your Anthropic account |
| [LM Studio](https://lmstudio.ai/docs/developer) | Load a model and start its local server; default `http://127.0.0.1:1234/v1` | Locally, without web-research tools in this integration |

Choose **Automatic · best fit** or a preferred size and describe what you want. For example:

> Create a GitHub commit history tracker for openai/codex. Show green squares for the past month's activity using GitHub's API, with a refresh button.

The creator checks the source, renders all three sizes, tests offline controls, and performs a separate review against your request. It repairs failures for up to six attempts, and stops starting attempts after twelve minutes. Failed sizes are unavailable; unfinished widgets are clearly marked. Checks reduce failures, but cannot guarantee every interaction or a remote service's future availability.

Connected widgets use real JSON APIs, source-verified web excerpts through Codex/Claude, or honest browser handoffs. Booking and checkout happen on the actual service. API keys go into the Mac's Keychain, not generated HTML. Missing data is shown as unavailable, not invented.

Try the [included examples](Examples/) or read the [widget format and provider guide](docs/WidgetFormat.md). Provider compatibility depends on installed CLI versions; live creation and repair were tested with Codex and Claude Code. LM Studio's live generation still needs further testing.

## Privacy and security

Dashboard has no bundled credentials, analytics, or hosted Dashboard account. Your layout and custom definitions are saved at `~/Library/Application Support/Dashboard 2026/dashboard.json`, with a previous-version backup. These files can contain notes, widget inputs, and cached results; keep them private.

Network widgets contact their data providers. Codex/Claude requests send your prompt, candidate widget, and repair information through your selected account and may incur provider usage. Local LM Studio generation stays on its configured loopback server; connected widgets can still contact external sources.

The native app is **not App Sandbox–restricted** and uses private APIs. Generated offline HTML runs in a constrained WebKit frame; connected requests go through the host. Only import widgets you trust. See [SECURITY.md](SECURITY.md) for the security model and private vulnerability reporting.

## Contribute

Bug reports, accessibility improvements, widget fixes, tests, and macOS compatibility reports are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, architecture, checks, and how to send a focused pull request.

```sh
brew install node # only needed for development tests
node --test Tests/*.test.cjs
./scripts/test.sh # builds and runs native WebKit checks in an isolated data directory
```

CI checks JavaScript tests, repository secrets, the universal macOS build, and native integration tests. Live AI tests are opt-in and use your own provider account. See [verification results](docs/Verification.md) and the [release guide](docs/Releasing.md).

## License and credits

[MIT](LICENSE) for the project's code and original artwork. The Tile Game photograph is credited separately in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Apple names and trademarks remain Apple's; the project does not redistribute the original Dashboard application or widget bundles. [Design and data references](docs/References.md).
