import { useEffect, useRef, useState } from 'react';
import { getDataCssStatus, initDataCss, onDataCssReady } from './internal/client.js';

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

const toHookStatus = status => (status === 'ready' || status === 'error' ? status : 'loading');

/**
 * Returns 'loading' until the runtime has applied its initial CSS, then
 * 'ready', or 'error' when the configuration cannot be loaded.
 */
export function useDataCssStatus() {
  const [status, setStatus] = useState(() => toHookStatus(getDataCssStatus()));

  useEffect(() => {
    setStatus(toHookStatus(getDataCssStatus()));
    return onDataCssReady(ready => setStatus(ready ? 'ready' : 'error'));
  }, []);

  return status;
}

export {
  initDataCss,
  getDataCssStatus,
  whenDataCssReady,
  onDataCssReady,
  onDataCssUpdate,
  nextDataCssUpdate,
  stopDataCss,
  startDataCss,
} from './internal/client.js';
