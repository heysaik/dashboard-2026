'use strict';
(function (root) {
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  class Calculator {
    constructor() { this.clear(); this.memory = 0; }
    clear() { this.display = '0'; this.stored = null; this.operator = null; this.fresh = true; this.lastOperand = null; this.lastOperator = null; }
    apply(a, b, op) { return ({ '+': () => a + b, '−': () => a - b, '×': () => a * b, '÷': () => b === 0 ? NaN : a / b })[op]?.() ?? b; }
    format(number) { return Number.isFinite(number) ? String(Number(number.toPrecision(12))) : 'Error'; }
    enter(text) {
      const value = String(text).trim().replace(/−/g, '-').replace(/,/g, '');
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) || !Number.isFinite(Number(value))) return false;
      this.display = this.format(Number(value)); this.fresh = false; return true;
    }
    press(key) {
      if (/^\d$/.test(key)) { this.display = this.fresh || this.display === '0' || this.display === 'Error' ? key : (this.display.length < 14 ? this.display + key : this.display); this.fresh = false; }
      else if (key === '.') { if (this.fresh || this.display === 'Error') this.display = '0'; if (!this.display.includes('.')) this.display += '.'; this.fresh = false; }
      else if (key === 'c' || key === 'AC') this.clear();
      else if (key === '±') this.display = this.format(-Number(this.display));
      else if (key === '%') this.display = this.format(Number(this.display) / 100);
      else if (key === '⌫') { this.display = this.display.length > 1 ? this.display.slice(0, -1) : '0'; }
      else if (key === 'mc') this.memory = 0;
      else if (key === 'm+') this.memory += Number(this.display) || 0;
      else if (key === 'm−') this.memory -= Number(this.display) || 0;
      else if (key === 'mr') { this.display = this.format(this.memory); this.fresh = true; }
      else if (['+', '−', '×', '÷'].includes(key)) {
        if (this.operator && !this.fresh) this.display = this.format(this.apply(this.stored, Number(this.display), this.operator));
        this.stored = Number(this.display); this.operator = key; this.fresh = true;
      } else if (key === '=') {
        if (this.operator) { this.lastOperand = Number(this.display); this.lastOperator = this.operator; this.display = this.format(this.apply(this.stored, this.lastOperand, this.operator)); this.operator = null; }
        else if (this.lastOperator) this.display = this.format(this.apply(Number(this.display), this.lastOperand, this.lastOperator));
        this.fresh = true;
      }
      return this.display;
    }
  }
  const units = {
    Length: { Meters: 1, Kilometers: 1000, Centimeters: 0.01, Millimeters: 0.001, Inches: 0.0254, Feet: 0.3048, Yards: 0.9144, Miles: 1609.344 },
    Mass: { Kilograms: 1, Grams: 0.001, Pounds: 0.45359237, Ounces: 0.028349523125, Tonnes: 1000 },
    Area: { 'Square meters': 1, 'Square feet': 0.09290304, Acres: 4046.8564224, Hectares: 10000 },
    Volume: { Liters: 1, Milliliters: 0.001, 'US gallons': 3.785411784, 'US cups': 0.2365882365, 'US fluid ounces': 0.0295735295625 },
    Speed: { 'Meters/second': 1, 'Kilometers/hour': 1 / 3.6, 'Miles/hour': 0.44704, Knots: 0.5144444444 },
    Time: { Seconds: 1, Minutes: 60, Hours: 3600, Days: 86400, Weeks: 604800 },
    Energy: { Joules: 1, Kilojoules: 1000, Calories: 4.184, Kilocalories: 4184, 'Kilowatt-hours': 3600000 },
    Pressure: { Pascals: 1, Kilopascals: 1000, Bar: 100000, PSI: 6894.757293, Atmospheres: 101325 },
    Data: { Bytes: 1, Kilobytes: 1000, Megabytes: 1000000, Gigabytes: 1000000000, Kibibytes: 1024, Mebibytes: 1048576 },
    Temperature: { Celsius: 1, Fahrenheit: 1, Kelvin: 1 }
  };
  function convert(value, category, from, to) {
    if (!Number.isFinite(value)) return NaN;
    if (category === 'Temperature') { const c = from === 'Fahrenheit' ? (value - 32) * 5 / 9 : from === 'Kelvin' ? value - 273.15 : value; return to === 'Fahrenheit' ? c * 9 / 5 + 32 : to === 'Kelvin' ? c + 273.15 : c; }
    return value * units[category]?.[from] / units[category]?.[to];
  }
  function calendarCells(year, month) {
    const first = new Date(year, month, 1).getDay(); const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => { const day = index - first + 1; return day > 0 && day <= days ? day : null; });
  }
  function shuffleTiles(random = Math.random) {
    const board = Array.from({ length: 16 }, (_, i) => i); let hole = 15, previous = -1;
    for (let i = 0; i < 180; i++) { const choices = [hole - 4, hole + 4, ...(hole % 4 ? [hole - 1] : []), ...(hole % 4 < 3 ? [hole + 1] : [])].filter(n => n >= 0 && n < 16 && n !== previous); const next = choices[Math.floor(random() * choices.length)]; [board[hole], board[next]] = [board[next], board[hole]]; previous = hole; hole = next; }
    return board;
  }
  const widgetSizes = {small:[170,170],medium:[348,170],large:[348,360]};
  function validPresentation(p) {
    return p==null || p.type==='activity' && ['iso8601','unix'].includes(p.dateEncoding) && Number.isInteger(p.days) && p.days>=7 && p.days<=93 && ['datePath','valuePath'].every(key=>typeof p[key]==='string' && p[key].length>0 && p[key].length<=150) && typeof p.label==='string' && p.label.length>0 && p.label.length<=30;
  }
  function weatherDescription(code,day=true) {
    if(code==null)return 'Conditions unavailable';
    if(code===0)return day?'Sunny':'Clear';
    if(code===1)return day?'Mostly sunny':'Mostly clear';
    if(code===2)return 'Partly cloudy';if(code===3)return 'Overcast';
    if([45,48].includes(code))return 'Fog';
    if([51,53,55].includes(code))return 'Drizzle';if([56,57].includes(code))return 'Freezing drizzle';
    if([61,63,65,80,81,82].includes(code))return 'Rain';if([66,67].includes(code))return 'Freezing rain';
    if([71,73,75,77,85,86].includes(code))return 'Snow';if([95,96,99].includes(code))return 'Thunderstorms';
    return 'Conditions unavailable';
  }
  function validConnection(c) {
    try {
      const url = new URL(c.url);
      if(!validPresentation(c.presentation) || c.presentation && c.mode!=='json')return false;
      if(c.openURL!=null){const open=new URL(c.openURL);if(open.protocol!=='https:' || open.username || open.password || open.hostname.includes('{') || c.openURL.length>=2000)return false;}
      return ['json','agent','browser'].includes(c.mode) && url.protocol === 'https:' && !url.username && !url.password && !url.hostname.includes('{') && c.url.length < 2000 && typeof c.query === 'string' && c.query.length < 3000 && typeof c.itemsPath === 'string' && typeof c.actionLabel === 'string' && c.actionLabel.length <= 60 && Array.isArray(c.fields) && c.fields.length <= 6 && c.fields.every(f=>typeof f.label==='string' && f.label.length<=60 && typeof f.path==='string' && f.path.length<=150) && Array.isArray(c.parameters) && c.parameters.length<=4 && new Set(c.parameters.map(p=>p.id)).size===c.parameters.length && c.parameters.every(p=>/^[a-zA-Z][a-zA-Z0-9_]{0,30}$/.test(p.id) && ['text','date','number'].includes(p.type) && typeof p.label==='string' && p.label.length<=60 && typeof p.value==='string' && p.value.length<=256) && (!c.auth || (c.mode==='json' && ['header','query'].includes(c.auth.placement) && /^[a-zA-Z0-9_-]{1,60}$/.test(c.auth.name) && !['host','cookie','referer'].includes(c.auth.name.toLowerCase()) && typeof c.auth.prefix==='string' && c.auth.prefix.length<=30 && !/[\r\n]/.test(c.auth.prefix)));
    } catch { return false; }
  }
  function activitySeries(payload, connection, retrievedAt=new Date().toISOString(), hasMore=false) {
    const p=connection.presentation;
    if(!p || !validPresentation(p))throw new Error('This activity grid needs a valid data mapping.');
    if(hasMore)throw new Error('The API returned only part of the activity. Use a complete daily-count endpoint.');
    const items=pathValue(payload,connection.itemsPath);
    if(!Array.isArray(items))throw new Error('Activity needs an array of dated counts from the source.');
    const end=new Date(retrievedAt);if(!Number.isFinite(end.getTime()))throw new Error('The source has no valid retrieval date.');
    end.setUTCHours(0,0,0,0);const endTime=end.getTime(),startTime=endTime-(p.days-1)*86400000,counts=new Map();
    for(const item of items) {
      const rawDate=pathValue(item,p.datePath),rawValues=pathValue(item,p.valuePath);
      const time=p.dateEncoding==='unix' && typeof rawDate==='number'?rawDate*1000:p.dateEncoding==='iso8601' && typeof rawDate==='string' && /^\d{4}-\d{2}-\d{2}(T.*(?:Z|[+-]\d\d:\d\d))?$/.test(rawDate)?Date.parse(rawDate):NaN;
      if(!Number.isFinite(time))throw new Error(`The source did not provide a valid date at ${p.datePath}.`);
      const date=new Date(time);date.setUTCHours(0,0,0,0);const first=date.getTime();
      const values=Array.isArray(rawValues)?rawValues:[rawValues];
      if(!values.length || values.length>31 || !values.every(v=>Number.isSafeInteger(v) && v>=0))throw new Error(`The source did not provide daily counts at ${p.valuePath}.`);
      values.forEach((value,index)=>{const day=first+index*86400000;if(day<startTime || day>endTime)return;if(counts.has(day))throw new Error('The source returned overlapping daily counts.');counts.set(day,value);});
    }
    const maximum=Math.max(1,...counts.values());
    const days=Array.from({length:p.days},(_,i)=>{const time=startTime+i*86400000,count=counts.has(time)?counts.get(time):null;return {date:new Date(time).toISOString().slice(0,10),count,level:count==null?-1:count===0?0:Math.min(4,Math.max(1,Math.ceil(count/maximum*4)))};});
    return {days,total:days.reduce((sum,day)=>sum+(day.count??0),0),missing:days.filter(d=>d.count==null).length,label:p.label};
  }
  function dataShape(value,depth=0) {
    if(value===null)return 'null'; if(depth>=5)return Array.isArray(value)?'array':typeof value;
    if(Array.isArray(value))return {type:'array',length:value.length,item:value.length?dataShape(value[0],depth+1):'unknown'};
    if(typeof value==='object')return Object.fromEntries(Object.entries(value).slice(0,24).map(([k,v])=>[k,dataShape(v,depth+1)]));
    return typeof value;
  }
  function connectionURL(c, values={}) {
    if(!validConnection(c)) throw new Error('This widget needs a valid data connection.');
    const value=c.url.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,(_,id)=>{ const p=c.parameters.find(p=>p.id===id); if(!p)throw new Error('Unknown connection input.'); return encodeURIComponent(String(values[id]??p.value).slice(0,256)); });
    if(value.includes('{')) throw new Error('Unknown connection input.');
    const url=new URL(value); if(url.protocol!=='https:' || url.hostname!==new URL(c.url).hostname) throw new Error('Invalid source URL.'); return url.href;
  }
  function pathValue(object,path) {
    if(path === '') return object;
    const keys=path.replace(/\[(\d+)\]/g,'.$1').split('.');
    if(keys.some(k=>!k || ['__proto__','prototype','constructor'].includes(k))) return undefined;
    return keys.reduce((value,key)=>value!==null && typeof value==='object' && Object.hasOwn(value,key)?value[key]:undefined,object);
  }
  function dataRows(payload, connection) {
    const collection=pathValue(payload,connection.itemsPath);
    if(collection===undefined || collection===null) throw new Error(`The source is missing ${connection.itemsPath || 'its data'}. Check the connection.`);
    const items=Array.isArray(collection)?collection.slice(0,30):[collection];
    return items.map(item=>connection.fields.length?connection.fields.map(field=>{
      const value=pathValue(item,field.path);
      if(value===undefined || value===null) throw new Error(`The source did not provide ${field.label || field.path}.`);
      return {label:field.label,value:typeof value==='object'?JSON.stringify(value):String(value)};
    }):[{label:'',value:typeof item==='object'?JSON.stringify(item,null,2):String(item)}]);
  }
  function validManifest(value) {
    const base = value && [1,2].includes(value.version) && typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= 80 && Number.isInteger(value.width) && value.width >= 140 && value.width <= 800 && Number.isInteger(value.height) && value.height >= 100 && value.height <= 700 && typeof value.html === 'string' && value.html.length > 0 && new TextEncoder().encode(value.html).length <= 1000000;
    if(!base || value.version===1) return !!base;
    if(value.supportedSizes && (!Array.isArray(value.supportedSizes) || !value.supportedSizes.length || value.supportedSizes.some(size=>!Object.hasOwn(widgetSizes,size))))return false;
    if(value.checks && (!Array.isArray(value.checks) || value.checks.length>6 || value.checks.some(check=>typeof check.name!=='string' || !Array.isArray(check.steps) || check.steps.length<1 || check.steps.length>8 || !check.steps.some(s=>['assertText','assertValue'].includes(s.action)) || check.steps.some(s=>!['click','input','key','wait','assertText','assertValue'].includes(s.action) || typeof s.selector!=='string' || s.selector.length>200 || typeof s.value!=='string' || s.value.length>500))))return false;
    return !!widgetSizes[value.size] && value.width===widgetSizes[value.size][0] && value.height===widgetSizes[value.size][1] && ['tool','connected'].includes(value.kind) && (value.kind==='connected'?validConnection(value.connection):value.connection==null);
  }
  const core = { clamp, escape, Calculator, units, convert, calendarCells, shuffleTiles, validManifest, widgetSizes, validConnection, connectionURL, pathValue, dataRows, weatherDescription, validPresentation, activitySeries, dataShape };
  if (typeof module !== 'undefined') module.exports = core;
  root.Core = core;
})(typeof globalThis === 'undefined' ? this : globalThis);
