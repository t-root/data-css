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

/** Starts or resumes the browser runtime. Resolves after initial CSS is applied. */
export function initDataCss(options?: DataCssInitOptions): Promise<boolean>;

declare global {
  interface Window {
    destroyDataCss?: () => void;
    startDataCss?: () => void;
    __dataCssReady?: boolean;
    __dataCssRuntimes?: Record<string, { ready: boolean; status: 'loading' | 'ready' | 'error'; readyPromise: Promise<boolean>; start?: () => void; destroy?: () => void }>;
    whenDataCssReady?: () => Promise<boolean>;
    dataCssReady?: (callback: (event: Event) => void) => void;
    dataCssReadyAgain?: (callback: (event: Event) => void) => void;
  }
}
