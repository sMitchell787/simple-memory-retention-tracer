# simple-memory-retention-tracer

Tracks which closures retain a given object reference and reports the scope chain path from the entry point to each retainer.

## Usage

```js
import { MemoryRetentionTracer } from './src/index.js';

const tracer = new MemoryRetentionTracer();

const target = {};
const closureA = () => target;
const closureB = () => target;

tracer.record(target, closureA, ['global', 'outer', 'a']);
tracer.record(target, closureB, ['global', 'outer', 'b']);

console.log(tracer.getRetainers(target));
// [ [ 'global', 'outer', 'a' ], [ 'global', 'outer', 'b' ] ]

tracer.forget(target);
console.log(tracer.getRetainers(target));
// []
```

## Why this exists

When an object is retained unexpectedly, the usual suspects are closures that capture it. Finding *which* closure and *where* it sits in the scope chain is manual work: you read code, set breakpoints, and guess. This library lets you record that relationship explicitly at the point where a closure is created, then query it later from a test or a debugging hook.

The trade-off is that the tracer holds strong references to the objects it tracks, so it will itself prevent garbage collection until `forget` or `clear` is called. That is deliberate: a tracer that silently drops records when memory pressure rises is not useful for diagnosing retention. Call `forget` when you are done with an object, or keep the tracer short-lived.

## The awkward edge

Identity is by object reference, not by structural equality. Two distinct empty objects are two different keys. If you pass a fresh object literal to `getRetainers`, you will get an empty array even if an identical-looking object was recorded earlier. This is the only sane choice for a retention tracer, but it means you must hold onto the exact reference you recorded.

## API

- `new MemoryRetentionTracer()`
- `record(object, closure, scopePath = [])` — records that `closure` retains `object`. `scopePath` is an array of strings naming scopes from the entry point down to the closure. Recording the same closure twice for the same object replaces the previous path.
- `getRetainers(object)` — returns an array of scope paths (each an array of strings) for all closures known to retain `object`. Returns `[]` if the object is unknown.
- `forget(object)` — removes all records for `object`.
- `clear()` — removes all records for all objects.

All methods throw `TypeError` for invalid arguments: `object` must be a non-null object, `closure` must be a function, and `scopePath` must be an array of strings.
