'use strict';
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const subjectPattern = /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9][a-z0-9._/-]*\))?!?: \S.{2,}$/;

function subjectError(message) {
  const subject = String(message).split(/\r?\n/).filter(line => !line.startsWith('#')).join('\n').trim().split('\n')[0];
  if (subject.length > 100) return 'Use a commit/PR subject of at most 100 characters.';
  if (!subjectPattern.test(subject)) return 'Use a subject such as "fix(weather): preserve the selected city". Allowed types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test.';
  return null;
}

function commitRange(event) {
  const base = event.pull_request?.base?.sha ?? event.before;
  const head = event.pull_request?.head?.sha ?? event.after;
  if (!base && !head) return null; // Manual workflow dispatch checks HEAD only.
  if (![base, head].every(value => typeof value === 'string' && /^[0-9a-f]{40}$/.test(value) && !/^0+$/.test(value))) {
    throw new Error('Missing or invalid commit range; refusing to silently skip contribution checks.');
  }
  return `${base}..${head}`;
}

function main(args) {
  if (args[0] === '--message-file' && args.length === 2) {
    const error = subjectError(fs.readFileSync(args[1], 'utf8'));
    if (error) throw new Error(error);
    return;
  }
  if (args.length && args[0] !== '--ci') throw new Error('Use --ci or --message-file FILE.');
  const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
  if (event.pull_request) {
    const error = subjectError(event.pull_request.title);
    if (error) throw new Error(`PR title: ${error}`);
  }
  const range = commitRange(event);
  const revisions = range ? [range] : ['-1', 'HEAD'];
  const hashes = execFileSync('git', ['log', '--no-merges', '--format=%H', ...revisions], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  if (!hashes.length) throw new Error('No contribution commits found to validate.');
  for (const hash of hashes) {
    const error = subjectError(execFileSync('git', ['show', '-s', '--format=%B', hash], { encoding: 'utf8' }));
    if (error) throw new Error(`${hash.slice(0, 7)}: ${error}`);
  }
  execFileSync('git', range ? ['diff', '--check', range] : ['show', '--format=', '--check', 'HEAD'], { stdio: 'inherit' });
  console.log(`Contribution policy passed for ${hashes.length} commit(s).`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { subjectError, commitRange };
