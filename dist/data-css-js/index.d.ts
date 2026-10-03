export interface DataCssInitOptions {
  /** Public URL containing config.json and base.css, plus optional overrides.css. */
  assetBase?: string;
  /** Enables syntax diagnostics and per-breakpoint style tags. Set on first initialization. */
  debug?: boolean;
  /** Removes source data-css attributes after compilation; disables later attribute-based updates. */
  stripAttributes?: boolean;
  /** Limits scanning and mutation observation to this DOM subtree. Set on first initialization. */
  root?: Element | Document;
}

/** `idle` until initDataCss() runs; `idle` outside a browser. */
export type DataCssStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Starts or resumes the browser runtime. Resolves after initial CSS is applied. */
export function initDataCss(options?: DataCssInitOptions): Promise<boolean>;

/** Current lifecycle state of this package's runtime. */
export function getDataCssStatus(): DataCssStatus;

/**
 * Resolves `true` after the initial CSS is applied, `false` when the configuration
 * cannot be loaded. Safe to call before initDataCss(); it waits for startup.
 */
export function whenDataCssReady(): Promise<boolean>;

/** Calls `callback(ready)` once startup succeeds or fails, even when subscribing late. Returns an unsubscribe function. */
export function onDataCssReady(callback: (ready: boolean) => void): () => void;

/** Calls `callback` every time CSS for later DOM changes is inserted. Returns an unsubscribe function. */
export function onDataCssUpdate(callback: (event: CustomEvent<{ runtime: string }>) => void): () => void;

/** Resolves after the next CSS insertion for DOM changes. */
export function nextDataCssUpdate(): Promise<void>;

/** Stops observing DOM changes for this package's runtime only. */
export function stopDataCss(): void;

/** Resumes observing DOM changes after stopDataCss(). */
export function startDataCss(): void;

declare global {
  interface Window {
    /** @deprecated Controls whichever runtime loaded last. Use `stopDataCss()`. */
    destroyDataCss?: () => void;
    /** @deprecated Controls whichever runtime loaded last. Use `startDataCss()`. */
    startDataCss?: () => void;
    /** @deprecated Use `getDataCssStatus()`. */
    __dataCssReady?: boolean;
    __dataCssRuntimes?: Record<string, { ready: boolean; status: 'loading' | 'ready' | 'error'; readyPromise: Promise<boolean>; start?: () => void; destroy?: () => void }>;
    /** @deprecated Use `whenDataCssReady()` exported by the package. */
    whenDataCssReady?: () => Promise<boolean>;
    /** @deprecated Never called when startup fails. Use `onDataCssReady()`. */
    dataCssReady?: (callback: (event: Event) => void) => void;
    /** @deprecated Fires once per registration. Use `onDataCssUpdate()` or `nextDataCssUpdate()`. */
    dataCssReadyAgain?: (callback: (event: Event) => void) => void;
  }
}
