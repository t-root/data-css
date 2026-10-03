/** Public, SSR-safe entry point for the browser runtime. */
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
