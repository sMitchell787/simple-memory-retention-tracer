export class MemoryRetentionTracer {
  #retainers = new Map();

  constructor() {
    // The tracer maintains a map from a retained object to an array of
    // retainer records. A retainer record is { closure, scopePath }.
    // We use a Map keyed by object identity because that is the only
    // reliable way to associate metadata with arbitrary objects without
    // mutating them (which would be observable and undesirable).
  }

  /**
   * Records that `closure` retains `object`, and that the closure is
   * reachable from `entryPoint` through the given scope chain path.
   *
   * The `scopePath` is an array of strings naming the scopes, from the
   * entry point down to the closure. For example, a path might be:
   *   ['global', 'outerFunction', 'innerFunction']
   * If no path is provided, an empty array is used, indicating the
   * closure is the entry point itself.
   *
   * If the same closure is recorded twice for the same object, the
   * later call replaces the earlier one. This avoids duplicate entries
   * and keeps the latest known path.
   *
   * @param {object} object - The object being retained.
   * @param {Function} closure - The function that retains it.
   * @param {string[]} [scopePath] - Scope chain from entry point to closure.
   */
  record(object, closure, scopePath = []) {
    if (object === null || typeof object !== 'object') {
      throw new TypeError('object must be a non-null object');
    }
    if (typeof closure !== 'function') {
      throw new TypeError('closure must be a function');
    }
    if (!Array.isArray(scopePath)) {
      throw new TypeError('scopePath must be an array of strings');
    }
    for (const segment of scopePath) {
      if (typeof segment !== 'string') {
        throw new TypeError('scopePath must contain only strings');
      }
    }

    let retainers = this.#retainers.get(object);
    if (!retainers) {
      retainers = [];
      this.#retainers.set(object, retainers);
    }

    // Replace an existing record for the same closure, if present.
    const existingIndex = retainers.findIndex((r) => r.closure === closure);
    const record = { closure, scopePath: [...scopePath] };
    if (existingIndex !== -1) {
      retainers[existingIndex] = record;
    } else {
      retainers.push(record);
    }
  }

  /**
   * Returns the scope chain paths for all closures known to retain `object`.
   *
   * The result is an array of arrays of strings. Each inner array is a
   * scope path from the entry point to a retainer. The order of paths is
   * the order in which retainers were first recorded.
   *
   * If the object is not retained by any known closure, an empty array is
   * returned. This is not an error; it simply means the tracer has no
   * information about that object.
   *
   * @param {object} object - The object to query.
   * @returns {string[][]} Array of scope paths.
   */
  getRetainers(object) {
    if (object === null || typeof object !== 'object') {
      throw new TypeError('object must be a non-null object');
    }
    const retainers = this.#retainers.get(object);
    if (!retainers) {
      return [];
    }
    return retainers.map((r) => [...r.scopePath]);
  }

  /**
   * Removes all records for `object`. After calling this, `getRetainers`
   * will return an empty array for the object.
   *
   * This is useful when an object is known to be garbage collected and
   * you want to free the tracer's internal references to it. Note that
   * the tracer itself holds strong references to the objects it tracks,
   * so it will prevent garbage collection until `forget` is called.
   *
   * @param {object} object - The object to forget.
   */
  forget(object) {
    if (object === null || typeof object !== 'object') {
      throw new TypeError('object must be a non-null object');
    }
    this.#retainers.delete(object);
  }

  /**
   * Removes all records for all objects. The tracer becomes empty.
   */
  clear() {
    this.#retainers.clear();
  }
}
