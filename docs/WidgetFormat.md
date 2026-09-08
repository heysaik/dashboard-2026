# Making widgets

Choose **Create a Widget…**, select Codex, Claude Code, or LM Studio, and describe a small tool. Try it in the preview. **Add to Dashboard** places it in the middle; **Drag to Place** lets you choose a location. Its definition is then available in the widget shelf and can have multiple independent instances.

Flip a custom widget with its information button to export it or start a remix. Imported `.dashboardwidget` files and HTML files go through the same preview. Files may be dropped onto the Dashboard or opened with Dashboard → Import Widget.

## Portable file

```json
{
  "version": 1,
  "name": "Counter",
  "width": 220,
  "height": 180,
  "html": "<!doctype html><html><head><style>body{background:#e8cf91}</style></head><body>...</body></html>"
}
```

The `.dashboardwidget` extension is JSON. Width must be an integer from 140 to 800; height from 100 to 700. Names are limited to 80 characters and HTML to 1 MB. Images, scripts, styles, and fonts should be self-contained. Inline SVG, Canvas, CSS and system fonts work.

Widgets execute in an iframe with `allow-scripts` and an opaque origin. The desktop app is not App-Sandboxed, but generated content is isolated from its privileged native bridge. Generated widgets cannot read files, run shell commands, access contact details, or make network requests. The shipped service widgets use narrowly scoped native operations. This separation is independent of Mac App Store restrictions.

## Persistent state

Before the widget's own code runs, the host provides:

```js
const saved = window.dashboardState ?? { count: 0 };
window.saveDashboardState({ count: saved.count + 1 });
```

Each instance has independent state, limited to 200 KB. Save whenever state changes. Local storage is unavailable in the opaque iframe. The host validates the sending frame before accepting state messages.

## Providers

- Codex uses its existing local sign-in with `exec`, an ephemeral read-only session, and a JSON schema. It runs in an empty temporary directory. The dashboard does not read or copy credentials.
- Claude Code uses its existing sign-in with print mode, safe mode, built-in tools disabled, and JSON-schema output. No permission-bypass flag is passed.
- LM Studio uses a loopback server URL, normally `http://127.0.0.1:1234/v1`. Start the server and load a model in LM Studio. No API key is copied from another app.

Generation can be cancelled and has a three-minute timeout. CLI subprocesses write their output to temporary files to avoid pipe deadlocks. The desktop layout changes only when the user adds the preview.
