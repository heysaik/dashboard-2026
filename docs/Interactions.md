# Widget interactions

This audit covers all 21 bundled widget types. It describes implemented controls, including the September 8 interaction restoration, without claiming binary or complete historical parity with a running Leopard installation.

## Expanding widgets

- **iCal:** click the large date to slide the month panel in or out. Leopard switches between 141 × 141 and 300 × 141 points; the modern theme switches between 170 × 170 and 348 × 170. Dragging the same date moves the widget without toggling it. Month arrows navigate; selecting a day updates the large date; clicking the month heading returns to today. Expansion and selection persist through settings, theme changes and app restarts.
- **Weather:** click the current conditions to slide the six-day forecast closed or open. Enter and Space also toggle it. City, units, current-data source and “Show forecast lows” live on the back. Current US temperature prefers a nearby NWS observation no more than 90 minutes old, with station and update time shown; other regions or unavailable observations use a labelled Open-Meteo model estimate. The six-day forecast remains Open-Meteo. Forecasts refresh when Dashboard returns after the refresh interval.
- **Stocks:** click a stock to select its chart. Clicking the selected stock again collapses or expands the chart. The selection, expansion and chart range are saved. Click a price-change badge to switch the watchlist between percentage and points, or use the setting on the back. Symbols entered on the back define watchlist order.
- **Dictionary:** typing looks up a word after a short debounce; Return looks it up immediately. The source picker includes dictionaries and thesauruses available through this Mac’s DictionaryServices. Clearing the field collapses the results. Drag the bottom-right handle to resize; arrow keys on the focused handle resize in ten-point increments. Result dimensions are saved. Missing dictionary enumeration falls back to the system dictionary.
- **Address Book:** submit a name to search local Contacts, select a result to open its card, then use All Results to return. Clearing the search collapses the widget. Late responses cannot reopen a cleared search. macOS access is requested only on submission.

Size animations run for 340 ms, start from the currently displayed size when interrupted, and keep native glass surfaces aligned. Reduced Motion skips these animations. Collapsed widgets expand sufficiently to display their preference backs.

## Other controls

| Widget | Available interactions |
| --- | --- |
| World Clock | Select a city from this Mac’s available time zones on the back; seconds, AM/PM and day/night appearance update automatically, including after Dashboard returns. |
| Calculator | Buttons and keyboard arithmetic, memory, repeated equals, sign, percentage, backspace, Command-C and Command-V. Copy preserves the display; pasted numeric values preserve pending operations and memory. Invalid text is rejected. |
| Stickies | Edit and save text; select paper color, font and text size on the back. |
| Unit Converter | Select category and units; edit either field to convert in either direction, including temperature offsets. |
| Currency Converter | Select currencies; edit either amount. Clearing either field clears both. Changed currency pairs clear the previous rate while the new rate loads. |
| Translation | Choose source/target languages; translate with the arrow or Command-Return. Swap reverses both languages and text. A response for text edited in flight cannot overwrite the newer input. |
| Tile Game | Click a tile adjacent to the empty square; the tile slides into it. Back settings choose photo/numbers or start a solvable new game. Board and move count persist. |
| iTunes / Music | Connect, play/pause, next/previous, and adjust Music’s volume. MENU opens playlists; in the modern theme, click the music icon. Select a playlist to play it, or return to Now Playing. Playback status changes the play/pause icon. |
| Google | Submit a search to the default browser. |
| Business | Submit a business search to Apple Maps. |
| People | Submit a name to Whitepages in the default browser. |
| Flight Tracker | Submit an airline code and flight number to open FlightAware. |
| ESPN | Select a league; scroll the live scoreboard; refresh or wait for the two-minute refresh. |
| Ski Report | Choose a mountain location and temperature units; current mountain weather and forecast snowfall refresh automatically. |
| Movies | Search the Apple movie catalog; select a result to open its details. |
| Web Clip | Choose a URL on the back. Resize from the bottom-right handle. Adjust reveals a draggable page-positioning overlay; arrows move it in twenty-point increments. Done saves the crop. Back settings set page width and scale. Open visits the page in the browser. |

Every widget retains Dashboard’s shared drag/drop placement, multiple instances, preference flip, removal, saved position, and refresh controls. Keyboard focus enables arrow-key movement and Command-R refresh. Option reveals close buttons. The shelf supports adding by click or drag and managing visible widget types. Generated widgets retain their own state across flips and theme changes.

## Historical and service differences

Leopard’s discontinued online feeds are not reinstated: flight tracking, people/business directories and cinema details use the destinations above; ski data provides weather/snowfall rather than operating lifts and trails. Translation uses the configured LLM. Music controls the current Music app rather than iTunes. Web Clip crops an embedded page; it does not inject Safari’s retired “Open in Dashboard” browser command, and websites can refuse embedding.

The current implementation does not include every historical Easter egg, Dictionary suggestion list/click-through definition navigation, stock-chart hover inspection, Music shuffle/repeat and seeking. The original Apple binaries and assets have not been bundled. These are remaining parity differences, not controls represented as working.

## References

- Apple’s [Dashboard widget basics](https://developer.apple.com/library/archive/documentation/AppleApplications/Conceptual/Dashboard_ProgTopics/Articles/WidgetBasics.html) documents widget lifecycle and shared interaction conventions.
- Apple’s [Diverse Learners booklet](https://images.apple.com/ca/education/docs/teachers/DiverseLearnersBooklet.pdf) describes the calendar, Dictionary/thesaurus and conversion tools.
- The period [Dashboard walkthrough](https://flylib.com/books/en/2.963.1.52/1/) describes the date/month collapse, Weather forecast toggle and Dictionary resize behavior. It is a historical Tiger reference, not proof of every Leopard behavior.
- Native Music commands were checked against this Mac’s `/System/Applications/Music.app/Contents/Resources/com.apple.Music.sdef`. Dictionary lookup uses the installed SDK’s DictionaryServices API with runtime-guarded dictionary enumeration.

See [verification results](Verification.md) for the distinction between real native checks, fixture-based permission-gated checks, and remaining live-service limits.
