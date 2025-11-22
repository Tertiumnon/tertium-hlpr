#!/usr/bin/env node
const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(...args) { console.log(...args); }

const tmpDir = path.join(process.cwd(), 'tmp', 'rename-e2e');

function resetDir() {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tmpDir, { recursive: true });
}

function createTestFiles() {
  const nestedDir = path.join(tmpDir, 'Nested Dir');
  const deepDir = path.join(nestedDir, 'Deep Directory');
  fs.mkdirSync(deepDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'File One.txt'), 'x');
  fs.writeFileSync(path.join(tmpDir, 'another-file.TXT'), 'y');
  fs.writeFileSync(path.join(nestedDir, 'Deep File.testdata.js'), 'z');
  fs.writeFileSync(path.join(deepDir, 'Inner File.md'), 'a');
}

function exists(p) { return fs.existsSync(p); }

async function main() {
  log('Cleaning tmp dir...');
  resetDir();
  log('Creating test structure...');
  createTestFiles();

  // Ensure bin is built
  log('Building project (bun run build)...');
  const build = spawnSync('bun', ['run', 'build'], { stdio: 'inherit' });
  if (build.status !== 0) {
    log('Build failed');
    process.exit(build.status || 1);
  }

  // Dry run
  log('Running dry-run rename...');
  const dry = spawnSync('node', ['bin/index.js', 'file', 'rename', tmpDir, 'kebab', '--dry'], { encoding: 'utf8' });
  log(dry.stdout);
  if (!dry.stdout.includes('Dry run - would rename')) {
    log('Dry run did not report rename');
    process.exit(1);
  }

  // Ensure original file still exists
  if (!exists(path.join(tmpDir, 'File One.txt')) || !exists(path.join(tmpDir, 'Nested Dir', 'Deep File.testdata.js'))) {
    log('Files changed during dry run');
    process.exit(1);
  }

  // Actual run
  log('Running actual rename...');
  const actual = spawnSync('node', ['bin/index.js', 'file', 'rename', tmpDir, 'kebab'], { encoding: 'utf8' });
  log(actual.stdout);
  if (!actual.stdout.includes('Renamed')) {
    log('Rename command did not report changes');
    process.exit(1);
  }

  // Validate results
  const expected = [
    path.join(tmpDir, 'file-one.txt'),
    path.join(tmpDir, 'nested-dir'),
    path.join(tmpDir, 'nested-dir', 'deep-file.testdata.js'),
    path.join(tmpDir, 'nested-dir', 'deep-directory', 'inner-file.md')
  ];

  for (const p of expected) {
    if (!exists(p)) {
      log('Expected file not found:', p);
      process.exit(1);
    }
  }

  log('E2E rename test passed successfully');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
