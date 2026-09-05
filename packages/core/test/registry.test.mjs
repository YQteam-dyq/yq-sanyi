import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { define, lookup, version } from '../dist/core.mjs';

test('define then lookup returns the same definition', () => {
  const def = { name: 'demo-pill', template: '<span>hello</span>', style: '', script: null };
  define('demo-pill', def);
  const result = lookup('demo-pill');
  assert.ok(result);
  assert.equal(result.name, 'demo-pill');
  assert.equal(result.cdo.name, 'demo-pill');
});

test('lookup of an unknown name returns undefined', () => {
  assert.equal(lookup('missing-pill'), undefined);
});

test('duplicate define is rejected', () => {
  define('dup-pill', { name: 'dup-pill', template: '<div></div>', style: '', script: null });
  assert.throws(() => define('dup-pill', { name: 'dup-pill', template: '<div></div>', style: '', script: null }), /duplicate component definition: dup-pill/);
});

test('empty name is rejected for define and lookup', () => {
  assert.throws(() => define('', { name: 'empty' }), TypeError);
  assert.throws(() => lookup(''), TypeError);
});

test('non-object definition is rejected', () => {
  assert.throws(() => define('bad-pill', 'not-an-object'), TypeError);
  assert.throws(() => define('bad-pill2', { name: 'bad-pill2', template: '<div></div>' }), TypeError);
  assert.throws(() => define('bad-pill3', { name: 'bad-pill3', style: '', script: null }), TypeError);
});

test('version string is exposed by the esm entry', () => {
  assert.equal(typeof version, 'string');
  assert.ok(version.length > 0);
});

test('iife bundle exposes window.yq with define, lookup and version', () => {
  const code = readFileSync(new URL('../dist/core.global.js', import.meta.url), 'utf8');
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  assert.equal(typeof sandbox.window.yq, 'object');
  assert.equal(typeof sandbox.window.yq.define, 'function');
  assert.equal(typeof sandbox.window.yq.lookup, 'function');
  assert.equal(typeof sandbox.window.yq.version, 'string');
  sandbox.window.yq.define('global-pill', { name: 'global-pill', template: '<div></div>', style: '', script: null });
  assert.equal(sandbox.window.yq.lookup('global-pill').cdo.name, 'global-pill');
});

test('registry source keeps no DOM access', () => {
  const source = readFileSync(new URL('../src/registry.ts', import.meta.url), 'utf8');
  assert.equal(/(?:document|window|HTMLElement|CustomElement)/.test(source), false);
});
