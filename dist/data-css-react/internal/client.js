// Generated from core/. Edit core files, then run node scripts/build-package.cjs.
let loadingRuntime;
let initialAssetBase;

/**
 * Starts the DOM runtime explicitly. This keeps the package safe to import in
 * tooling or server code and lets an application choose its public asset path.
 */
export function initDataCss({ assetBase = undefined, debug = false, stripAttributes = false, root } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(false);
  }

  if (!loadingRuntime) {
    initialAssetBase = assetBase?.replace(/\/$/, '');
    if (initialAssetBase) window.__DATA_CSS_ASSET_BASE__ = initialAssetBase;
    if (debug) window.__DATA_CSS_DEBUG__ = true;
    if (stripAttributes) window.__DATA_CSS_STRIP_ATTRIBUTES__ = true;
    if (root) window.__DATA_CSS_ROOT__ = root;
    loadingRuntime = import('./runtime.js').then(() => window.__dataCssRuntimes?.['data-css-react']?.readyPromise ?? true);
  } else if (assetBase && assetBase.replace(/\/$/, '') !== initialAssetBase) {
    console.warn('data-css-react is already initialized; later assetBase values are ignored.');
  }

  // Also resumes the observer after destroyDataCss() has been called.
  window.__dataCssRuntimes?.['data-css-react']?.start?.();
  return loadingRuntime;
}
