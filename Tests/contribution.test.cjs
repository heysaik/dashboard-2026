const test = require('node:test');
const assert = require('node:assert/strict');
const { subjectError, commitRange } = require('../scripts/check-contribution.cjs');

test('commit policy accepts scoped, unscoped and breaking changes', () => {
  for (const message of ['fix: handle empty forecasts', 'ci(checks): require passing tests', 'feat(widgets)!: change manifest format\n\nBREAKING CHANGE: version 3']) assert.equal(subjectError(message), null);
});
test('commit policy rejects empty, unfinished and overly long subjects', () => {
  for (const message of ['', 'Update stuff', 'fix: ', 'fix: x', 'fix: ' + 'x'.repeat(100), '# Instructions only']) assert.ok(subjectError(message));
});
test('commit template comments do not become the subject', () => {
  assert.equal(subjectError('# type(scope): description\n\ndocs: explain widget installation\n\nDetails.'), null);
});
test('PR policy validates the contribution range rather than the synthetic merge', () => {
  const base = 'a'.repeat(40), head = 'b'.repeat(40);
  assert.equal(commitRange({ pull_request: { base: { sha: base }, head: { sha: head } }, before: 'c'.repeat(40) }), `${base}..${head}`);
});
test('push policy uses the complete newly pushed commit range', () => {
  const before = 'a'.repeat(40), after = 'b'.repeat(40);
  assert.equal(commitRange({ before, after }), `${before}..${after}`);
  assert.equal(commitRange({}), null);
});
test('malformed or empty ranges cannot silently bypass contribution checks', () => {
  for (const before of ['0'.repeat(40), '--all', '$(whoami)', '', undefined]) assert.throws(() => commitRange({ before, after: 'b'.repeat(40) }));
});
