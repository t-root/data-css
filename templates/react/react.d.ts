import type { ReactNode } from 'react';
import type { DataCssInitOptions } from './index.js';

export interface DataCssProviderProps extends DataCssInitOptions {
  children?: ReactNode;
  onReady?: () => void;
  onError?: () => void;
}

export function DataCssProvider(props: DataCssProviderProps): ReactNode;

/** 'loading' until the initial CSS is applied, then 'ready' or 'error'. */
export function useDataCssStatus(): 'loading' | 'ready' | 'error';

export {
  initDataCss,
  getDataCssStatus,
  whenDataCssReady,
  onDataCssReady,
  onDataCssUpdate,
  nextDataCssUpdate,
  stopDataCss,
  startDataCss,
} from './index.js';
export type { DataCssStatus } from './index.js';
