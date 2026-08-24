import { useEffect, useRef } from 'react';
import { initDataCss } from './internal/client.js';

/**
 * Initializes data-css after React mounts. Prefer this provider in React apps
 * that use SSR or need a non-default public asset directory.
 */
export function DataCssProvider({ children, assetBase, debug, stripAttributes, root, onReady, onError }) {
  const callbacks = useRef({ onReady, onError });
  callbacks.current = { onReady, onError };

  useEffect(() => {
    let active = true;
    initDataCss({ assetBase, debug, stripAttributes, root }).then(ready => {
      if (!active) return;
      if (ready) callbacks.current.onReady?.();
      else callbacks.current.onError?.();
    });
    return () => { active = false; };
  }, [assetBase, debug, stripAttributes, root]);

  return children;
}

export { initDataCss };
