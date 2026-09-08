# Verification

Verified on September 8, 2026, on an Apple Silicon Mac running macOS 27.0, build 26A5425a, with Xcode 27. The Release app contains both arm64 and x86_64 slices. Intel execution and other macOS versions have not been tested.

## Passed

- Six Node tests: calculator arithmetic and memory, conversion offsets, leap-year calendar behavior, 100 solvable puzzle shuffles, and widget manifest validation.
- Ten native WebKit integration checks: initial widgets, native persistence round trip, calculator interaction, generated script execution, generated-content isolation from the native host, offline Dictionary lookup, service URL allowlist, shelf catalog, shelf visibility, and rendering every bundled widget.
- A real request through local Codex 0.149.0 generated the [Brass Mechanical Counter](../Examples/Brass%20Mechanical%20Counter.dashboardwidget). The native generation result contained 4,774 bytes of HTML. The generated widget was imported, previewed, dragged onto the installed app, and interacted with. Its count survived flipping to preferences and back.
- Private Space reordering returned `method: "SkyLight bridged operation"` and `pinned: true`, confirmed by reading the managed display Space order. Full-screen shelf and modal rendering were inspected after the move.
- The installed app's shelf, widget dragging, calculator, weather location selection, tile puzzle, flip animation, and generated counter controls were exercised through the native UI.
- Live weather, geocoding, exchange rates, stock chart, sports, and movie endpoints returned data during development. Remote service availability can change.
- Login registration for the installed app was confirmed enabled and allowed in macOS's background item records.
- A universal Release ZIP was built and its SHA-256 checksum written alongside it. The installed app and package are ad-hoc signed.

Automated tests use a separate `DASHBOARD_DATA_DIR`, preserving the installed app's layout. Raw diagnostic results and screenshots stay in the ignored `artifacts/` folder because screenshots may include the user's desktop picture.

## Limits

Claude Code was detected and its adapter implemented, but a live Claude generation was not exercised. LM Studio was detected with its local server stopped; generation requires starting its server and loading a model. Contacts and Music integrations were not exercised with personal data or permission grants.

This is a functional recreation with new artwork, not a pixel-for-pixel validation against a running Leopard installation. Retired flight, people/business, movie-showtime, translation, and ski-condition services have the replacement behaviors documented in the README. Network failures are displayed rather than filled with invented live data.

The private Space behavior is verified on the build above; it is not an OS guarantee across updates or every multiple-display configuration. No Developer ID Application certificate was available, so the package has not been notarized for normal Gatekeeper distribution. The packaging script supports Developer ID signing and notarization when credentials are available.
