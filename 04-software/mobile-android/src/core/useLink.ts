import { useCallback, useRef, useSyncExternalStore } from 'react';
import { link, LinkStatus } from './link';

export type LinkView = {
  status: LinkStatus;
  detail: string;
  name: string;
};

/** Subscribe to the telemetry link, cached so React never sees a fresh object. */
export function useLink(): LinkView {
  const cache = useRef<LinkView>({
    status: link.status(),
    detail: link.detail(),
    name: link.name,
  });

  const get = useCallback(() => {
    const s = link.status();
    const d = link.detail();
    if (cache.current.status !== s || cache.current.detail !== d) {
      cache.current = { status: s, detail: d, name: link.name };
    }
    return cache.current;
  }, []);

  return useSyncExternalStore(link.onChange, get, get);
}
