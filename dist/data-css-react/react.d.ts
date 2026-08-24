import type { ReactNode } from 'react';
import type { DataCssInitOptions } from './index.js';

export interface DataCssProviderProps extends DataCssInitOptions {
  children?: ReactNode;
  onReady?: () => void;
  onError?: () => void;
}

export function DataCssProvider(props: DataCssProviderProps): ReactNode;
export { initDataCss } from './index.js';
