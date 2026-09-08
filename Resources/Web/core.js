'use strict';
(function (root) {
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  class Calculator {
    constructor() { this.clear(); this.memory = 0; }
    clear() { this.display = '0'; this.stored = null; this.operator = null; this.fresh = true; this.lastOperand = null; this.lastOperator = null; }
    apply(a, b, op) { return ({ '+': () => a + b, '−': () => a - b, '×': () => a * b, '÷': () => b === 0 ? NaN : a / b })[op]?.() ?? b; }
    format(number) { return Number.isFinite(number) ? String(Number(number.toPrecision(12))) : 'Error'; }
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
  function validManifest(value) { return value && value.version === 1 && typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= 80 && Number.isInteger(value.width) && value.width >= 140 && value.width <= 800 && Number.isInteger(value.height) && value.height >= 100 && value.height <= 700 && typeof value.html === 'string' && value.html.length > 0 && new TextEncoder().encode(value.html).length <= 1000000; }
  const core = { clamp, escape, Calculator, units, convert, calendarCells, shuffleTiles, validManifest };
  if (typeof module !== 'undefined') module.exports = core;
  root.Core = core;
})(typeof globalThis === 'undefined' ? this : globalThis);
