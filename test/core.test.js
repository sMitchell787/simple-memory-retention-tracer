import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRetentionTracer } from '../src/index.js';

test('record and retrieve a single retainer', () => {
  const tracer = new MemoryRetentionTracer();
  const obj = {};
  const fn = () => {};
  tracer.record(obj, fn, ['global', 'outer']);
  assert.deepEqual(tracer.getRetainers(obj), [['global', 'outer']]);
});

test('record multiple retainers for the same object', () => {
  const tracer = new MemoryRetentionTracer();
  const obj = {};
  const fn1 = () => {};
  const fn2 = () => {};
  tracer.record(obj, fn1, ['a']);
  tracer.record(obj, fn2, ['b']);
  assert.deepEqual(tracer.getRetainers(obj), [['a'], ['b']]);
});

test('recording the same closure twice replaces the previous path', () => {
  const tracer = new MemoryRetentionTracer();
  const obj = {};
  const fn = () => {};
  tracer.record(obj, fn, ['old']);
  tracer.record(obj, fn, ['new']);
  assert.deepEqual(tracer.getRetainers(obj), [['new']]);
});

test('getRetainers returns an empty array for an unknown object', () => {
  const tracer = new MemoryRetentionTracer();
  const obj = {};
  assert.deepEqual(tracer.getRetainers(obj), []);
});

test('forget removes all records for an object', () => {
  const tracer = new MemoryRetentionTracer();
  const obj = {};
  const fn = () => {};
  tracer.record(obj, fn, ['x']);
  tracer.forget(obj);
  assert.deepEqual(tracer.getRetainers(obj), []);
});

test('clear removes all records for all objects', () => {
  const tracer = new MemoryRetentionTracer();
  const obj1 = {};
  const obj2 = {};
  const fn = () => {};
  tracer.record(obj1, fn, ['1']);
  tracer.record(obj2, fn, ['2']);
  tracer.clear();
  assert.deepEqual(tracer.getRetainers(obj1), []);
  assert.deepEqual(tracer.getRetainers(obj2), []);
});

test('scopePath defaults to an empty array when omitted', () => {
  const tracer = new MemoryRetentionTracer();
  const obj = {};
  const fn = () => {};
  tracer.record(obj, fn);
  assert.deepEqual(tracer.getRetainers(obj), [[]]);
});

test('record rejects non-object retained value', () => {
  const tracer = new MemoryRetentionTracer();
  const fn = () => {};
  assert.throws(() => tracer.record(null, fn), TypeError);
  assert.throws(() => tracer.record(42, fn), TypeError);
  assert.throws(() => tracer.record('string', fn), TypeError);
});

test('record rejects non-function closure', () => {
  const tracer = new MemoryRetentionTracer();
  const obj = {};
  assert.throws(() => tracer.record(obj, null), TypeError);
  assert.throws(() => tracer.record(obj, {}), TypeError);
});

test('record rejects invalid scopePath', () => {
  const tracer = new MemoryRetentionTracer();
  const obj = {};
  const fn = () => {};
  assert.throws(() => tracer.record(obj, fn, 'not-an-array'), TypeError);
  assert.throws(() => tracer.record(obj, fn, [1, 2]), TypeError);
});

test('getRetainers rejects non-object argument', () => {
  const tracer = new MemoryRetentionTracer();
  assert.throws(() => tracer.getRetainers(null), TypeError);
  assert.throws(() => tracer.getRetainers(42), TypeError);
});

test('forget rejects non-object argument', () => {
  const tracer = new MemoryRetentionTracer();
  assert.throws(() => tracer.forget(null), TypeError);
  assert.throws(() => tracer.forget(42), TypeError);
});

test('returned scope paths are copies and do not mutate internal state', () => {
  const tracer = new MemoryRetentionTracer();
  const obj = {};
  const fn = () => {};
  tracer.record(obj, fn, ['original']);
  const paths = tracer.getRetainers(obj);
  paths[0].push('mutated');
  assert.deepEqual(tracer.getRetainers(obj), [['original']]);
});

test('multiple objects are tracked independently', () => {
  const tracer = new MemoryRetentionTracer();
  const obj1 = {};
  const obj2 = {};
  const fn1 = () => {};
  const fn2 = () => {};
  tracer.record(obj1, fn1, ['one']);
  tracer.record(obj2, fn2, ['two']);
  assert.deepEqual(tracer.getRetainers(obj1), [['one']]);
  assert.deepEqual(tracer.getRetainers(obj2), [['two']]);
});
