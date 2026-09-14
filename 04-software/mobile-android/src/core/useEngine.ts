import { useCallback, useRef, useSyncExternalStore } from 'react';
import { engine, EngineSnapshot } from './engine';

/**
 * Selector-based subscription to the engine.
 *
 * `useSyncExternalStore` is React's own primitive for exactly this shape of
 * problem, so there is no state library here. Always select the narrowest slice
 * you need -- a tick then re-renders one gauge instead of the whole screen.
 *
 * The cache lives in a ref because `getSnapshot` must return a referentially
 * stable value for unchanged state; returning a fresh object every call would
 * put React into an infinite re-render loop.
 */
export function useEngine<T>(
  selector: (s: EngineSnapshot) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const selectorRef = useRef(selector);
  const isEqualRef = useRef(isEqual);
  selectorRef.current = selector;
  isEqualRef.current = isEqual;

  const cache = useRef<{ has: boolean; value: T }>({
    has: false,
    value: undefined as unknown as T,
  });

  const getSnapshot = useCallback(() => {
    const next = selectorRef.current(engine.getSnapshot());
    if (cache.current.has && isEqualRef.current(cache.current.value, next)) {
      return cache.current.value;
    }
    cache.current = { has: true, value: next };
    return next;
  }, []);

  return useSyncExternalStore(engine.subscribe, getSnapshot, getSnapshot);
}

/** Shallow object comparison, for selectors that return a small record. */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.is((a as never)[k], (b as never)[k])) return false;
  }
  return true;
}

/** Array shallow comparison, for selectors returning lists. */
export function arrayEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
}

export { engine };
