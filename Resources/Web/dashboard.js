'use strict';
const Dashboard = (() => {
  const { escape: e, clamp, validManifest } = Core;
  const canvas = document.getElementById('canvas'), modalLayer = document.getElementById('modal-layer');
  let state = { version: 1, widgets: [], custom: [], settings: { texture: 'leopard', scale: 1, reducedMotion: false, provider: 'codex', endpoint: 'http://127.0.0.1:1234/v1', model: '', disabled: [] } };
  const mounted = new Map();
  const modernSizes = { weather: [348,170], clock: [170,170], calendar: [348,170], calculator: [170,300], stickies: [170,170], dictionary: [348,170], converter: [348,170], currency: [348,170], stocks: [348,360], translation: [348,320], contacts: [348,170], tilegame: [170,190], music: [348,170], google: [348,170], business: [348,170], people: [348,170], flight: [348,170], sports: [348,360], ski: [170,360], movies: [348,360], webclip: [348,360] };
  let environment = { safeTop: 0, notchLeft: 0, notchWidth: 0, reduceMotion: false, reduceTransparency: false, increaseContrast: false, nativeGlass: false };
  let materialFrame = 0, materialUntil = 0, materialQueued = false, lastMaterialLayout = '', shelfAnimation, modalAnimation;
  let ready = false, shelf = false, editing = false, saveTimer, saveChain = Promise.resolve(), z = 1, toastTimer, currentPreview = null, generation = false, lastFocus = null, savedLoadError = false;
  const native = async (action, data = {}) => {
    if (!window.webkit?.messageHandlers?.native) throw new Error('Open this dashboard in the Dashboard 2026 Mac app.');
    return await window.webkit.messageHandlers.native.postMessage({ action, data });
  };
  const aiSettings = () => ({ provider: state.settings.provider, endpoint: state.settings.endpoint, model: state.settings.model });
  const reducedMotion = () => state.settings.reducedMotion || environment.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animate(element, frames, options = {}) {
    if (!element || reducedMotion() || document.hidden || !document.hasFocus()) return null;
    return element.animate(frames, { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)', ...options });
  }
  function updateActivity() {
    const inactive = document.hidden || !document.hasFocus();
    document.body.classList.toggle('suspended-motion', inactive);
    if (inactive) for (const animation of document.getAnimations()) {
      if (Number.isFinite(animation.effect?.getComputedTiming().endTime)) { try { animation.finish(); } catch {} }
    }
    if (materialFrame) { cancelAnimationFrame(materialFrame); materialFrame = 0; }
    syncMaterials();
    if (!inactive) document.dispatchEvent(new Event('dashboarddidshow'));
  }
  function setEnvironment(value) {
    environment = { ...environment, ...value };
    document.documentElement.style.setProperty('--safe-top', `${environment.safeTop}px`);
    document.body.classList.toggle('native-glass', environment.nativeGlass);
    document.body.classList.toggle('reduce-transparency', environment.reduceTransparency);
    document.body.classList.toggle('increase-contrast', environment.increaseContrast);
    document.body.classList.toggle('reduced-motion', reducedMotion());
    if (ready) { state.widgets.forEach(position); syncMaterials(); }
  }
  function syncMaterials(duration = 0) {
    materialUntil = Math.max(materialUntil, performance.now() + duration);
    if (materialFrame || materialQueued) return;
    const update = () => {
      materialFrame = 0;
      const surfaces = [];
      if (state.settings.texture === 'liquid' && !document.body.classList.contains('dragging-new')) {
        const selectors = ['.widget:not(.flipped):not(.removing)', ...(modalLayer.hidden ? ['#controls', '#right-controls', ...(shelf ? ['#shelf'] : [])] : ['.dialog'])];
        for (const selector of selectors) {
          for (const element of document.querySelectorAll(selector)) {
            if (element.hidden) continue;
            const rect = element.getBoundingClientRect(), style = getComputedStyle(element), widget = element.classList.contains('widget');
            surfaces.push({ id: widget ? element.dataset.id : selector, kind: widget ? 'widget' : 'control', x: rect.x, y: rect.y, width: rect.width, height: rect.height, radius: widget ? 22 * state.settings.scale : parseFloat(style.borderRadius) || 26, opacity: Number(style.opacity) });
          }
        }
      }
      const layout = JSON.stringify(surfaces);
      if (layout !== lastMaterialLayout) { lastMaterialLayout = layout; native('materials', { surfaces }).catch(() => {}); }
      if (performance.now() < materialUntil && !document.hidden && document.hasFocus()) materialFrame = requestAnimationFrame(update);
    };
    materialQueued = true;
    queueMicrotask(() => { materialQueued = false; update(); });
  }
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
  function bounds() { const scale = state.settings.scale || 1; return { width: innerWidth / scale, height: (innerHeight - (shelf ? (state.settings.texture === 'liquid' ? 278 : 263) : (state.settings.texture === 'liquid' ? 100 : 82))) / scale }; }
  function position(instance) {
    const size = bounds(), scale = state.settings.scale || 1;
    instance.x = clamp(instance.x, 18, Math.max(18, size.width - instance.width - 18));
    const intersectsNotch = environment.notchWidth > 0 && (instance.x + instance.width) * scale > environment.notchLeft - 10 && instance.x * scale < environment.notchLeft + environment.notchWidth + 10;
    const minY = intersectsNotch ? (environment.safeTop + 12) / scale : 18 / scale;
    instance.y = clamp(instance.y, minY, Math.max(minY, size.height - instance.height - 10));
    const element = mounted.get(instance.id)?.root; if (element) { element.style.left = instance.x + 'px'; element.style.top = instance.y + 'px'; }
    if (ready && state.settings.texture === 'liquid') syncMaterials();
  }
  function applySettings() {
    document.body.classList.toggle('linen', state.settings.texture === 'linen');
    document.body.classList.toggle('reduced-motion', reducedMotion());
    document.body.classList.toggle('leopard', state.settings.texture === 'leopard');
    document.body.classList.toggle('liquid', state.settings.texture === 'liquid');
    document.documentElement.dataset.theme = state.settings.texture === 'liquid' ? 'liquid' : 'leopard';
    canvas.style.transform = `scale(${state.settings.scale})`;
    state.widgets.forEach(instance => { mounted.get(instance.id)?.themeChange?.(); position(instance); });
    document.querySelectorAll('iframe').forEach(frame => frame.contentWindow?.postMessage({ type: 'dashboard-appearance', theme: document.documentElement.dataset.theme, reducedMotion: reducedMotion() }, '*'));
    if (shelf) renderCatalog();
    syncMaterials(400);
  }
  function setTheme(texture) {
    const oldTheme = state.settings.texture === 'liquid' ? 'liquid' : 'classic';
    const newTheme = texture === 'liquid' ? 'liquid' : 'classic';
    if (oldTheme !== newTheme) {
      const placed = [];
      for (const instance of state.widgets) {
        instance.layouts ??= {};
        instance.layouts[oldTheme] = { x: instance.x, y: instance.y, width: instance.width, height: instance.height };
        const saved = instance.layouts[newTheme];
        const def = definition(instance.type);
        const dimensions = newTheme === 'liquid' ? modernSizes[instance.type] : [def.width, def.height];
        if (saved) Object.assign(instance, saved);
        else if (dimensions) {
          [instance.width, instance.height] = dimensions;
          const collision = () => placed.some(other => instance.x < other.x + other.width + 16 && instance.x + instance.width + 16 > other.x && instance.y < other.y + other.height + 16 && instance.y + instance.height + 16 > other.y);
          if (collision()) {
            const candidates = [];
            for (let y = 72; y < (innerHeight - 100) / state.settings.scale - instance.height; y += 186) for (let x = 32; x < innerWidth / state.settings.scale - instance.width - 16; x += 186) candidates.push({ x, y, distance: Math.hypot(x-instance.x,y-instance.y) });
            for (const candidate of candidates.sort((a,b) => a.distance-b.distance)) { instance.x = candidate.x; instance.y = candidate.y; if (!collision()) break; }
          }
        }
        placed.push(instance);
        const ctx = mounted.get(instance.id);
        if (ctx) { ctx.root.style.width = instance.width + 'px'; ctx.root.style.height = instance.height + 'px'; }
      }
    }
    state.settings.texture = ['leopard', 'liquid', 'rubber', 'linen'].includes(texture) ? texture : 'leopard';
    applySettings(); save();
    native('appearance', { texture: state.settings.texture }).catch(error => toast(error.message));
    animate(canvas, [{ opacity: .55 }, { opacity: 1 }], { duration: 360 });
  }
  function definition(type) { return Widgets.definitions.get(type) || state.custom.find(widget => widget.id === type); }
  function updateEditingControls() {
    const visible = document.body.classList.contains('editing') || document.body.classList.contains('alt-held');
    document.querySelectorAll('.widget-close').forEach(button => { button.setAttribute('aria-hidden', !visible); button.tabIndex = visible ? 0 : -1; });
    document.getElementById('remove').setAttribute('aria-pressed', editing);
  }
  function defaultLayout() {
    const width = innerWidth, height = innerHeight; const cx = width / 2, cy = height * .43;
    return [['weather', cx - 118, cy - 178], ['clock', cx + 220, cy - 114], ['calendar', cx - 4, cy + 77], ['calculator', cx - 304, cy - 5]].map(([type, x, y]) => makeInstance(type, x, y));
  }
  function makeInstance(type, x, y) { const def = definition(type), size = state.settings.texture === 'liquid' ? modernSizes[type] : null; return { id: crypto.randomUUID(), type, x, y, width: size?.[0] || def.width, height: size?.[1] || def.height, prefs: structuredClone(def.defaults || {}), data: null }; }
  function add(type, x, y) {
    const def = definition(type); if (!def) return;
    const size = bounds(); const offset = state.widgets.length % 5 * 24;
    const dimensions = state.settings.texture === 'liquid' ? modernSizes[type] : null;
    const instance = makeInstance(type, x ?? (size.width - (dimensions?.[0] || def.width)) / 2 + offset, y ?? (size.height - (dimensions?.[1] || def.height)) / 2 + offset);
    state.widgets.push(instance); mount(instance, true); position(instance); save(); return instance;
  }
  function ripple(instance) {
    if (reducedMotion()) return;
    const scale = state.settings.scale || 1;
    for (const second of [false, true]) { const element = document.createElement('div'); element.className = 'ripple' + (second ? ' second' : ''); Object.assign(element.style, { left: (instance.x - 15) * scale + 'px', top: (instance.y - 12) * scale + 'px', width: (instance.width + 30) * scale + 'px', height: (instance.height + 24) * scale + 'px' }); document.getElementById('effects').append(element); setTimeout(() => element.remove(), 1100); }
  }
  function dispose(id) { const ctx = mounted.get(id); if (!ctx) return; ctx.sizeAnimation?.cancel(); ctx.cleanups.forEach(clean => clean()); ctx.root.remove(); mounted.delete(id); syncMaterials(); }
  function remove(id) {
    const ctx = mounted.get(id); if (!ctx) return; ctx.root.classList.add('removing'); syncMaterials(360); state.widgets = state.widgets.filter(instance => instance.id !== id); save();
    setTimeout(() => dispose(id), 360);
  }
  function rerender(instance) { dispose(instance.id); mount(instance); }
  function mount(instance, animate = false) {
    const def = definition(instance.type); if (!def) return;
    instance.prefs = { ...(def.defaults || {}), ...(instance.prefs || {}) };
    const root = document.createElement('article'); root.className = 'widget' + (def.html ? ' custom-widget' : '') + (animate ? ' entering' : ''); root.tabIndex = 0; root.setAttribute('aria-label', def.name + ' widget'); root.dataset.id = instance.id; root.dataset.type = instance.type;
    Object.assign(root.style, { width: instance.width + 'px', height: instance.height + 'px', zIndex: ++z });
    root.innerHTML = `<button class="widget-close" aria-label="Remove ${e(def.name)}">${Icons.symbol('close')}</button><div class="widget-flipper"><div class="widget-front"><div class="widget-content"></div>${def.html ? '<div class="custom-handle" title="Drag widget"></div>' : ''}<button class="widget-info" aria-label="${e(def.name)} settings">${Icons.symbol('info')}</button></div><div class="widget-back" inert></div></div><span class="widget-name">${e(def.name)}</span>`;
    canvas.append(root);
    const ctx = { root, instance, el: root.querySelector('.widget-content'), prefs: instance.prefs, cleanups: [], save, alive: () => mounted.get(instance.id) === ctx && root.isConnected,
      interval(fn, delay) { let last = Date.now(); const run = () => { if (!document.hidden && ctx.alive()) { last = Date.now(); fn(); } }; const id = setInterval(run, delay); ctx.cleanups.push(() => clearInterval(id)); ctx.on(document, 'dashboarddidshow', () => { if (Date.now() - last >= delay) run(); }); },
      on(target, event, fn) { target.addEventListener(event, fn); ctx.cleanups.push(() => target.removeEventListener(event, fn)); },
      onTheme(fn) { ctx.themeChange = fn; },
      resize(width, height, animated = false) {
        const style = getComputedStyle(root), from = { width: style.width, height: style.height, left: style.left, top: style.top };
        ctx.sizeAnimation?.cancel();
        instance.width = width; instance.height = height;
        root.style.width = (root.classList.contains('flipped') ? Math.max(205,width) : width) + 'px'; root.style.height = (root.classList.contains('flipped') ? Math.max(205,height) : height) + 'px'; position(instance);
        if (animated) ctx.sizeAnimation = Dashboard.animate(root, [from, { width: root.style.width, height: root.style.height, left: root.style.left, top: root.style.top }], { duration: 340 });
        syncMaterials(animated ? 400 : 0); save();
      },
      flip: () => flip(ctx)
    };
    mounted.set(instance.id, ctx);
    updateEditingControls();
    position(instance);
    root.querySelector('.widget-close').onclick = () => remove(instance.id);
    root.querySelector('.widget-info').onclick = () => flip(ctx);
    if (def.html) renderCustom(ctx, def); else { try { def.render(ctx); } catch (error) { ctx.el.innerHTML = `<div class="service-error">${e(error.message)}</div>`; } }
    root.addEventListener('pointerdown', event => { root.style.zIndex = ++z; if (event.target.closest('[data-drag-toggle]') || !event.target.closest('input,textarea,select,button,a,iframe,[contenteditable],.widget-back,[data-no-drag]')) beginDrag(event, ctx); });
    root.addEventListener('click', event => { if (performance.now() < (ctx.ignoreClickUntil || 0)) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
    root.addEventListener('keydown', event => {
      if (event.target !== root) return;
      if (event.metaKey && event.key.toLowerCase() === 'r') { event.preventDefault(); refresh(instance); }
      else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); remove(instance.id); }
      else if (event.key === 'Enter') { event.preventDefault(); flip(ctx); }
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); const step = event.shiftKey ? 20 : 5; instance.x += event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0; instance.y += event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0; position(instance); save(); }
    });
    if (animate) { ripple(instance); setTimeout(() => root.classList.remove('entering'), 600); }
    syncMaterials(650);
  }
  function beginDrag(event, ctx) {
    if (event.button !== 0 || ctx.root.classList.contains('flipped')) return;
    const start = { x: event.clientX, y: event.clientY, left: ctx.instance.x, top: ctx.instance.y }; let moved = false;
    (event.target.closest('[data-drag-toggle]') || ctx.root).setPointerCapture(event.pointerId);
    const move = event => { if (!moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 3) return; moved = true; ctx.root.classList.add('dragging'); ctx.instance.x = start.left + (event.clientX - start.x) / state.settings.scale; ctx.instance.y = start.top + (event.clientY - start.y) / state.settings.scale; position(ctx.instance); };
    const end = () => { ctx.root.classList.remove('dragging'); ctx.root.removeEventListener('pointermove', move); ctx.root.removeEventListener('pointerup', end); ctx.root.removeEventListener('pointercancel', end); syncMaterials(250); if (moved) { ctx.ignoreClickUntil = performance.now() + 250; save(); } };
    ctx.root.addEventListener('pointermove', move); ctx.root.addEventListener('pointerup', end); ctx.root.addEventListener('pointercancel', end);
  }
  function refresh(instance) { rerender(instance); const root = mounted.get(instance.id)?.root; root?.classList.add('refreshing'); setTimeout(() => root?.classList.remove('refreshing'), 700); }
  function flip(ctx) {
    const root = ctx.root, back = root.querySelector('.widget-back'), front = root.querySelector('.widget-front'), def = definition(ctx.instance.type);
    if (root.classList.contains('flipped')) { back.querySelector('.done')?.click(); return; }
    ctx.sizeAnimation?.cancel();
    const originalHeight = ctx.instance.height, originalWidth = ctx.instance.width; let resolvedCity = ctx.prefs.city;
    root.style.width = Math.max(originalWidth, 205) + 'px';
    root.style.height = Math.max(originalHeight, def.html ? 220 : 205) + 'px';
    back.innerHTML = `<h2>${e(def.name)}</h2>${def.html ? '<p>Drag the top edge to move this widget. Its state is saved with your dashboard.</p><button class="silver-button export-widget">Export Widget…</button><button class="silver-button edit-widget">Remix with AI…</button>' : def.settings?.(ctx.prefs) || '<p>No settings for this widget.</p>'}<button class="silver-button done">Done</button>`;
    front.inert = true; back.inert = false; root.classList.add('flipped');
    syncMaterials(650);
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
      if (back.querySelector('.find-city') && cityInput && cityInput.value !== resolvedCity) { back.querySelector('.location-results').textContent = 'Click Find City and choose the matching location first.'; return; }
      back.querySelectorAll('[data-setting]').forEach(element => ctx.prefs[element.dataset.setting] = element.type === 'checkbox' ? element.checked : element.value);
      root.classList.remove('flipped'); front.inert = false; back.inert = true; root.style.height = originalHeight + 'px'; root.style.width = originalWidth + 'px';
      syncMaterials(650);
      save(); setTimeout(() => { if (ctx.alive()) { rerender(ctx.instance); mounted.get(ctx.instance.id)?.root.focus({ preventScroll: true }); } }, reducedMotion() ? 0 : 610);
    }
  }
  function isolatedHTML(html, data) {
    const encoded = JSON.stringify(data ?? null).replace(/</g, '\\u003c');
    const bootstrap = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; media-src 'none'; form-action 'none'; base-uri 'none'"><style>
      html.dashboard-liquid body{color:#ffffff!important;background:transparent!important;font-family:-apple-system,BlinkMacSystemFont,sans-serif!important}
      html.dashboard-liquid body *:not(svg):not(svg *){font-family:inherit!important;text-shadow:none!important;box-shadow:none!important;background-image:none!important;border-color:#53657d30!important}
      html.dashboard-liquid body :is(div,main,section,article,header,footer,span,p,label,output,h1,h2,h3){background-color:transparent!important;color:inherit!important}
      html.dashboard-liquid body :is(button,input,select,textarea){background:#fff9!important;color:#172235!important;border:1px solid #64748b30!important;border-radius:12px!important}
      html.dashboard-liquid body button{font-weight:600!important;cursor:pointer}
      html.dashboard-liquid body button:active{background:#cadfff!important}
      html.dashboard-reduced *,html.dashboard-reduced *::before,html.dashboard-reduced *::after{animation:none!important;transition:none!important}
    </style><script>window.dashboardState=${encoded};window.saveDashboardState=function(value){try{var text=JSON.stringify(value);if(text.length<200000)parent.postMessage({type:'dashboard-state',value:JSON.parse(text)},'*')}catch(e){}};
      function appearance(value){window.dashboardTheme=value.theme;document.documentElement.classList.toggle('dashboard-liquid',value.theme==='liquid');document.documentElement.classList.toggle('dashboard-reduced',value.reducedMotion);window.dispatchEvent(new CustomEvent('dashboardthemechange',{detail:value}));}
      appearance({theme:'${state.settings.texture === 'liquid' ? 'liquid' : 'leopard'}',reducedMotion:${reducedMotion()}});addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='dashboard-appearance')appearance(event.data)});<\/script>`;
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, match => match + bootstrap);
    return bootstrap + html;
  }
  function renderCustom(ctx, def) {
    const frame = document.createElement('iframe'); frame.className = 'custom-frame'; frame.setAttribute('sandbox', 'allow-scripts'); frame.setAttribute('referrerpolicy', 'no-referrer'); frame.title = def.name; frame.srcdoc = isolatedHTML(def.html, ctx.instance.data); ctx.el.append(frame);
    ctx.on(window, 'message', event => { if (event.source !== frame.contentWindow || event.data?.type !== 'dashboard-state') return; try { const encoded = JSON.stringify(event.data.value); if (encoded.length > 200000) return; ctx.instance.data = JSON.parse(encoded); save(); } catch {} });
  }
  function toggleShelf(value = !shelf) {
    shelf = value; shelfAnimation?.cancel();
    const element = document.getElementById('shelf');
    document.body.classList.toggle('shelf-open', shelf); document.getElementById('manage').hidden = !shelf;
    document.getElementById('add').innerHTML = Icons.symbol(shelf ? 'close' : 'plus');
    document.getElementById('add').setAttribute('aria-expanded', shelf); editing = shelf; document.body.classList.toggle('editing', editing);
    updateEditingControls();
    if (shelf) { element.hidden = false; element.inert = false; renderCatalog(); shelfAnimation = animate(element, [{ transform: 'translateY(110%)', opacity: .2 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 360 }); }
    else { element.inert = true; shelfAnimation = animate(element, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(110%)', opacity: 0 }], { duration: 220 }); if (shelfAnimation) shelfAnimation.finished.then(() => { if (!shelf) element.hidden = true; }).catch(() => {}); else element.hidden = true; }
    syncMaterials(400);
  }
  function dragNewWidget(event, def, place) {
    if (event.button !== 0) return;
    const dimensions = state.settings.texture === 'liquid' ? modernSizes[def.id] : null;
    const width = dimensions?.[0] || def.width, height = dimensions?.[1] || def.height;
    const source = event.currentTarget, startX = event.clientX, startY = event.clientY;
    let moved = false, ghost = null;
    source.setPointerCapture(event.pointerId);
    const move = event => {
      if (!moved && Math.hypot(event.clientX - startX, event.clientY - startY) < 5) return;
      if (!moved) {
        moved = true; document.body.classList.add('dragging-new'); document.getElementById('dashboard').inert = false;
        syncMaterials();
        ghost = document.createElement('div'); ghost.className = 'new-widget-ghost';
        ghost.style.width = width * state.settings.scale + 'px'; ghost.style.height = height * state.settings.scale + 'px';
        if (def.html) { const frame = document.createElement('iframe'); frame.sandbox = 'allow-scripts'; frame.srcdoc = isolatedHTML(def.html, null); frame.style.cssText = `border:0;width:${def.width}px;height:${def.height}px;transform:scale(${state.settings.scale});transform-origin:top left`; ghost.append(frame); }
        else { ghost.innerHTML = `<div class="new-widget-icon">${state.settings.texture === 'liquid' ? Icons.catalog(def.id) : typeof def.icon === 'function' ? def.icon() : def.icon}<span>${e(def.name)}</span></div>`; }
        document.body.append(ghost);
      }
      ghost.style.left = event.clientX - width * state.settings.scale / 2 + 'px'; ghost.style.top = event.clientY - height * state.settings.scale / 2 + 'px';
    };
    const end = event => {
      source.removeEventListener('pointermove', move); source.removeEventListener('pointerup', end); source.removeEventListener('pointercancel', end);
      ghost?.remove(); document.body.classList.remove('dragging-new');
      if (moved) {
        source.dataset.suppressClick = 'true'; setTimeout(() => delete source.dataset.suppressClick, 100);
        if (event.type === 'pointerup' && event.clientY < innerHeight - (shelf ? 204 : 0)) place(event.clientX / state.settings.scale - width / 2, event.clientY / state.settings.scale - height / 2);
      }
      if (!modalLayer.hidden) document.getElementById('dashboard').inert = true;
      syncMaterials(300);
    };
    source.addEventListener('pointermove', move); source.addEventListener('pointerup', end); source.addEventListener('pointercancel', end);
  }
  function renderCatalog() {
    const query = document.getElementById('widget-search').value.toLowerCase();
    const defs = [...Widgets.definitions.values(), ...state.custom].filter(def => def.name.toLowerCase().includes(query) && !state.settings.disabled.includes(def.id));
    const catalog = document.getElementById('catalog'); catalog.innerHTML = defs.map(def => `<div role="listitem"><button class="catalog-item" data-type="${e(def.id)}" aria-label="Add ${e(def.name)}"><span class="catalog-icon">${state.settings.texture === 'liquid' ? Icons.catalog(def.id) : typeof def.icon === 'function' ? def.icon() : def.icon || Widgets.box('✦')}</span><span class="catalog-label">${e(def.name)}</span></button></div>`).join('') || '<div class="catalog-empty">No widgets found.</div>';
    catalog.querySelectorAll('[data-type]').forEach(button => {
      button.onclick = () => { if (!button.dataset.suppressClick) add(button.dataset.type); };
      button.onpointerdown = event => dragNewWidget(event, definition(button.dataset.type), (x, y) => add(button.dataset.type, x, y));
    });
  }
  function openModal(title, body, className = '', footer = '') {
    modalAnimation?.cancel();
    if (modalLayer.hidden) lastFocus = document.activeElement;
    modalLayer.hidden = false; modalLayer.innerHTML = `<section role="dialog" aria-modal="true" aria-labelledby="dialog-title" class="dialog ${className}"><div class="dialog-titlebar"><h1 id="dialog-title">${e(title)}</h1><button class="dialog-close" aria-label="Close dialog">${Icons.symbol('close')}</button></div><div class="dialog-body">${body}</div>${footer ? `<div class="dialog-footer">${footer}</div>` : ''}</section>`;
    modalLayer.querySelector('.dialog-close').onclick = closeModal;
    document.getElementById('dashboard').inert = true;
    document.querySelectorAll('#controls,#right-controls,#shelf').forEach(element => element.inert = true);
    modalAnimation = animate(modalLayer.querySelector('.dialog'), [{ opacity: 0, transform: 'translateY(14px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 320 });
    syncMaterials(350);
    setTimeout(() => modalLayer.querySelector('textarea,input,select,button')?.focus(), 100);
  }
  function closeModal() {
    if (generation) { toast('Generation is still running. Use Cancel to stop it.'); return; }
    modalAnimation?.cancel();
    modalLayer.hidden = true; modalLayer.innerHTML = ''; document.getElementById('dashboard').inert = false; document.body.classList.remove('dragging-new'); currentPreview = null;
    document.querySelectorAll('#controls,#right-controls,#shelf').forEach(element => element.inert = false);
    lastFocus?.focus({ preventScroll: true }); syncMaterials(350);
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
    openModal('Create a Widget', `<div class="studio-layout"><div class="studio-form"><p>A little tool, made just for you. Describe your widget and give it a place on your Dashboard.</p>${providerFields()}<label for="widget-prompt">What would you like to make?<textarea id="widget-prompt" maxlength="12000" placeholder="${state.settings.texture === 'liquid' ? 'A kitchen timer with a glass dial and a soft chime when it finishes…' : 'A brass kitchen timer with a winding dial and a bell when it finishes…'}">${e(prompt)}</textarea></label><div class="studio-actions"><button id="generate" class="aqua-button">Create Widget</button><button id="cancel-generation" class="silver-button" hidden>Cancel</button></div><div id="generation-status" class="studio-progress" role="status" hidden></div><div id="generation-error" class="studio-error" role="alert" hidden></div></div><div class="studio-preview" id="preview"><div class="preview-empty">${Widgets.svg('<rect x="8" y="9" width="48" height="46" rx="9" stroke="#ccc" stroke-width="2"/><path d="M23 32h18M32 23v18" stroke="#ccc" stroke-width="2"/>')}Your widget will appear here.<br>Try it, then add it to your Dashboard.</div></div></div>`, '', '<span>Saved on this Mac. Claude Code and Codex use your account’s service; LM Studio can run locally.</span><button id="studio-import" class="silver-button">Import…</button>');
    wireProvider(); document.getElementById('studio-import').onclick = () => native('import').catch(error => toast(error.message));
    document.getElementById('generate').onclick = generateWidget;
    document.getElementById('cancel-generation').onclick = () => native('cancel').catch(error => toast(error.message));
  }
  async function generateWidget() {
    const prompt = document.getElementById('widget-prompt').value.trim(); if (!prompt) { document.getElementById('widget-prompt').focus(); return; }
    const button = document.getElementById('generate'), cancel = document.getElementById('cancel-generation'), status = document.getElementById('generation-status'), error = document.getElementById('generation-error');
    generation = true; button.disabled = true; cancel.hidden = false; status.hidden = false; error.hidden = true;
    const start = Date.now(); const timer = setInterval(() => status.innerHTML = `<span class="spinner"></span>Making your widget… ${Math.round((Date.now() - start) / 1000)}s`, 1000); status.innerHTML = '<span class="spinner"></span>Making your widget…';
    try { const manifest = await native('generate', { prompt, theme: state.settings.texture === 'liquid' ? 'liquid' : 'leopard', ...aiSettings() }); if (!validManifest(manifest)) throw new Error('The model returned an invalid widget. Try again.'); currentPreview = manifest; showPreview(manifest); status.innerHTML = 'Your widget is ready. Try it in the preview.'; syncMaterials(300); }
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
    openModal('Dashboard Settings', `<div class="settings-form"><h2>Appearance</h2><div class="theme-picker" role="radiogroup" aria-label="Theme"><button type="button" class="theme-choice" role="radio" data-theme-choice="leopard"><strong>Leopard</strong></button><button type="button" class="theme-choice" role="radio" data-theme-choice="liquid"><strong>macOS 27 · Liquid Glass</strong></button></div><label id="classic-background">Classic background<select id="texture">${[['leopard', 'Leopard — your desktop'], ['rubber', 'Lion — dark rubber'], ['linen', 'Gray linen']].map(([id, label]) => Widgets.option(id, state.settings.texture, label)).join('')}</select></label><label>Widget size<select id="scale">${[['0.85', 'Small (85%)'], ['1', 'Original (100%)'], ['1.2', 'Large (120%)'], ['1.4', 'Extra Large (140%)']].map(([id, label]) => Widgets.option(id, String(state.settings.scale), label)).join('')}</select></label><label class="checkbox"><input id="reduce-motion" type="checkbox" ${state.settings.reducedMotion ? 'checked' : ''}>Reduce animation</label><hr><h2>Desktop & Spaces</h2><div class="setting-row"><button id="mode-space" class="silver-button">Use as a Space</button><button id="mode-overlay" class="silver-button">Use as an Overlay</button></div><button id="pin-space" class="silver-button">Pin Dashboard to the Left</button><p id="space-status">⌃⌥D opens Dashboard from any Space. Esc returns to your previous app.</p><label class="checkbox"><input id="login" type="checkbox">Open Dashboard at login</label><hr><h2>Widget creation</h2>${providerFields()}<label>LM Studio server<input id="lm-endpoint" type="text" value="${e(state.settings.endpoint)}"></label><p>Start the local server and load a model in LM Studio to use it here.</p><hr><button id="data-folder" class="silver-button">Show Saved Dashboard…</button></div>`, 'settings-dialog');
    wireProvider();
    const themeButtons = [...document.querySelectorAll('[data-theme-choice]')];
    const updateThemePicker = () => {
      themeButtons.forEach(button => { const selected = button.dataset.themeChoice === (state.settings.texture === 'liquid' ? 'liquid' : 'leopard'); button.setAttribute('aria-checked', selected); button.tabIndex = selected ? 0 : -1; });
      document.getElementById('classic-background').hidden = state.settings.texture === 'liquid';
    };
    themeButtons.forEach(button => {
      button.onclick = () => { setTheme(button.dataset.themeChoice); updateThemePicker(); };
      button.onkeydown = event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); const next = themeButtons.find(candidate => candidate !== button); next.click(); next.focus(); } };
    }); updateThemePicker();
    document.getElementById('texture').onchange = event => { setTheme(event.target.value); updateThemePicker(); };
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
    try { Icons.configure(await native('symbols')); setEnvironment(await native('environment')); } catch {}
    ready = true; updateActivity(); if (state.settings.texture === 'liquid' && state.settings.widgetLayoutVersion !== 2) { state.settings.texture = 'leopard'; setTheme('liquid'); } state.settings.widgetLayoutVersion = 2; applySettings(); state.widgets.forEach(instance => mount(instance)); native('appearance', { texture: state.settings.texture }).catch(() => {});
    for (const [id, icon] of [['add', 'plus'], ['remove', 'minus'], ['settings-button', 'settings'], ['exit', 'arrow']]) document.getElementById(id).innerHTML = Icons.symbol(icon);
    document.querySelector('.studio-spark').innerHTML = Icons.symbol('spark');
    document.getElementById('add').onclick = () => toggleShelf();
    document.getElementById('remove').onclick = () => { editing = !editing; document.body.classList.toggle('editing', editing); updateEditingControls(); };
    document.getElementById('manage').onclick = manageWidgets;
    document.getElementById('studio-button').onclick = () => openStudio();
    document.getElementById('settings-button').onclick = openSettings;
    document.getElementById('exit').onclick = () => { flushSave(); native('dismiss').catch(error => toast(error.message)); };
    document.getElementById('dashboard').addEventListener('click', event => { if (document.body.classList.contains('overlay-mode') && !shelf && !editing && (event.target === canvas || event.target.id === 'dashboard')) { flushSave(); native('dismiss').catch(error => toast(error.message)); } });
    document.getElementById('widget-search').oninput = renderCatalog;
    document.getElementById('import-button').onclick = () => native('import').catch(error => toast(error.message));
    window.addEventListener('resize', () => { state.widgets.forEach(position); save(); syncMaterials(350); });
    new ResizeObserver(() => syncMaterials(350)).observe(modalLayer);
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', applySettings);
    window.addEventListener('blur', () => { document.body.classList.remove('alt-held'); updateEditingControls(); updateActivity(); flushSave(); });
    window.addEventListener('focus', updateActivity);
    document.addEventListener('visibilitychange', updateActivity);
    document.addEventListener('keydown', event => {
      document.body.classList.toggle('alt-held', event.altKey);
      updateEditingControls();
      if (event.key === 'Escape') { event.preventDefault(); if (!modalLayer.hidden) closeModal(); else if (shelf) toggleShelf(false); else if (editing) { editing = false; document.body.classList.remove('editing'); updateEditingControls(); } else { flushSave(); native('dismiss').catch(error => toast(error.message)); } }
      if (event.metaKey && ['+', '='].includes(event.key)) { event.preventDefault(); toggleShelf(); }
      if (event.metaKey && event.key === 'n') { event.preventDefault(); openStudio(); }
      if (event.key === 'Tab' && !modalLayer.hidden) { const focusable = [...modalLayer.querySelectorAll('button,input,select,textarea,[tabindex]')].filter(el => !el.disabled && el.getClientRects().length); const first = focusable[0], last = focusable.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
    });
    document.addEventListener('keyup', event => { document.body.classList.toggle('alt-held', event.altKey); updateEditingControls(); });
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
    const widget = type => mounted.get(state.widgets.find(w => w.type === type).id);
    const settle = () => new Promise(resolve => setTimeout(resolve, 420));
    const clock = widget('clock'); clock.flip(); await settle();
    const cities = clock.root.querySelector('[data-setting="city"]');
    assert('World Clock offers system time-zone cities',cities.options.length > 100); cities.value='Tokyo';
    clock.root.querySelector('.done').click(); await new Promise(resolve=>setTimeout(resolve,680));
    assert('World Clock saves a new city without weather geocoding',widget('clock').prefs.city === 'Tokyo' && widget('clock').el.querySelector('.clock-label').textContent === 'Tokyo');
    const calendar = widget('calendar');
    calendar.el.querySelector('.date-page').click(); await settle();
    assert('calendar collapses to a square and hides month controls', calendar.instance.width === 141 && calendar.instance.height === 141 && calendar.el.querySelector('.month-page').inert);
    calendar.flip(); await new Promise(resolve=>setTimeout(resolve,650));
    assert('collapsed widget settings have usable dimensions', parseFloat(getComputedStyle(calendar.root).width) >= 205 && parseFloat(getComputedStyle(calendar.root).height) >= 205);
    calendar.root.querySelector('.done').click(); await new Promise(resolve=>setTimeout(resolve,680));
    assert('calendar collapse survives settings flip', widget('calendar').instance.width === 141 && widget('calendar').prefs.expanded === false);
    widget('calendar').el.querySelector('.date-page').click(); await settle();
    widget('calendar').el.querySelector('[data-month="1"]').click(); widget('calendar').el.querySelector('[data-day="15"]').click();
    assert('calendar selection updates date tile', widget('calendar').el.querySelector('.date-number').textContent === '15');
    widget('calendar').el.querySelector('.month-title').click();
    assert('calendar month heading returns to today', widget('calendar').prefs.selectedDate[2] === new Date().getDate() && widget('calendar').prefs.month === new Date().getMonth());
    for (let i=0;i<4;i++) widget('calendar').el.querySelector('.date-page').click(); await settle();
    assert('rapid calendar toggles settle at expanded width', Math.abs(widget('calendar').root.getBoundingClientRect().width / state.settings.scale - 300) < 1);
    const weather = widget('weather'), weatherToggle = weather.el.querySelector('.weather-top');
    if (!weatherToggle) throw new Error('Weather unavailable during interaction verification');
    weatherToggle.click(); await settle();
    assert('weather forecast collapses', weather.instance.height === 90 && weather.prefs.expanded === false);
    weather.el.querySelector('.weather-top').dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true})); await settle();
    assert('weather forecast expands with keyboard', weather.instance.height === 150 && weather.prefs.expanded === true);
    calcRoot.dispatchEvent(new KeyboardEvent('keydown',{key:'c',metaKey:true,bubbles:true}));
    assert('Command-C does not clear calculator',calcRoot.querySelector('output').textContent === '56');
    const copied = new DataTransfer(); calcRoot.dispatchEvent(new ClipboardEvent('copy',{clipboardData:copied,bubbles:true,cancelable:true}));
    assert('calculator copies displayed number',copied.getData('text/plain') === '56');
    const pasted = new DataTransfer(); pasted.setData('text/plain','123.5'); calcRoot.dispatchEvent(new ClipboardEvent('paste',{clipboardData:pasted,bubbles:true,cancelable:true}));
    assert('calculator pastes numbers',calcRoot.querySelector('output').textContent === '123.5');
    for (const key of ['c','7','×','8','=']) calcRoot.querySelector(`[data-key="${key}"]`).click();
    const converter = widget('converter'); converter.prefs.category='Temperature'; converter.prefs.from='Fahrenheit'; converter.prefs.to='Celsius'; rerender(converter.instance);
    const inverse = widget('converter').el.querySelector('.result'); inverse.value='100'; inverse.dispatchEvent(new Event('input'));
    assert('unit converter supports reverse input with temperature offsets',Number(widget('converter').prefs.value) === 212);
    const currency = widget('currency'); currency.prefs.from='USD'; currency.prefs.to='USD'; rerender(currency.instance); await settle();
    const currencyResult = widget('currency').el.querySelector('.result'); currencyResult.value='37.5'; currencyResult.dispatchEvent(new Event('input'));
    assert('currency converter supports reverse input',Number(widget('currency').prefs.amount) === 37.5);
    const stock = widget('stocks'); stock.el.querySelector('[data-index="0"]').click(); await settle();
    assert('Stocks selected row collapses chart',stock.prefs.expanded === false && stock.el.querySelector('.stock-detail').inert);
    stock.el.querySelector('[data-index="1"]').click(); await settle();
    assert('Stocks selecting another row expands its chart',stock.prefs.expanded === true && stock.prefs.selected === 1);
    stock.el.querySelector('.stock-change').click(); assert('Stocks change badge switches units',stock.prefs.changeMode === 'Points');
    const dict = widget('dictionary'), sources = await native('dictionaries');
    assert('installed dictionary source enumeration has fallback',Array.isArray(sources) && sources.some(source=>source.id === ''));
    const dictInput = dict.el.querySelector('input'); dictInput.value='dashboard'; dict.el.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));
    for (let i=0;i<30 && !dict.prefs.result;i++) await new Promise(resolve=>setTimeout(resolve,100));
    assert('Dictionary expands for live native lookup',dict.instance.height === 245 && dict.prefs.result?.length > 30);
    await settle(); dict.root.style.zIndex=++z;
    const gripRect=dict.el.querySelector('.widget-resize').getBoundingClientRect();
    assert('resize handle receives pointer events without info-button overlap',document.elementFromPoint(gripRect.x+gripRect.width/2,gripRect.y+gripRect.height/2)?.closest('.widget-resize') === dict.el.querySelector('.widget-resize'));
    dict.el.querySelector('.widget-resize').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
    assert('Dictionary keyboard resize persists dimensions',dict.prefs.resultSize?.height === 255);
    dictInput.value=''; dictInput.dispatchEvent(new Event('input')); await settle();
    assert('Dictionary clears and collapses',dict.instance.height === 37 && dict.prefs.result === '');
    const translation = widget('translation'); Object.assign(translation.prefs,{from:'English',to:'French',text:'Hello',result:'Bonjour'}); rerender(translation.instance); widget('translation').el.querySelector('.swap').click();
    assert('translation reverses text and languages together',widget('translation').prefs.from === 'French' && widget('translation').prefs.text === 'Bonjour' && widget('translation').prefs.result === 'Hello');
    const clip = widget('webclip'), clipWidth = clip.instance.width; clip.el.querySelector('.widget-resize').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    assert('Web Clip resize persists',clip.instance.width === clipWidth + 10 && clip.prefs.size.width === clipWidth + 10);
    // Exercise permission-gated UI with explicit fixtures, without requesting the user's library or contacts.
    const actualNative = Dashboard.native, musicCalls = [];
    try {
      Dashboard.native = async (action,data) => {
        if(action === 'contacts') return [{name:'Example Person',email:'example@example.com',phone:'555-0100'}];
        if(action === 'musicPlaylists') return [{id:'0000000000000001',name:'Example playlist'}];
        if(action === 'music') { musicCalls.push(data); return {state:'playing',title:'Example song',artist:'Example artist',volume:String(data.volume ?? 40)}; }
        return actualNative(action,data);
      };
      const address = widget('contacts'); address.el.querySelector('input').value='Example'; address.el.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true})); await settle();
      address.el.querySelector('.contact-choice').click();
      assert('Address Book opens a selected contact card',address.el.querySelector('.contact-result').textContent.includes('example@example.com'));
      address.el.querySelector('.contact-back').click(); assert('Address Book returns to result list',!!address.el.querySelector('.contact-choice'));
      address.el.querySelector('input').value=''; address.el.querySelector('input').dispatchEvent(new Event('input')); await settle();
      assert('Address Book clears and collapses',address.instance.height === 79 && address.el.querySelector('.contact-results').hidden);
      const music = widget('music'); music.el.querySelector('.menu').click(); await settle();
      assert('Music MENU opens playlists',music.el.querySelector('[data-playlist]').textContent === 'Example playlist');
      music.el.querySelector('[data-playlist]').click(); await settle();
      assert('Music plays selected playlist and reflects pause state',musicCalls.at(-1).playlist === '0000000000000001' && music.el.querySelector('.play').getAttribute('aria-label') === 'Pause' && music.el.querySelector('.play svg path'));
      const volume=music.el.querySelector('.music-volume'); volume.value='65'; volume.dispatchEvent(new Event('change')); await settle();
      assert('Music volume slider dispatches bounded volume',musicCalls.at(-1).command === 'volume' && musicCalls.at(-1).volume === 65);
    } finally { Dashboard.native=actualNative; rerender(widget('music').instance); }
    const originalTheme = state.settings.texture;
    const idsBefore = [...mounted.keys()], framesBefore = [...document.querySelectorAll('.custom-frame')];
    setTheme('liquid');
    await new Promise(resolve => setTimeout(resolve, 450));
    assert('Liquid Glass theme covers every bundled widget', [...mounted.values()].filter(ctx => !definition(ctx.instance.type).html).every(ctx => parseFloat(getComputedStyle(ctx.el.firstElementChild).borderRadius) >= 17));
    assert('current Apple widget size families', state.widgets.find(widget => widget.type === 'weather').width === 348 && state.widgets.find(widget => widget.type === 'calendar').width === 348 && state.widgets.find(widget => widget.type === 'clock').height === 170);
    widget('calendar').el.querySelector('.date-page').click(); await settle();
    assert('modern calendar collapses to a square date tile',widget('calendar').instance.width === 170 && widget('calendar').instance.height === 170);
    setTheme('leopard'); assert('calendar collapse survives theme changes',widget('calendar').instance.width === 141 && widget('calendar').prefs.expanded === false);
    setTheme('liquid'); widget('calendar').el.querySelector('.date-page').click(); await settle();
    assert('theme switch retains widget instances and frames', idsBefore.every(id => mounted.has(id)) && framesBefore.every(frame => frame.isConnected));
    assert('calculator remains legible in Liquid Glass', getComputedStyle(calcRoot.querySelector('[data-key="7"]')).color === 'rgb(255, 255, 255)');
    for (const button of document.querySelectorAll('#controls .round-control,#right-controls .round-control')) {
      const a = button.getBoundingClientRect(), b = button.querySelector('svg').getBoundingClientRect();
      assert(`${button.id} icon is centered`, Math.abs(a.x + a.width / 2 - b.x - b.width / 2) < 1 && Math.abs(a.y + a.height / 2 - b.y - b.height / 2) < 1);
    }
    toggleShelf(true); await new Promise(resolve => setTimeout(resolve, 450));
    assert('modern shelf has a vector icon for every widget', document.querySelectorAll('.catalog-item .modern-icon svg').length === document.querySelectorAll('.catalog-item').length);
    await openSettings();
    assert('Liquid Glass is selectable in Settings', document.querySelector('[data-theme-choice="liquid"]').getAttribute('aria-checked') === 'true');
    assert('modal contains keyboard focus', document.getElementById('controls').inert && document.getElementById('dashboard').inert);
    document.querySelector('[data-theme-choice="leopard"]').click();
    assert('Leopard theme restores calculator material', !document.body.classList.contains('liquid') && getComputedStyle(calcRoot.querySelector('[data-key="7"]')).color === 'rgb(65, 74, 86)');
    assert('Leopard dimensions and calculator value survive theme changes', calcInstance.width === 158 && calcInstance.height === 226 && calcRoot.querySelector('output').textContent === '56');
    closeModal(); toggleShelf(false); setTheme('liquid');
    await flushSave(); assert('theme choice persists through native storage', (await native('load')).settings.texture === 'liquid');
    const actualEnvironment = { ...environment };
    setEnvironment({ safeTop: 32, notchLeft: 600, notchWidth: 200, reduceMotion: true, reduceTransparency: true, increaseContrast: true });
    const notchTest = add('stickies', 610, 0), sideTest = add('stickies', 50, 0);
    assert('only widgets intersecting camera housing are inset', notchTest.y >= 44 && sideTest.y === 18);
    assert('accessibility display preferences propagate', document.body.classList.contains('reduce-transparency') && document.body.classList.contains('increase-contrast') && reducedMotion());
    assert('reduced motion skips Web Animations', animate(calcRoot, [{ opacity: 0 }, { opacity: 1 }]) === null);
    remove(notchTest.id); remove(sideTest.id); setEnvironment(actualEnvironment); setTheme(originalTheme);
    return results;
  }
  const api = { native, aiSettings, toast, open, toggleShelf, openStudio, openSettings, previewImport, flushSave, runSmokeTests, add, remove, setEnvironment, setTheme, reducedMotion, animate, get ready() { return ready; }, get state() { return state; } };
  setTimeout(initialize, 0);
  return api;
})();
