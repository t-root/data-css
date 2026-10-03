// Generated from core/. Edit core files, then run node scripts/build-package.cjs.
const runtimeName = 'data-css-react';

let loadingRuntime;
let initialAssetBase;
let resolveStarted;
// Settles with the startup promise once initDataCss() runs, so callers may
// subscribe to the lifecycle before the runtime is loaded.
const started = new Promise(resolve => { resolveStarted = resolve; });

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';
const runtimeState = () => window.__dataCssRuntimes?.[runtimeName];
const noop = () => {};

/**
 * Starts the DOM runtime explicitly. This keeps the package safe to import in
 * tooling or server code and lets an application choose its public asset path.
 */
export function initDataCss({ assetBase = undefined, debug = false, stripAttributes = false, root } = {}) {
  if (!isBrowser()) {
    return Promise.resolve(false);
  }

  if (!loadingRuntime) {
    initialAssetBase = assetBase?.replace(/\/$/, '');
    const options = window.__dataCssRuntimeOptions || (window.__dataCssRuntimeOptions = {});
    options[runtimeName] = { assetBase: initialAssetBase, debug, stripAttributes, root };
    loadingRuntime = import('./runtime.js').then(() => runtimeState()?.readyPromise ?? true);
    resolveStarted(loadingRuntime);
  } else if (assetBase && assetBase.replace(/\/$/, '') !== initialAssetBase) {
    console.warn(`${runtimeName} is already initialized; later assetBase values are ignored.`);
  }

  // Also resumes the observer after stopDataCss() has been called.
  runtimeState()?.start?.();
  return loadingRuntime;
}

/** Current lifecycle state of this package's runtime. */
export function getDataCssStatus() {
  if (!isBrowser()) return 'idle';
  return runtimeState()?.status ?? (loadingRuntime ? 'loading' : 'idle');
}

/**
 * Resolves with `true` after the initial CSS is applied or `false` when the
 * configuration cannot be loaded. Waits for initDataCss() if it has not run yet.
 */
export function whenDataCssReady() {
  if (!isBrowser()) return Promise.resolve(false);
  return runtimeState()?.readyPromise ?? started;
}

/**
 * Calls `callback(ready)` once startup succeeds or fails, including when
 * subscribing after startup. Returns a function that cancels the subscription.
 */
export function onDataCssReady(callback) {
  if (!isBrowser() || typeof callback !== 'function') return noop;
  let active = true;
  whenDataCssReady().then(ready => { if (active) callback(ready); });
  return () => { active = false; };
}

/**
 * Calls `callback` every time CSS for later DOM changes has been inserted.
 * Returns a function that removes the listener.
 */
export function onDataCssUpdate(callback) {
  if (!isBrowser() || typeof callback !== 'function') return noop;
  const type = `dataCssReadyAgain:${runtimeName}`;
  const listener = event => callback(event);
  document.addEventListener(type, listener);
  return () => document.removeEventListener(type, listener);
}

/**
 * Resolves after the next CSS insertion for DOM changes, e.g. after appending
 * an element with data-css. Resolves immediately outside a browser.
 */
export function nextDataCssUpdate() {
  if (!isBrowser()) return Promise.resolve();
  return new Promise(resolve => {
    const off = onDataCssUpdate(() => { off(); resolve(); });
  });
}

/** Stops observing DOM changes for this package's runtime only. */
export function stopDataCss() {
  if (isBrowser()) runtimeState()?.destroy?.();
}

/** Resumes observing DOM changes after stopDataCss(). */
export function startDataCss() {
  if (isBrowser()) runtimeState()?.start?.();
}
