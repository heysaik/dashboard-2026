'use strict';
const Icons = (() => {
  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    pause: '<path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" stroke="none"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    info: '<path d="M12 11v6"/><circle cx="12" cy="7" r=".8" fill="currentColor" stroke="none"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    left: '<path d="m14 6-6 6 6 6"/>',
    right: '<path d="m10 6 6 6-6 6"/>',
    swap: '<path d="M8 3v17m-4-4 4 4 4-4M16 21V4m-4 4 4-4 4 4"/>',
    spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
    settings: '<path d="m9.7 3-.6 2.2-2 .9-2-.6-2.1 3.6 1.5 1.6v2.6L3 14.9l2.1 3.6 2-.6 2 .9.6 2.2h4.6l.6-2.2 2-.9 2 .6 2.1-3.6-1.5-1.6v-2.6L21 9.1l-2.1-3.6-2 .6-2-.9-.6-2.2Z"/><circle cx="12" cy="12" r="3"/>',
    weather: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4m8-4v4m-9 7h3m4 0h3m-10 3h3"/>',
    calculator: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 6h8M8 11h1m6 0h1m-8 4h1m6 0h1m-8 4h1m6 0h1"/>',
    stickies: '<path d="M4 3h16v12l-6 6H4Z"/><path d="M14 21v-6h6M8 8h8m-8 4h5"/>',
    dictionary: '<path d="M12 6Q7 2 3 4v15q4-2 9 1 5-3 9-1V4q-4-2-9 2Zm0 0v14"/>',
    converter: '<path d="m3 15 12-12 6 6L9 21Z"/><path d="m11 7 3 3m-7 1 3 3"/>',
    currency: '<circle cx="12" cy="12" r="9"/><path d="M15 7H10a2.5 2.5 0 0 0 0 5h4a2.5 2.5 0 0 1 0 5H8m4-13v16"/>',
    stocks: '<path d="M3 19h18M4 15l5-6 4 3 7-8m-6 0h6v6"/>',
    translation: '<path d="M2 5h12M8 2v3m3 0c-1 6-4 9-9 11m2-8c1 3 3 6 7 8m2 5 4-12 4 12m-6.5-4h5"/>',
    contacts: '<rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="9" r="3"/><path d="M7 18c0-5 10-5 10 0M2 7h3m-3 5h3m-3 5h3"/>',
    tilegame: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18m6-18v12M3 9h18M3 15h12"/>',
    music: '<path d="M9 17V5l11-2v12M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',
    google: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    business: '<path d="M4 21V6h10v15M14 11h6v10M2 21h20M7 9h4m-4 4h4m-4 4h4m6-3h1m-1 3h1"/>',
    people: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M17 4a4 4 0 0 1 0 8m2 4c2 1 3 2 3 5"/>',
    flight: '<path d="m21 3-6 18-4-8-8-4Z"/><path d="m11 13 6-6"/>',
    sports: '<circle cx="12" cy="12" r="9"/><path d="m12 7 5 4-2 6H9l-2-6 5-4Zm0-4v4m9 4h-4M7 11H3m6 6-3 3m9-3 3 3"/>',
    ski: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3"/>',
    movies: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 3v18m10-18v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/>',
    webclip: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 9h20M6 6.5h.1M9 6.5h.1m-3 7h12m-12 3h8"/>',
    play: '<path d="m9 5 11 7-11 7Z"/>',
    previous: '<path d="M5 5v14m14-14L8 12l11 7Z"/>',
    next: '<path d="M19 5v14M5 5l11 7-11 7Z"/>'
  };
  let systemImages = {};
  const configure = images => { systemImages = images || {}; };
  const symbol = name => `<svg class="symbol${systemImages[name] ? ' has-system-symbol' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g class="drawn-symbol">${paths[name] || paths.spark}</g>${systemImages[name] ? `<image class="system-symbol" href="${systemImages[name]}" width="24" height="24"/>` : ''}</svg>`;
  const catalog = type => `<span class="modern-icon modern-${Core.escape(type)}">${symbol(type)}</span>`;
  return { symbol, catalog, configure };
})();
