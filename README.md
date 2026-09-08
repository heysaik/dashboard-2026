# Dashboard

Mac OS X Leopard's Dashboard, rebuilt for a current Mac: dimensional widgets, glossy controls, a metal widget shelf, preference backs, ripples, a desktop overlay, and a dedicated Space. New widgets can be generated with your local Codex, Claude Code, or LM Studio installation.

This is an independent recreation, using new code and artwork. It is not Apple's Dashboard binary, and retired online services have replacement behaviors described below.

## Run

The installed app is `~/Applications/Dashboard.app`.

```sh
./scripts/install.sh
```

Requires macOS 14 or later, Xcode, and [XcodeGen](https://github.com/yonaskolb/XcodeGen). The build produces a universal Apple Silicon / Intel app with no third-party runtime dependencies. Open `Dashboard 2026.xcodeproj` to develop in Xcode.

## Controls

| Action | Control |
| --- | --- |
| Show or dismiss Dashboard | Control–Option–D; F12 when delivered as a function key |
| Return to previous app | Escape or the bottom-right arrow |
| Add widgets | Bottom-left +; click or drag from the shelf |
| Remove an instance | −, then its close button; Option also reveals close buttons |
| Move a widget | Drag its noninteractive surface; arrow keys move a focused widget |
| Widget preferences | Hover to reveal ⓘ; the widget flips to its back |
| Create a widget | Create a Widget… or Command–N |
| Import | Command–O or drop a `.dashboardwidget` / `.html` file |
| Refresh focused widget | Command–R |
| Switch presentation | Dashboard menu → Use as a Space / Use as an Overlay |

Full-screen mode automatically requests the leftmost Space using private SkyLight operations. This **was verified working on macOS 27.0 build 26A5425a**. The order is checked again when Spaces change. Other macOS builds may restrict the operation; the app reports failed pinning rather than claiming success. See [Spaces implementation](docs/Spaces.md).

## Appearance and motion

Settings → Appearance offers Leopard and **macOS 27 · Liquid Glass**. The modern theme uses Apple's current clear widget proportions, system typography, a month calendar, compact analog clock, six-day weather layout, and Music transport controls. Native `NSGlassEffectView` materials follow widget positions on macOS 26 and later; older supported systems use a visual-effect fallback. Widget preferences, calculator values, generated frames, and separate positions for each theme survive switching.

Modern controls use the installed macOS SF Symbols, regular system typography, and native glass without additional painted borders or color tints. A cached 10-point Gaussian blur softens the modern wallpaper while retaining its composition. The Leopard shelf keeps its metal finish with a quiet label area and detailed, contained widget thumbnails. Controls provide visible keyboard focus and readable foreground colors. Shelf, dialog, tile, and widget transitions respect Reduce Motion. Reduce Transparency and Increase Contrast use more opaque surfaces. AI generation receives the selected theme; existing generated widgets receive an appearance event without losing their state.

A Dashboard Space covers the full display, including the strip beside a MacBook's camera housing. The real hardware notch remains visible; widgets crossing it are inset while the adjacent top corners remain usable. This uses a guarded, process-local AppKit override described in [Spaces implementation](docs/Spaces.md).

## Included widgets

| Widget | Behavior |
| --- | --- |
| Weather | Click conditions to expand/collapse the six-day forecast; city search, °C / °F, optional forecast lows |
| World Clock | Analog clock, seconds hand, day/night case, selectable cities |
| iCal | Click the date to slide between a square date tile and full month; day selection, month arrows, return to today |
| Calculator | Arithmetic, memory, keyboard input, copy/paste, repeated equals; saved display |
| Stickies | Persistent notes, five paper colors, fonts and sizes |
| Dictionary | Type-ahead lookup, installed dictionary/thesaurus picker, collapsible results and resize handle |
| Unit Converter | Ten offline categories; edit either value to convert in either direction |
| Currency Converter | Daily ECB rates via Frankfurter; edit either amount |
| Stocks | Expand/collapse selected chart, saved stock/range selection, percent/points toggle, delayed Yahoo quotes |
| Translation | Selected LLM translates between 11 languages; reverse text/languages, Command–Return to translate |
| Address Book | Local search, select a contact card, return to results; clearing collapses the widget |
| Tile Game | Solvable 15-puzzle, photo or numbers, new game and move count |
| iTunes | Music transport, volume slider, MENU playlist picker and actual play/pause state |
| Google | Search in the default browser |
| Business | Business lookup with Apple Maps |
| People | Browser-based Whitepages directory lookup |
| Flight Tracker | Opens a flight's FlightAware page; original feed is retired |
| ESPN | ESPN scoreboard by league; refreshes every two minutes |
| Ski Report | Mountain weather and forecast snowfall; lift/trail feed is retired |
| Movies | Apple movie catalog search; original cinema showtimes are retired |
| Web Clip | Resize, position and scale a clipped page; browser fallback for sites that block embedding |

See the [interaction guide and parity audit](docs/Interactions.md) for every widget’s controls and the remaining differences from Leopard.

Manage Widgets controls which definitions appear in the shelf. All widgets support multiple instances and saved positions. Generated widgets also have per-instance saved state, export, import, and remix.

## AI widgets

Select a provider, describe a tool, try the preview, then add it or drag it onto the dashboard. A verified Codex-generated example is included at [Examples/Brass Mechanical Counter.dashboardwidget](Examples/Brass%20Mechanical%20Counter.dashboardwidget).

Codex and Claude Code use their existing local authentication and their account's service. LM Studio uses a loopback OpenAI-compatible endpoint; start its server and load a model first. The app has **no App Sandbox**, while generated HTML runs in an isolated WebKit frame with a constrained state API. See [widget format and provider details](docs/WidgetFormat.md).

Your layout is saved atomically to `~/Library/Application Support/Dashboard 2026/dashboard.json`; the previous version is kept as `dashboard.backup.json`. The source checkout and app bundle contain no account credentials or personal layout.

## Verify

```sh
node --test Tests/core.test.cjs
./scripts/test.sh                  # native WebKit integration, isolated data directory
./scripts/test.sh --test-space     # also creates and checks a temporary full-screen Space
./scripts/test.sh --test-ai        # makes a real generation request through Codex
```

See [verification results](docs/Verification.md) and [design/data references](docs/References.md).

## Distribute on the web

```sh
./scripts/package.sh
```

Creates `dist/Dashboard.zip` and a SHA-256 checksum. The default package is ad-hoc signed for local testing. For normal Gatekeeper behavior on other Macs, sign with a **Developer ID Application** identity and notarize:

```sh
DEVELOPER_ID_APPLICATION='Developer ID Application: Your Name (TEAMID)' \
NOTARY_PROFILE='your-keychain-profile' ./scripts/package.sh
```

No App Store sandbox is required. A Developer ID Application identity was not available during this build, so the local package is not notarized. Apple Distribution and Apple Development identities are not substitutes for Developer ID web distribution.
