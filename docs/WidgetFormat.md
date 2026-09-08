# Making widgets

Choose **Create a Widget…**, select Codex, Claude Code, or LM Studio, choose Automatic (or a preferred size), and describe the widget. The creator builds, checks and repairs the candidate before presenting a preview. Try its real controls there before adding it or using **Drag to Place**. The information button on any custom widget lets you change its size, export it, or remix it. Multiple instances have independent inputs and saved state.

## Sizes

| Size | Points |
| --- | --- |
| Small | 170 × 170 |
| Medium | 348 × 170 |
| Large | 348 × 360 |

Version 2 dimensions must match the selected size. Connected widgets reflow in all three sizes. New offline tools use responsive HTML and are rendered and tested independently at all three sizes. The creator reviews which tested size best suits the requested content. A manually selected size is preserved. If repeated repairs cannot make a size work, that option is disabled; at least one size must pass before a working preview is offered. Older version 1 widgets keep their original dimensions and can also be scaled into these sizes; changing their layout requires a remix.

## Real data and actions

Version 2 separates offline tools from connected widgets. An offline counter, timer, calculator or note can run its own HTML. Widgets needing external facts use a declarative connection rendered by the host. Model-generated HTML cannot inject sample prices, pretend bookings or invented results into that display.

Three connection modes are supported:

- **JSON API:** The host performs a public HTTPS GET and displays actual response fields. Missing fields, inaccessible endpoints and invalid responses produce an error. No placeholder values are substituted. Public connections refresh on opening and every 15 minutes. Authenticated connections use **Connect** or **Refresh**.
- **Web research:** **Check web** starts the selected local Codex or Claude Code with web search/fetch tools. The agent returns short verbatim excerpts and HTTPS source links. The host independently retrieves each page and accepts an excerpt only if it occurs in the retrieved text. Checks are manual; opening Dashboard does not spend an LLM request. Blocked or JavaScript-only pages may not provide extractable results. **Open Website** remains available.
- **Browser:** Opens the real service with the widget’s input parameters. Live availability, login, seats, checkout and confirmation happen on that service. A browser widget does not claim a completed transaction.

Connected widgets can render records or an activity grid from actual dated daily counts. Activity grids support ISO dates or Unix timestamps and consecutive daily-count arrays, such as GitHub’s weekly `days` arrays. A rolling 7–93 day window uses UTC. Missing dates are marked unavailable, and partial paginated data is rejected for activity totals. GitHub repository statistics exclude merge commits. `connection.openURL` opens the human-readable website separately from the API endpoint.

Every result shows its source and retrieval time. Results older than 15 minutes are labelled **Saved result**. Retrieval time is not the provider’s publication time: source content can be delayed, incomplete or wrong. Quote verification establishes that the source contains the words; it cannot establish their truth or freshness. Each instance caches at most 200 KB, and errors clear its previous snapshot.

The repaired Fandango widget uses its verified ZIP/date movie-times route and opens Fandango for ticket selection and checkout. Its settings can switch to web research, which may be unable to extract dynamic showtimes. The earlier locally generated ticket planner is archived under `Widget Backups` before migration. Other legacy widgets retain their definitions; remix an older widget that needs external data.


## Build, test and repair

The creator uses the selected Codex, Claude Code or LM Studio provider in a bounded repair loop. Each candidate must pass manifest validation, real source retrieval and field mapping, layout checks at Small/Medium/Large, and a separate model review against the original requested behavior. Offline tools also run their declared interaction checks in fresh isolated frames at each size. The host detects uncaught script errors, clipped controls, overflow and failed assertions. Failures, API field shapes (without response values), and the previous candidate are sent back to the selected provider for repair.

The loop allows six attempts and stops starting attempts after twelve minutes. Each provider request retains its three-minute timeout. Credentials, missing user inputs, blocked access and provider sign-in/usage failures can require user action. Exhausted or blocked candidates are labelled unfinished and cannot be installed through the creator until **Retry checks** succeeds. If functionality works but some sizes repeatedly fail, the validated sizes are offered with the unavailable sizes disabled. API results remain subject to source availability after creation.

