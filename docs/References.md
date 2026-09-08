# Design references

The requested target is **Mac OS X Leopard (10.5)**. The project adds a dedicated modern Space while retaining Leopard's overlay appearance and bottom widget shelf. It recreates the widgets with new HTML, CSS, JavaScript, and vector artwork; it does not redistribute Apple's application or original widget bundles.

- [Apple's archived Dashboard Programming Topics](https://developer.apple.com/library/archive/documentation/AppleApplications/Conceptual/Dashboard_ProgTopics/Introduction/Introduction.html) — original HTML/WebKit architecture, widget dimensions, preferences, drag/control regions, lifecycle, and interaction patterns.
- [Widget Basics](https://developer.apple.com/library/archive/documentation/AppleApplications/Conceptual/Dashboard_ProgTopics/Articles/WidgetBasics.html) — overlay, multiple instances, widget shelf, close controls, and reference illustrations.
- [Widget Backs and Preferences](https://developer.apple.com/library/archive/documentation/AppleApplications/Conceptual/Dashboard_ProgTopics/Articles/Preferences.html) — information controls and the animated preference back.
- [Apple's reference screenshot](https://developer.apple.com/library/archive/documentation/AppleApplications/Conceptual/Dashboard_ProgTopics/Art/dashboard_2x.png) — calculator, clock, calendar, weather, dictionary, address book, stocks, translation, Stickies, and shelf materials.
- [512 Pixels: Snow Leopard screenshots](https://512pixels.net/projects/aqua-screenshot-library/mac-os-x-10-6-snow-leopard/) — closely related overlay and shelf visual reference. Used with the Apple documentation to study the retained Leopard-era widgets; not claimed to be a Leopard screenshot.
- [Apple Dashboard overview](https://www.apple.com/sg/pro/photo/dashboard.html) — original widget collection.

Reference images downloaded for local comparison are excluded from Git and the app bundle.

# Data and AI integration

- [Open-Meteo](https://open-meteo.com/en/docs) and [geocoding](https://open-meteo.com/en/docs/geocoding-api) — forecast, city search, and mountain snowfall forecast.
- [Frankfurter](https://frankfurter.dev/) — daily ECB exchange rates.
- Yahoo Finance's public chart endpoint and ESPN's public scoreboard endpoint — best-effort delayed quotes and scores; these unofficial endpoints have no availability guarantee. Failures appear as unavailable data, never simulated quotes or scores.
- [Apple iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html) — movie catalog.
- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference) — noninteractive generation with JSON output and schema.
- Installed `codex exec --help` — read-only ephemeral execution and structured output.
- [LM Studio Chat Completions](https://lmstudio.ai/docs/developer/openai-compat/chat-completions) — local `/v1/models` and `/v1/chat/completions`.

Live API responses were checked from the development Mac on September 8, 2026. Location starts at Cupertino, as in the original Dashboard; it is not inferred from the user's current location.

The replacement Tile Game picture is [Cougar kitten in a tree](https://commons.wikimedia.org/wiki/File:Cougar_kitten_in_a_tree_(104d30d7-ddfa-4dd9-8398-a5421a8920b0).jpg), photographed by NPS/Diane Renkin. It is marked public domain as a U.S. National Park Service work. It is a replacement image, not Apple's original puzzle art.
