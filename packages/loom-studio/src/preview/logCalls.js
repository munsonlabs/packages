/**
 * @typedef {object} RecordedCall
 * @property {string} method The method name, with any object path: `cart.add`.
 * @property {unknown[]} args
 * @property {number} at
 */

/**
 * Wraps a context so every function called on it is reported, however deep: `cart.add(product)`
 * reports `cart.add`. Values pass through untouched and calls still run, so the preview behaves
 * as the real app would while the studio shows what was asked of it.
 */
export function logCalls(target, onCall, path = '') {
  if (!target || typeof target !== 'object') return target
  const wrapped = new WeakMap()
  return new Proxy(target, {
    get(obj, key, receiver) {
      const value = Reflect.get(obj, key, receiver)
      if (typeof key === 'symbol') return value
      const name = path ? `${path}.${key}` : key
      if (typeof value === 'function') {
        return (...args) => {
          onCall({ method: name, args, at: Date.now() })
          return value.apply(obj, args)
        }
      }
      // Plain nested objects (a cart inside a shop) are recorded too; arrays and the like are data.
      if (
        value &&
        typeof value === 'object' &&
        Object.getPrototypeOf(value) === Object.prototype &&
        Object.values(value).some((v) => typeof v === 'function')
      ) {
        if (!wrapped.has(value)) wrapped.set(value, logCalls(value, onCall, name))
        return wrapped.get(value)
      }
      return value
    },
  })
}