The preview is withheld during generation and validation. It appears when checks pass, or when the user explicitly chooses **Review unfinished widget** after a blocker/exhaustion. Cancel interrupts generation or agent research. Inputs and provider selection stay fixed for the running build; preview input values survive resizing and transfer to the installed widget.

Offline manifests include `checks`, an array of up to six `{name, steps}` tests. Each step has `action`, CSS `selector`, and string `value`. Actions are `click`, `input`, `key`, `wait`, `assertText`, and `assertValue`. Each test needs an assertion; waits are limited to three seconds per step. Assertions compare normalized exact text or exact field values. The host bounds each size's probe to thirty seconds, and discards its test state. Connected widgets use `checks: []` because their rendering, data mapping and controls are host-owned. Tests and model review reduce failures; they do not prove every possible interaction, visual state or remote-service outcome.

## Portable connected file

```json
{
  "version": 2,
  "name": "SF Observed Temperature",
  "kind": "connected",
  "size": "medium",
  "width": 348,
  "height": 170,
  "html": "<!doctype html><html></html>",
  "connection": {
    "mode": "json",
    "url": "https://api.weather.gov/stations/SFOC1/observations/latest",
    "query": "Current observed temperature",
    "itemsPath": "properties",
    "fields": [{ "label": "Temperature °C", "path": "temperature.value" }],
    "parameters": [],
    "auth": null,
    "actionLabel": "Open source"
  }
}
```

The `.dashboardwidget` extension is JSON. Names are limited to 80 characters and HTML to 1 MB. Connected HTML is ignored. `itemsPath` selects an object or array; `fields` selects up to six labelled properties per record with paths such as `temperature.value` or `values[0].price`. Up to 30 records are rendered. An empty field list shows the actual JSON.

Up to four parameters use `{id}` placeholders in the URL path or query. Parameters have `id`, `label`, `type` (`text`, `date`, `number`) and a string `value`; date value `today` initializes to the current local date. Inputs are encoded as values and cannot change the source host. Large responses (over 1.5 MB), private network destinations and redirects to another host are rejected.

## API keys

An API can declare `auth` with `placement` (`header` or `query`), `name`, `prefix`, and `helpURL`. For example, bearer authentication uses `header`, `Authorization`, and `Bearer `. **Connect** opens a native secure field; **Get an API Key** opens the provider’s HTTPS setup page. The key is stored in macOS Keychain, scoped to the widget definition, source host and authentication field. It is sent only to the declared API and redacted from echoed response values. It never goes into HTML, generation prompts, exported files or saved layout JSON. Importing an exported widget requires reconnecting its key.

## Offline tools and persistence

Use `kind: "tool"` and `connection: null` for self-contained tools. Version 1 files remain supported with integer widths 140–800 and heights 100–700. HTML executes in an `allow-scripts` iframe with an opaque origin and no direct network, file or native-bridge access. The native app itself has no App Sandbox.

Before offline code runs, the host provides:

```js
const saved = window.dashboardState ?? { count: 0 };
window.saveDashboardState({ count: saved.count + 1 });
```

Each instance has independent state limited to 200 KB. Save whenever state changes; local storage is unavailable. The host checks the sending frame before accepting state messages. Use inline CSS/SVG/canvas and system fonts, responsive layouts, keyboard-accessible controls and reduced-motion preferences.

## Providers

- Codex uses its existing local sign-in with `exec`, an ephemeral read-only session, JSON-schema output and live web search. Shell tools are disabled, and the session runs in an empty temporary directory without user customizations.
- Claude Code uses its existing sign-in with print mode, safe mode, JSON-schema output and only WebSearch/WebFetch tools. No permission-bypass flag is passed.
- LM Studio uses a loopback server URL, normally `http://127.0.0.1:1234/v1`. It can generate widgets and use direct API connections. This integration does not provide LM Studio a web-search tool; use Codex/Claude Code for agent checks, or open the website.

Generation and agent checks can be cancelled and time out after three minutes. API/browser parameters are shared with their declared service; web research shares the requested query and input values with the selected agent’s provider. API keys stay out of those prompts. The layout changes only when a preview is added, apart from the explicitly identified legacy Fandango repair.
