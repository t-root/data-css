/**
 * SSR-safe public entry point. Importing the package on the server is a no-op;
 * the DOM runtime is loaded only in a browser.
 */
import { initDataCss } from './internal/client.js';

export { initDataCss };

// Preserve the original `import 'data-css-react'` integration style while
// remaining safe when evaluated by an SSR runtime.
void initDataCss();
