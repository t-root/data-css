# data-css-js

`data-css-js` is the framework-agnostic browser runtime for the `data-css` DSL. It compiles `data-css`, `data-pc-*`, and `data-pe-*` attributes into generated CSS at runtime.

## Browser use

Serve this directory through a web server, then initialize it explicitly:

```html
<script type="module">
  import { initDataCss } from './index.js';
  await initDataCss({ assetBase: './assets' });
</script>
```

## Package use

Copy the configurable assets to the host application's public directory:

```sh
node node_modules/data-css-js/copy-assets.cjs
```

Then initialize with the matching public path:

```js
import { initDataCss } from 'data-css-js';

initDataCss({ assetBase: '/data-css-js' });
```

`assetBase` contains `config.json`, `groups/*.json`, `base.css`, and the default `overrides.css`. `config.json` is a runtime manifest; CSS DSL definitions remain in individual group files. Set `config.assets.overrides` to `null` only when you deliberately want to skip the override stylesheet. Use `--target <path>` with the copy command to choose another directory.

The public entry is safe to import outside a browser; it returns `false` instead of loading the DOM runtime.
TypeScript declarations are bundled with the package.

## Lifecycle

`await initDataCss()` resolves `true` after the initial DOM scan and CSS insertion, or `false` when the configuration cannot be loaded. The package also exports lifecycle helpers that are bound to this runtime, may be called before `initDataCss()`, and return an unsubscribe function:

```js
import { initDataCss, onDataCssReady, onDataCssUpdate, nextDataCssUpdate, getDataCssStatus } from 'data-css-js';

onDataCssReady(ready => (ready ? initializeWidgets() : showFallback()));
const off = onDataCssUpdate(() => refreshDynamicUi()); // fires on every later CSS insertion
await initDataCss({ assetBase: '/data-css-js' });

container.append(card);
await nextDataCssUpdate(); // card is styled now
getDataCssStatus();        // 'idle' | 'loading' | 'ready' | 'error'
off();
```

`whenDataCssReady()` returns the startup promise. `stopDataCss()` pauses DOM observation for this package only; `startDataCss()` or another `initDataCss()` call resumes it. Outside a browser every helper is inert.

The page-wide `window.dataCssReady`, `window.dataCssReadyAgain`, `window.whenDataCssReady`, `window.destroyDataCss`, `window.startDataCss` globals and the `dataCssReady` / `dataCssReadyAgain` / `dataCssError` events remain for backward compatibility but are deprecated: they exist only after the runtime loads, `dataCssReadyAgain` fires once per registration, and with two runtimes they control whichever loaded last.

## Runtime options

`data-css` keeps its source attributes by default, so changing `data-css`, `data-pc-*`, or `data-pe-*` later recompiles the element. For an immutable, static page, pass `stripAttributes: true` to remove them after compilation. Use `debug: true` during development to enable syntax diagnostics.

```js
await initDataCss({ assetBase: '/data-css-js', debug: import.meta.env?.DEV, stripAttributes: false });
```

## Static build / SSR

For public pages, generate HTML classes and a static stylesheet so no browser runtime is needed for the initial render:

```sh
npx data-css-js-build src/page.html --out dist/page.html --css dist/page.data-css.css
```

The builder preserves an explicit `name[...]` class, otherwise creates a deterministic class. It strips data-css attributes in its output by default and adds the generated stylesheet link to `<head>`.

## Multiple runtimes

`data-css-js` and `data-css-react` can coexist when each owns a separate DOM subtree. Pass `root` on their first initialization; each runtime keeps its options, lifecycle and generated styles isolated, so both may initialize concurrently.

```js
await initDataCss({ assetBase: '/data-css-js', root: document.querySelector('#legacy-widget') });
```

## Security boundary

Treat `data-css`, `data-pc-*`, and `data-pe-*` values as application-authored styling, not as untrusted user input. The runtime validates generated class names and escapes pseudo-element strings, but a trusted configuration can intentionally allow CSS values that load external resources.
