'use strict';
const Dashboard = (() => {
  const { escape: e, clamp, validManifest } = Core;
  const canvas = document.getElementById('canvas'), modalLayer = document.getElementById('modal-layer');
  let state = { version: 1, widgets: [], custom: [], settings: { texture: 'leopard', scale: 1, reducedMotion: false, provider: 'codex', endpoint: 'http://127.0.0.1:1234/v1', model: '', disabled: [] } };
  const mounted = new Map();
  let ready = false, shelf = false, editing = false, saveTimer, saveChain = Promise.resolve(), z = 1, toastTimer, currentPreview = null, generation = false, lastFocus = null, savedLoadError = false;
  const native = async (action, data = {}) => {
    if (!window.webkit?.messageHandlers?.native) throw new Error('Open this dashboard in the Dashboard 2026 Mac app.');
    return await window.webkit.messageHandlers.native.postMessage({ action, data });
  };
  const aiSettings = () => ({ provider: state.settings.provider, endpoint: state.settings.endpoint, model: state.settings.model });
  function toast(message, duration = 5500) { const element = document.getElementById('toast'); element.textContent = message; element.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => element.hidden = true, duration); }
  async function open(url) { try { await native('open', { url }); } catch (error) { toast(error.message); } }
  function save() {
    if (!ready || savedLoadError) return;
    clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 220);
  }
  function flushSave() {
    clearTimeout(saveTimer);
    if (!ready || savedLoadError) return Promise.resolve();
    const snapshot = JSON.parse(JSON.stringify(state));
    saveChain = saveChain.catch(() => {}).then(() => native('save', snapshot)).catch(error => toast(`Could not save Dashboard: ${error.message}`, 12000));
    return saveChain;
  }
  function bounds() { const scale = state.settings.scale || 1; return { width: innerWidth / scale, height: (innerHeight - (shelf ? 200 : 72)) / scale }; }
  function position(instance) { const size = bounds(); instance.x = clamp(instance.x, 18, Math.max(18, size.width - instance.width - 18)); instance.y = clamp(instance.y, 32, Math.max(32, size.height - instance.height - 10)); const element = mounted.get(instance.id)?.root; if (element) { element.style.left = instance.x + 'px'; element.style.top = instance.y + 'px'; } }
  function applySettings() {
    document.body.classList.toggle('linen', state.settings.texture === 'linen');
    document.body.classList.toggle('reduced-motion', state.settings.reducedMotion);
    document.body.classList.toggle('leopard', state.settings.texture === 'leopard');
    canvas.style.transform = `scale(${state.settings.scale})`;
    state.widgets.forEach(position);
  }
  function definition(type) { return Widgets.definitions.get(type) || state.custom.find(widget => widget.id === type); }
  function defaultLayout() {
    const width = innerWidth, height = innerHeight; const cx = width / 2, cy = height * .43;
    return [['weather', cx - 118, cy - 178], ['clock', cx + 220, cy - 114], ['calendar', cx - 4, cy + 77], ['calculator', cx - 304, cy - 5]].map(([type, x, y]) => makeInstance(type, x, y));
  }
  function makeInstance(type, x, y) { const def = definition(type); return { id: crypto.randomUUID(), type, x, y, width: def.width, height: def.height, prefs: structuredClone(def.defaults || {}), data: null }; }
  function add(type, x, y) {
    const def = definition(type); if (!def) return;
    const size = bounds(); const offset = state.widgets.length % 5 * 24;
    const instance = makeInstance(type, x ?? (size.width - def.width) / 2 + offset, y ?? (size.height - def.height) / 2 + offset);
    state.widgets.push(instance); mount(instance, true); position(instance); save(); return instance;
  }
  function ripple(instance) {
    const scale = state.settings.scale || 1;
    for (const second of [false, true]) { const element = document.createElement('div'); element.className = 'ripple' + (second ? ' second' : ''); Object.assign(element.style, { left: (instance.x - 15) * scale + 'px', top: (instance.y - 12) * scale + 'px', width: (instance.width + 30) * scale + 'px', height: (instance.height + 24) * scale + 'px' }); document.getElementById('effects').append(element); setTimeout(() => element.remove(), 1100); }
  }
  function dispose(id) { const ctx = mounted.get(id); if (!ctx) return; ctx.cleanups.forEach(clean => clean()); ctx.root.remove(); mounted.delete(id); }
  function remove(id) {
    const ctx = mounted.get(id); if (!ctx) return; ctx.root.classList.add('removing'); state.widgets = state.widgets.filter(instance => instance.id !== id); save();
    setTimeout(() => dispose(id), 360);
  }
  function rerender(instance) { dispose(instance.id); mount(instance); }
  function mount(instance, animate = false) {
    const def = definition(instance.type); if (!def) return;
    instance.prefs = { ...(def.defaults || {}), ...(instance.prefs || {}) };
    const root = document.createElement('article'); root.className = 'widget' + (def.html ? ' custom-widget' : '') + (animate ? ' entering' : ''); root.tabIndex = 0; root.setAttribute('aria-label', def.name + ' widget'); root.dataset.id = instance.id;
    Object.assign(root.style, { width: instance.width + 'px', height: instance.height + 'px', zIndex: ++z });
    root.innerHTML = `<button class="widget-close" aria-label="Remove ${e(def.name)}">×</button><div class="widget-flipper"><div class="widget-front"><div class="widget-content"></div>${def.html ? '<div class="custom-handle" title="Drag widget"></div>' : ''}<button class="widget-info" aria-label="${e(def.name)} settings">i</button></div><div class="widget-back" inert></div></div><span class="widget-name">${e(def.name)}</span>`;
    canvas.append(root);
    const ctx = { root, instance, el: root.querySelector('.widget-content'), prefs: instance.prefs, cleanups: [], save, alive: () => mounted.get(instance.id) === ctx && root.isConnected,
      interval(fn, delay) { const id = setInterval(() => { if (!document.hidden && ctx.alive()) fn(); }, delay); ctx.cleanups.push(() => clearInterval(id)); },
      on(target, event, fn) { target.addEventListener(event, fn); ctx.cleanups.push(() => target.removeEventListener(event, fn)); },
      resize(width, height) { instance.width = width; instance.height = height; root.style.width = width + 'px'; root.style.height = height + 'px'; position(instance); },
      flip: () => flip(ctx)
    };
    mounted.set(instance.id, ctx);
    position(instance);
    root.querySelector('.widget-close').onclick = () => remove(instance.id);
    root.querySelector('.widget-info').onclick = () => flip(ctx);
    if (def.html) renderCustom(ctx, def); else { try { def.render(ctx); } catch (error) { ctx.el.innerHTML = `<div class="service-error">${e(error.message)}</div>`; } }
    root.addEventListener('pointerdown', event => { root.style.zIndex = ++z; if (!event.target.closest('input,textarea,select,button,a,iframe,[contenteditable],.widget-back')) beginDrag(event, ctx); });
    root.addEventListener('keydown', event => {
      if (event.target !== root) return;
      if (event.metaKey && event.key.toLowerCase() === 'r') { event.preventDefault(); refresh(instance); }
      else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); remove(instance.id); }
      else if (event.key === 'Enter') { event.preventDefault(); flip(ctx); }
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); const step = event.shiftKey ? 20 : 5; instance.x += event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0; instance.y += event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0; position(instance); save(); }
    });
    if (animate) { ripple(instance); setTimeout(() => root.classList.remove('entering'), 600); }
  }
  function beginDrag(event, ctx) {
    if (event.button !== 0 || ctx.root.classList.contains('flipped')) return;
    const start = { x: event.clientX, y: event.clientY, left: ctx.instance.x, top: ctx.instance.y }; let moved = false;
    ctx.root.setPointerCapture(event.pointerId);
    const move = event => { if (!moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 3) return; moved = true; ctx.root.classList.add('dragging'); ctx.instance.x = start.left + (event.clientX - start.x) / state.settings.scale; ctx.instance.y = start.top + (event.clientY - start.y) / state.settings.scale; position(ctx.instance); };
    const end = () => { ctx.root.classList.remove('dragging'); ctx.root.removeEventListener('pointermove', move); ctx.root.removeEventListener('pointerup', end); ctx.root.removeEventListener('pointercancel', end); if (moved) save(); };
    ctx.root.addEventListener('pointermove', move); ctx.root.addEventListener('pointerup', end); ctx.root.addEventListener('pointercancel', end);
  }
  function refresh(instance) { rerender(instance); const root = mounted.get(instance.id)?.root; root?.classList.add('refreshing'); setTimeout(() => root?.classList.remove('refreshing'), 700); }
  function flip(ctx) {
    const root = ctx.root, back = root.querySelector('.widget-back'), front = root.querySelector('.widget-front'), def = definition(ctx.instance.type);
    if (root.classList.contains('flipped')) { back.querySelector('.done')?.click(); return; }
    const originalHeight = ctx.instance.height; let resolvedCity = ctx.prefs.city;
    root.style.height = Math.max(originalHeight, def.html ? 220 : 205) + 'px';
    back.innerHTML = `<h2>${e(def.name)}</h2>${def.html ? '<p>Drag the top edge to move this widget. Its state is saved with your dashboard.</p><button class="silver-button export-widget">Export Widget…</button><button class="silver-button edit-widget">Remix with AI…</button>' : def.settings?.(ctx.prefs) || '<p>No settings for this widget.</p>'}<button class="silver-button done">Done</button>`;
    front.inert = true; back.inert = false; root.classList.add('flipped');
    back.querySelector('.done').onclick = closeBack;
    back.querySelector('.find-city')?.addEventListener('click', async () => {
      const name = back.querySelector('[data-setting=city]').value.trim(), results = back.querySelector('.location-results'); if (name.length < 2) return;
      results.textContent = 'Searching…';
      try { const data = await Widgets.fetchJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=4&language=en&format=json`); if (!ctx.alive()) return; results.innerHTML = data.results?.length ? `<select class="classic-select" style="width:100%"><option value="">Choose a location…</option>${data.results.map((place, i) => `<option value="${i}">${e(place.name)}, ${e(place.admin1 || place.country)}</option>`).join('')}</select>` : 'No locations found.'; results.querySelector('select')?.addEventListener('change', event => { if (event.target.value === '') return; const place = data.results[Number(event.target.value)]; ctx.prefs.latitude = place.latitude; ctx.prefs.longitude = place.longitude; resolvedCity = place.name; back.querySelector('[data-setting=city]').value = place.name; results.textContent = `${place.name}, ${place.country}`; }); } catch (error) { results.textContent = error.message; }
    });
    back.querySelector('.shuffle-tiles')?.addEventListener('click', () => { ctx.prefs.board = Core.shuffleTiles(); ctx.prefs.moves = 0; closeBack(); });
    back.querySelector('.export-widget')?.addEventListener('click', async () => { try { await native('export', def); } catch (error) { toast(error.message); } });
    back.querySelector('.edit-widget')?.addEventListener('click', () => { closeBack(); openStudio(`Create a variation of my ${def.name} widget.\n\nCurrent widget HTML:\n${def.html}`.slice(0, 10500)); });
    setTimeout(() => back.querySelector('input,select,button')?.focus(), 300);
    function closeBack() {
      const cityInput = back.querySelector('[data-setting=city]');
      if (cityInput && cityInput.value !== resolvedCity) { back.querySelector('.location-results').textContent = 'Click Find City and choose the matching location first.'; return; }
      back.querySelectorAll('[data-setting]').forEach(element => ctx.prefs[element.dataset.setting] = element.value);
      root.classList.remove('flipped'); front.inert = false; back.inert = true; root.style.height = originalHeight + 'px';
      save(); setTimeout(() => { if (ctx.alive()) rerender(ctx.instance); }, 610);
    }
  }
  function isolatedHTML(html, data) {
    const encoded = JSON.stringify(data ?? null).replace(/</g, '\\u003c');
    const bootstrap = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; media-src 'none'; form-action 'none'; base-uri 'none'"><script>window.dashboardState=${encoded};window.saveDashboardState=function(value){try{var text=JSON.stringify(value);if(text.length<200000)parent.postMessage({type:'dashboard-state',value:JSON.parse(text)},'*')}catch(e){}};<\/script>`;
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, match => match + bootstrap);
    return bootstrap + html;
  }
  function renderCustom(ctx, def) {
    const frame = document.createElement('iframe'); frame.className = 'custom-frame'; frame.setAttribute('sandbox', 'allow-scripts'); frame.setAttribute('referrerpolicy', 'no-referrer'); frame.title = def.name; frame.srcdoc = isolatedHTML(def.html, ctx.instance.data); ctx.el.append(frame);
    ctx.on(window, 'message', event => { if (event.source !== frame.contentWindow || event.data?.type !== 'dashboard-state') return; try { const encoded = JSON.stringify(event.data.value); if (encoded.length > 200000) return; ctx.instance.data = JSON.parse(encoded); save(); } catch {} });
  }
  function toggleShelf(value = !shelf) { shelf = value; document.body.classList.toggle('shelf-open', shelf); document.getElementById('shelf').hidden = !shelf; document.getElementById('manage').hidden = !shelf; document.getElementById('add').textContent = shelf ? '×' : '+'; document.getElementById('add').setAttribute('aria-expanded', shelf); editing = shelf; document.body.classList.toggle('editing', editing); if (shelf) renderCatalog(); }
  function dragNewWidget(event, def, place) {
    if (event.button !== 0) return;
    const source = event.currentTarget, startX = event.clientX, startY = event.clientY;
    let moved = false, ghost = null;
    source.setPointerCapture(event.pointerId);
    const move = event => {
      if (!moved && Math.hypot(event.clientX - startX, event.clientY - startY) < 5) return;
      if (!moved) {
        moved = true; document.body.classList.add('dragging-new'); document.getElementById('dashboard').inert = false;
        ghost = document.createElement('div'); ghost.className = 'new-widget-ghost';
        ghost.style.width = def.width * state.settings.scale + 'px'; ghost.style.height = def.height * state.settings.scale + 'px';
        if (def.html) { const frame = document.createElement('iframe'); frame.sandbox = 'allow-scripts'; frame.srcdoc = isolatedHTML(def.html, null); frame.style.cssText = `border:0;width:${def.width}px;height:${def.height}px;transform:scale(${state.settings.scale});transform-origin:top left`; ghost.append(frame); }
        else { ghost.innerHTML = `<div class="new-widget-icon">${typeof def.icon === 'function' ? def.icon() : def.icon}<span>${e(def.name)}</span></div>`; }
        document.body.append(ghost);
      }
      ghost.style.left = event.clientX - def.width * state.settings.scale / 2 + 'px'; ghost.style.top = event.clientY - def.height * state.settings.scale / 2 + 'px';
    };
    const end = event => {
      source.removeEventListener('pointermove', move); source.removeEventListener('pointerup', end); source.removeEventListener('pointercancel', end);
      ghost?.remove(); document.body.classList.remove('dragging-new');
      if (moved) {
        source.dataset.suppressClick = 'true'; setTimeout(() => delete source.dataset.suppressClick, 100);
        if (event.type === 'pointerup' && event.clientY < innerHeight - (shelf ? 164 : 0)) place(event.clientX / state.settings.scale - def.width / 2, event.clientY / state.settings.scale - def.height / 2);
      }
      if (!modalLayer.hidden) document.getElementById('dashboard').inert = true;
    };
    source.addEventListener('pointermove', move); source.addEventListener('pointerup', end); source.addEventListener('pointercancel', end);
  }
  function renderCatalog() {
    const query = document.getElementById('widget-search').value.toLowerCase();
    const defs = [...Widgets.definitions.values(), ...state.custom].filter(def => def.name.toLowerCase().includes(query) && !state.settings.disabled.includes(def.id));
    const catalog = document.getElementById('catalog'); catalog.innerHTML = defs.map(def => `<div role="listitem"><button class="catalog-item" data-type="${e(def.id)}" aria-label="Add ${e(def.name)}"><span class="catalog-icon">${typeof def.icon === 'function' ? def.icon() : def.icon || Widgets.box('✦')}</span><span class="catalog-label">${e(def.name)}</span></button></div>`).join('') || '<div class="catalog-empty">No widgets found.</div>';
    catalog.querySelectorAll('[data-type]').forEach(button => {
      button.onclick = () => { if (!button.dataset.suppressClick) add(button.dataset.type); };
      button.onpointerdown = event => dragNewWidget(event, definition(button.dataset.type), (x, y) => add(button.dataset.type, x, y));
    });
  }
  function openModal(title, body, className = '', footer = '') {
    lastFocus = document.activeElement; modalLayer.hidden = false; modalLayer.innerHTML = `<section role="dialog" aria-modal="true" aria-labelledby="dialog-title" class="dialog ${className}"><div class="dialog-titlebar"><h1 id="dialog-title">${e(title)}</h1><button class="dialog-close" aria-label="Close dialog">×</button></div><div class="dialog-body">${body}</div>${footer ? `<div class="dialog-footer">${footer}</div>` : ''}</section>`;
    modalLayer.querySelector('.dialog-close').onclick = closeModal;
    document.getElementById('dashboard').inert = true;
    setTimeout(() => modalLayer.querySelector('textarea,input,select,button')?.focus(), 100);
  }
  function closeModal() {
    if (generation) { toast('Generation is still running. Use Cancel to stop it.'); return; }
    modalLayer.hidden = true; modalLayer.innerHTML = ''; document.getElementById('dashboard').inert = false; document.body.classList.remove('dragging-new'); currentPreview = null; lastFocus?.focus();
  }
  function providerFields() { return `<div class="provider-row"><label>Build with<select id="ai-provider">${[['codex', 'Codex'], ['claude', 'Claude Code'], ['lmstudio', 'LM Studio']].map(([id, name]) => Widgets.option(id, state.settings.provider, name)).join('')}</select></label><label id="model-field" ${state.settings.provider !== 'lmstudio' ? 'hidden' : ''}>Model<select id="ai-model"><option value="${e(state.settings.model)}">${e(state.settings.model || 'Load a model in LM Studio')}</option></select></label></div><div id="provider-status" class="provider-status">Checking local providers…</div>`; }
  async function checkProviders() {
    const status = document.getElementById('provider-status'); if (!status) return;
    try {
      const data = await native('providers', { endpoint: state.settings.endpoint }); if (!status.isConnected) return;
      const provider = document.getElementById('ai-provider').value;
      const names = { codex: 'Codex', claude: 'Claude Code', lmstudio: 'LM Studio' };
      status.innerHTML = `<span class="dot ${data[provider] ? '' : 'off'}"></span>${provider === 'lmstudio' ? e(data.lmstudioMessage) : data[provider] ? `${names[provider]} installed · uses your existing sign-in` : `${names[provider]} not found. Install it and sign in in Terminal.`}`;
      const model = document.getElementById('ai-model'); model.innerHTML = data.models.length ? data.models.map(name => Widgets.option(name, state.settings.model)).join('') : '<option value="">Load a model in LM Studio</option>';
      if (provider === 'lmstudio' && model.value) { state.settings.model = model.value; save(); }
    } catch (error) { if (status.isConnected) status.textContent = error.message; }
  }
  function wireProvider() {
    const provider = document.getElementById('ai-provider'); provider.onchange = () => { state.settings.provider = provider.value; document.getElementById('model-field').hidden = provider.value !== 'lmstudio'; save(); checkProviders(); };
    document.getElementById('ai-model').onchange = event => { state.settings.model = event.target.value; save(); }; checkProviders();
  }
  function openStudio(prompt = '') {
    if (generation) return;
    toggleShelf(false); currentPreview = null;
    openModal('Create a Widget', `<div class="studio-layout"><div class="studio-form"><p>A little tool, made just for you. Describe your widget and give it a place on your Dashboard.</p>${providerFields()}<label for="widget-prompt">What would you like to make?<textarea id="widget-prompt" maxlength="12000" placeholder="A brass kitchen timer with a winding dial and a bell when it finishes…">${e(prompt)}</textarea></label><div class="studio-actions"><button id="generate" class="aqua-button">Create Widget</button><button id="cancel-generation" class="silver-button" hidden>Cancel</button></div><div id="generation-status" class="studio-progress" role="status" hidden></div><div id="generation-error" class="studio-error" role="alert" hidden></div></div><div class="studio-preview" id="preview"><div class="preview-empty">${Widgets.svg('<rect x="8" y="9" width="48" height="46" rx="9" stroke="#ccc" stroke-width="2"/><path d="M23 32h18M32 23v18" stroke="#ccc" stroke-width="2"/>')}Your widget will appear here.<br>Try it, then add it to your Dashboard.</div></div></div>`, '', '<span>Saved on this Mac. Claude Code and Codex use your account’s service; LM Studio can run locally.</span><button id="studio-import" class="silver-button">Import…</button>');
    wireProvider(); document.getElementById('studio-import').onclick = () => native('import').catch(error => toast(error.message));
    document.getElementById('generate').onclick = generateWidget;
    document.getElementById('cancel-generation').onclick = () => native('cancel').catch(error => toast(error.message));
  }
  async function generateWidget() {
    const prompt = document.getElementById('widget-prompt').value.trim(); if (!prompt) { document.getElementById('widget-prompt').focus(); return; }
    const button = document.getElementById('generate'), cancel = document.getElementById('cancel-generation'), status = document.getElementById('generation-status'), error = document.getElementById('generation-error');
    generation = true; button.disabled = true; cancel.hidden = false; status.hidden = false; error.hidden = true;
    const start = Date.now(); const timer = setInterval(() => status.innerHTML = `<span class="spinner"></span>Making your widget… ${Math.round((Date.now() - start) / 1000)}s`, 1000); status.innerHTML = '<span class="spinner"></span>Making your widget…';
    try { const manifest = await native('generate', { prompt, ...aiSettings() }); if (!validManifest(manifest)) throw new Error('The model returned an invalid widget. Try again.'); currentPreview = manifest; showPreview(manifest); status.innerHTML = 'Your widget is ready. Try it in the preview.'; }
    catch (reason) { error.textContent = reason.message; error.hidden = false; status.hidden = true; }
    finally { generation = false; clearInterval(timer); button.disabled = false; button.textContent = 'Create Again'; cancel.hidden = true; }
  }
  function showPreview(manifest) {
    const preview = document.getElementById('preview'); if (!preview) return;
    const scale = Math.min(1, 270 / manifest.width, 310 / manifest.height);
    preview.innerHTML = `<div class="preview-render" style="width:${manifest.width * scale}px;height:${manifest.height * scale}px"><iframe title="${e(manifest.name)} preview" sandbox="allow-scripts" referrerpolicy="no-referrer" style="width:${manifest.width}px;height:${manifest.height}px;transform:scale(${scale})"></iframe></div><div class="preview-actions"><button class="aqua-button" id="add-generated">Add to Dashboard</button><button class="silver-button" id="drag-generated">Drag to Place</button></div><div class="preview-caption">${e(manifest.name)} · ${manifest.width} × ${manifest.height}</div>`;
    preview.querySelector('iframe').srcdoc = isolatedHTML(manifest.html, null);
    document.getElementById('add-generated').onclick = () => installPreview();
    const drag = document.getElementById('drag-generated');
    drag.onpointerdown = event => dragNewWidget(event, manifest, installPreview);
  }
  function installPreview(x, y) {
    if (!validManifest(currentPreview)) return;
    const def = { ...currentPreview, id: 'custom-' + crypto.randomUUID(), icon: Widgets.box('✦') }; state.custom.push(def); closeModal(); const result = add(def.id, x, y); toast(`${def.name} added to Dashboard.`); return result;
  }
  function previewImport(manifest) { if (!validManifest(manifest)) { toast('This is not a valid Dashboard widget.'); return; } if (generation) { toast('Finish the current generation before importing.'); return; } openStudio(); currentPreview = manifest; showPreview(manifest); }
  async function openSettings() {
    if (generation) return;
    openModal('Dashboard Settings', `<div class="settings-form"><h2>Appearance</h2><label>Background<select id="texture">${[['leopard', 'Leopard — your desktop'], ['rubber', 'Lion — dark rubber'], ['linen', 'Gray linen']].map(([id, label]) => Widgets.option(id, state.settings.texture, label)).join('')}</select></label><label>Widget size<select id="scale">${[['0.85', 'Small (85%)'], ['1', 'Original (100%)'], ['1.2', 'Large (120%)'], ['1.4', 'Extra Large (140%)']].map(([id, label]) => Widgets.option(id, String(state.settings.scale), label)).join('')}</select></label><label class="checkbox"><input id="reduce-motion" type="checkbox" ${state.settings.reducedMotion ? 'checked' : ''}>Reduce animation</label><hr><h2>Desktop & Spaces</h2><div class="setting-row"><button id="mode-space" class="silver-button">Use as a Space</button><button id="mode-overlay" class="silver-button">Use as an Overlay</button></div><button id="pin-space" class="silver-button">Pin Dashboard to the Left</button><p id="space-status">⌃⌥D opens Dashboard from any Space. Esc returns to your previous app.</p><label class="checkbox"><input id="login" type="checkbox">Open Dashboard at login</label><hr><h2>Widget creation</h2>${providerFields()}<label>LM Studio server<input id="lm-endpoint" type="text" value="${e(state.settings.endpoint)}"></label><p>Start the local server and load a model in LM Studio to use it here.</p><hr><button id="data-folder" class="silver-button">Show Saved Dashboard…</button></div>`, 'settings-dialog');
    wireProvider();
    document.getElementById('texture').onchange = event => { state.settings.texture = event.target.value; applySettings(); save(); native('appearance', { texture: state.settings.texture }).catch(error => toast(error.message)); };
    document.getElementById('scale').onchange = event => { state.settings.scale = Number(event.target.value); applySettings(); save(); };
    document.getElementById('reduce-motion').onchange = event => { state.settings.reducedMotion = event.target.checked; applySettings(); save(); };
    document.getElementById('lm-endpoint').onchange = event => { state.settings.endpoint = event.target.value; save(); checkProviders(); };
    document.getElementById('mode-space').onclick = () => { closeModal(); native('space').catch(error => toast(error.message)); };
    document.getElementById('mode-overlay').onclick = () => { closeModal(); native('overlay').catch(error => toast(error.message)); };
    document.getElementById('pin-space').onclick = async event => { const button = event.target; button.disabled = true; try { const result = await native('pinSpace'); document.getElementById('space-status').textContent = result.message; } catch (error) { document.getElementById('space-status').textContent = error.message; } finally { button.disabled = false; } };
    document.getElementById('data-folder').onclick = () => native('revealData').catch(error => toast(error.message));
    const login = document.getElementById('login'); login.onchange = async () => { login.disabled = true; try { login.checked = await native('login', { enabled: login.checked }); } catch (error) { login.checked = !login.checked; toast(error.message); } finally { login.disabled = false; } };
    try { login.checked = await native('loginStatus'); } catch {}
  }
  function manageWidgets() {
    const defs = [...Widgets.definitions.values(), ...state.custom];
    openModal('Manage Widgets', `<div class="manage-list">${defs.map(def => `<label class="manage-row"><input type="checkbox" data-type="${e(def.id)}" ${state.settings.disabled.includes(def.id) ? '' : 'checked'}><strong>${e(def.name)}</strong><span>${def.html ? 'Your widget' : 'Built-in'}</span></label>`).join('')}</div><p style="font-size:12px;color:#666">Checked widgets appear in the shelf. Existing instances stay on your Dashboard.</p>`, 'settings-dialog', '<span>Drag a widget from the shelf to add it.</span><button id="manage-done" class="silver-button">Done</button>');
    modalLayer.querySelectorAll('[data-type]').forEach(input => input.onchange = () => { state.settings.disabled = [...modalLayer.querySelectorAll('[data-type]')].filter(input => !input.checked).map(input => input.dataset.type); renderCatalog(); save(); });
    document.getElementById('manage-done').onclick = closeModal;
  }
  async function initialize() {
    try {
      const saved = await native('load');
      if (saved) {
        if (saved.version !== 1 || !Array.isArray(saved.widgets)) throw new Error('The saved layout is not a supported version. Your original file has been preserved.');
        state = { ...state, ...saved, settings: { ...state.settings, ...saved.settings }, custom: (saved.custom || []).filter(validManifest) };
        state.widgets = state.widgets.filter(instance => definition(instance.type) && typeof instance.id === 'string').slice(0, 150);
        for (const instance of state.widgets) { const def = definition(instance.type); if (!Number.isFinite(instance.x)) instance.x = 70; if (!Number.isFinite(instance.y)) instance.y = 70; instance.width = clamp(Number(instance.width) || def.width, 140, 800); instance.height = clamp(Number(instance.height) || def.height, 35, 700); }
        state.settings.scale = clamp(Number(state.settings.scale) || 1, .75, 1.5); if (!Array.isArray(state.settings.disabled)) state.settings.disabled = [];
      } else state.widgets = defaultLayout();
    } catch (error) { savedLoadError = true; state.widgets = defaultLayout(); toast(`Could not load the saved dashboard. ${error.message}`, 20000); }
    ready = true; applySettings(); state.widgets.forEach(instance => mount(instance)); native('appearance', { texture: state.settings.texture }).catch(() => {});
    document.getElementById('add').onclick = () => toggleShelf();
    document.getElementById('remove').onclick = () => { editing = !editing; document.body.classList.toggle('editing', editing); };
    document.getElementById('manage').onclick = manageWidgets;
    document.getElementById('studio-button').onclick = () => openStudio();
    document.getElementById('settings-button').onclick = openSettings;
    document.getElementById('exit').onclick = () => { flushSave(); native('dismiss').catch(error => toast(error.message)); };
    document.getElementById('dashboard').addEventListener('click', event => { if (document.body.classList.contains('overlay-mode') && !shelf && !editing && (event.target === canvas || event.target.id === 'dashboard')) { flushSave(); native('dismiss').catch(error => toast(error.message)); } });
    document.getElementById('widget-search').oninput = renderCatalog;
    document.getElementById('import-button').onclick = () => native('import').catch(error => toast(error.message));
    window.addEventListener('resize', () => { state.widgets.forEach(position); save(); });
    window.addEventListener('blur', () => { document.body.classList.remove('alt-held'); flushSave(); });
    document.addEventListener('keydown', event => {
      document.body.classList.toggle('alt-held', event.altKey);
      if (event.key === 'Escape') { event.preventDefault(); if (!modalLayer.hidden) closeModal(); else if (shelf) toggleShelf(false); else if (editing) { editing = false; document.body.classList.remove('editing'); } else { flushSave(); native('dismiss').catch(error => toast(error.message)); } }
      if (event.metaKey && ['+', '='].includes(event.key)) { event.preventDefault(); toggleShelf(); }
      if (event.metaKey && event.key === 'n') { event.preventDefault(); openStudio(); }
      if (event.key === 'Tab' && !modalLayer.hidden) { const focusable = [...modalLayer.querySelectorAll('button,input,select,textarea,[tabindex]')].filter(el => !el.disabled && el.getClientRects().length); const first = focusable[0], last = focusable.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
    });
    document.addEventListener('keyup', event => document.body.classList.toggle('alt-held', event.altKey));
    document.addEventListener('dragover', event => { if ([...event.dataTransfer.types].some(type => type.startsWith('application/x-dashboard') || type === 'Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } });
    document.addEventListener('drop', async event => {
      const type = event.dataTransfer.getData('application/x-dashboard-widget'), generated = event.dataTransfer.getData('application/x-dashboard-generated');
      if (type || generated) { event.preventDefault(); const x = event.clientX / state.settings.scale - 60, y = event.clientY / state.settings.scale - 30; if (generated) installPreview(x, y); else add(type, x, y); document.body.classList.remove('dragging-new'); }
      else if (event.dataTransfer.files.length) { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file.size > 1100000) return toast('Widgets must be smaller than 1 MB.'); try { const text = await file.text(); previewImport(file.name.endsWith('.html') ? { version: 1, name: file.name.replace(/\.html$/, ''), width: 320, height: 260, html: text } : JSON.parse(text)); } catch (error) { toast(`Could not import widget: ${error.message}`); } }
    });
    save();
  }
  async function runSmokeTests() {
    const results = [];
    const assert = (name, condition) => { results.push({ name, passed: !!condition }); if (!condition) throw new Error(name); };
    assert('initial widgets mounted', mounted.size === state.widgets.length && mounted.size >= 4);
    const sticky = add('stickies', 70, 60); const ctx = mounted.get(sticky.id); const note = ctx.el.querySelector('textarea'); note.value = 'Persistent test note'; note.dispatchEvent(new Event('input'));
    await flushSave(); const saved = await native('load'); assert('native persistence round trip', saved.widgets.find(w => w.id === sticky.id).prefs.text === 'Persistent test note');
    const calcInstance = state.widgets.find(w => w.type === 'calculator'); const calcRoot = mounted.get(calcInstance.id).root;
    for (const key of ['c', '7', '×', '8', '=']) calcRoot.querySelector(`[data-key="${key}"]`).click(); assert('calculator interaction', calcRoot.querySelector('output').textContent === '56');
    const manifest = { version: 1, name: 'Sandbox test', width: 220, height: 150, html: '<html><head></head><body><button id="button">Click</button><script>document.getElementById("button").onclick=()=>saveDashboardState({clicked:true});setTimeout(async()=>{let blocked=false;try{parent.document.body}catch(e){blocked=true}let bridgeBlocked=true;try{await window.webkit.messageHandlers.native.postMessage({action:"load"});bridgeBlocked=false}catch(e){}saveDashboardState({script:true,hostBlocked:blocked,bridgeBlocked})},100)<\/script></body></html>' };
    state.custom.push({ ...manifest, id: 'smoke-custom' }); const custom = add('smoke-custom', 80, 250); await new Promise(resolve => setTimeout(resolve, 700)); assert('generated widget scripts execute', custom.data?.script === true); assert('generated widget cannot access host', custom.data?.hostBlocked === true && custom.data?.bridgeBlocked === true);
    const dictionary = await native('dictionary', { word: 'dashboard' }); assert('native dictionary lookup', typeof dictionary === 'string' && dictionary.length > 30);
    let blocked = false; try { await native('fetch', { url: 'https://example.com' }); } catch { blocked = true; } assert('network allowlist', blocked);
    toggleShelf(true); assert('widget shelf catalog', document.querySelectorAll('.catalog-item').length >= 20);
    await new Promise(resolve => setTimeout(resolve, 450));
    const shelfRect = document.getElementById('shelf').getBoundingClientRect();
    assert('widget shelf visible: ' + JSON.stringify({ top: shelfRect.top, bottom: shelfRect.bottom, height: shelfRect.height, viewport: innerHeight, classes: document.body.className, display: getComputedStyle(document.getElementById('shelf')).display, controlBottom: getComputedStyle(document.getElementById('controls')).bottom, rules: [...document.styleSheets[0].cssRules].map(rule => rule.selectorText).filter(selector => selector?.includes('shelf')) }), shelfRect.height > 100 && shelfRect.top >= 0 && shelfRect.bottom <= innerHeight + 1);
    toggleShelf(false);
    for (const def of Widgets.definitions.values()) { if (!state.widgets.some(w => w.type === def.id)) add(def.id); }
    assert('every bundled widget renders', [...Widgets.definitions.keys()].every(type => state.widgets.some(w => w.type === type)));
    return results;
  }
  const api = { native, aiSettings, toast, open, toggleShelf, openStudio, openSettings, previewImport, flushSave, runSmokeTests, add, remove, get ready() { return ready; }, get state() { return state; } };
  setTimeout(initialize, 0);
  return api;
})();
