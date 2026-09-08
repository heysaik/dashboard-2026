# Verification

Verified on September 8, 2026, on an Apple Silicon Mac running macOS 27.0, build 26A5425a, with Xcode 27. The Release app contains both arm64 and x86_64 slices. Intel execution and other macOS versions have not been tested.

## Passed

- Six Node tests: calculator arithmetic and memory, conversion offsets, leap-year calendar behavior, 100 solvable puzzle shuffles, and widget manifest validation.
- Twenty-seven native WebKit integration checks: initial widgets, persistence, calculator interaction, generated scripts and host isolation, offline Dictionary lookup, service URL allowlist, shelf visibility, all 21 bundled widgets, theme coverage and size families, retained frames and state, calculator contrast, four centered toolbar icons, vector shelf icons, Settings selection and modal focus containment, restored Leopard sizes, persisted theme choice, camera-housing placement, accessibility preferences, and reduced motion.
- A real request through local Codex 0.149.0 generated the [Brass Mechanical Counter](../Examples/Brass%20Mechanical%20Counter.dashboardwidget). The native generation result contained 4,774 bytes of HTML. The generated widget was imported, previewed, dragged onto the installed app, and interacted with. Its count survived flipping to preferences and back.
- Private Space reordering returned `method: "SkyLight bridged operation"` and `pinned: true`, confirmed by reading the managed display Space order. Full-screen shelf and modal rendering were inspected after the move.
- The installed app's shelf, widget dragging, calculator, weather location selection, tile puzzle, flip animation, and generated counter controls were exercised through the native UI.
- The updated installed app was visually checked in both themes, including the modern month calendar, clear materials, vector controls, Settings readability, and retained generated counter. The other utility layouts and preference backs were inspected using isolated review fixtures.
- Full-screen window, WebKit content, and screen frames all measured 1512 × 982 points. The earlier 1512 × 949 content reservation is removed. A dictionary widget was physically dragged to y=18 beside the camera housing; the placement persisted. Simulated camera-housing checks independently confirm that intersecting widgets are inset.
- The final full-screen run confirmed successful leftmost pinning and 23 native material surfaces. Settings remained within the display with opacity 1 after the Space move. Inactive/locked-window handling finishes finite animations so shelf and dialog presentation cannot remain stuck at an initial hidden frame.
- Live weather, geocoding, exchange rates, stock chart, sports, and movie endpoints returned data during development. Remote service availability can change.
- Login registration for the installed app was confirmed enabled and allowed in macOS's background item records.
- A universal Release ZIP was built and its SHA-256 checksum written alongside it. The installed app and package are ad-hoc signed.

The September 8 material refinement was also built and visually checked in both themes. The modern wallpaper blur, native SF Symbols, compact toolbar, and neutral Settings surfaces were inspected. The Leopard shelf's label area and weather, clock, calculator, and note thumbnails were checked at their actual size. All six core tests and 27 integration checks passed again, including full-display sizing and Space pinning.

Automated tests use a separate `DASHBOARD_DATA_DIR`, preserving the installed app's layout. Raw diagnostic results and screenshots stay in the ignored `artifacts/` folder because screenshots may include the user's desktop picture.

## Limits

Claude Code was detected and its adapter implemented, but a live Claude generation was not exercised. LM Studio was detected with its local server stopped; generation requires starting its server and loading a model. Contacts and Music integrations were not exercised with personal data or permission grants.

This is a functional recreation with new artwork, not a pixel-for-pixel validation against a running Leopard installation. Retired flight, people/business, movie-showtime, translation, and ski-condition services have the replacement behaviors documented in the README. Network failures are displayed rather than filled with invented live data.

The private Space behavior is verified on the build above; it is not an OS guarantee across updates or every multiple-display configuration. No Developer ID Application certificate was available, so the package has not been notarized for normal Gatekeeper distribution. The packaging script supports Developer ID signing and notarization when credentials are available.
