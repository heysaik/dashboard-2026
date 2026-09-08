const test = require('node:test');
const assert = require('node:assert/strict');
const { Calculator, convert, calendarCells, shuffleTiles, validManifest } = require('../Resources/Web/core.js');

test('calculator operations, precedence of pending operations, and repeated equals', () => {
  const c = new Calculator();
  for (const key of ['1', '2', '+', '3', '=']) c.press(key);
  assert.equal(c.display, '15'); c.press('='); assert.equal(c.display, '18');
  for (const key of ['c', '7', '×', '8', '=']) c.press(key);
  assert.equal(c.display, '56');
  for (const key of ['c', '9', '÷', '0', '=']) c.press(key);
  assert.equal(c.display, 'Error'); c.press('3'); assert.equal(c.display, '3');
});
test('calculator decimal, memory, operator replacement and percentage', () => {
  const c = new Calculator();
  for (const key of ['.', '5', 'm+', 'c', '2', 'm+', 'mr']) c.press(key);
  assert.equal(c.display, '2.5'); c.press('mc'); c.press('mr'); assert.equal(c.display, '0');
  for (const key of ['c', '5', '+', '×', '2', '=']) c.press(key);
  assert.equal(c.display, '10'); c.press('%'); assert.equal(c.display, '0.1');
});
test('calculator accepts pasted numbers without losing pending operations or memory', () => {
  const c = new Calculator();
  assert.equal(c.enter(' −1,234.50 '), true); assert.equal(c.display, '-1234.5');
  c.press('m+'); c.press('c'); c.press('2'); c.press('+');
  assert.equal(c.enter('3e2'), true); c.press('='); assert.equal(c.display, '302');
  c.press('mr'); assert.equal(c.display, '-1234.5');
});
test('calculator rejects non-numeric clipboard input without changing its value', () => {
  const c = new Calculator(); c.enter('42');
  for (const text of ['', '   ', 'Infinity', '1e999', '12 apples', '<script>', '2+3', '--4']) {
    assert.equal(c.enter(text), false, text); assert.equal(c.display, '42');
  }
});
test('unit conversions include offsets and precision', () => {
  assert.equal(convert(32, 'Temperature', 'Fahrenheit', 'Celsius'), 0);
  assert.equal(convert(0, 'Temperature', 'Celsius', 'Kelvin'), 273.15);
  assert.equal(convert(1, 'Length', 'Miles', 'Meters'), 1609.344);
  assert.ok(Math.abs(convert(1, 'Mass', 'Pounds', 'Grams') - 453.59237) < 1e-8);
  assert.equal(convert(1, 'Data', 'Mebibytes', 'Bytes'), 1048576);
});
test('calendar leap years and Sunday alignment', () => {
  assert.equal(calendarCells(2024, 1).filter(Boolean).length, 29);
  assert.equal(calendarCells(2025, 1).filter(Boolean).length, 28);
  assert.equal(calendarCells(2026, 1)[0], 1);
});
test('tile shuffle always creates a solvable permutation', () => {
  for (let n = 0; n < 100; n++) {
    const board = shuffleTiles(); assert.equal(new Set(board).size, 16);
    const values = board.filter(x => x !== 15); let inversions = 0;
    for (let i = 0; i < values.length; i++) for (let j = i + 1; j < values.length; j++) if (values[i] > values[j]) inversions++;
    const rowFromBottom = 4 - Math.floor(board.indexOf(15) / 4);
    assert.equal((inversions + rowFromBottom) % 2, 1);
  }
});
test('import validation rejects malformed widget dimensions and payloads', () => {
  const widget = { version: 1, name: 'Timer', width: 220, height: 180, html: '<p>Hello</p>' };
  assert.equal(validManifest(widget), true);
  for (const patch of [{ width: Infinity }, { height: 1 }, { version: 2 }, { name: ' ' }, { html: '' }, { width: '220' }]) assert.equal(validManifest({ ...widget, ...patch }), false);
});
