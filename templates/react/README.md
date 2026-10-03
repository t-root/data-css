# data-css-react

`data-css-react` lets React components use the configurable `data-css` styling DSL directly in JSX. It is generated from the shared `data-css` core and is safe to import in SSR environments.

## Install

```sh
npm install data-css-react
node node_modules/data-css-react/copy-assets.cjs
```

The copy command creates `public/data-css-react/` containing:

```text
config.json  # Runtime settings, breakpoints and a syntax-group manifest
groups/      # One JSON file per CSS DSL group
base.css     # CSS loaded before generated rules
overrides.css # Optional CSS loaded after generated rules when declared in config
```

Use another destination when required:

```sh
node node_modules/data-css-react/copy-assets.cjs --target public/styles/data-css
```

## Recommended React integration

Use `DataCssProvider` to initialize after React mounts. This makes the public asset URL and lifecycle explicit.

```jsx
import { DataCssProvider } from 'data-css-react/react';

export default function App() {
  return (
    <DataCssProvider
      assetBase="/data-css-react"
      debug={import.meta.env.DEV}
      onReady={() => console.log('data-css ready')}
      onError={() => console.error('data-css could not load its configuration')}
    >
      <ProductCard />
    </DataCssProvider>
  );
}

function ProductCard() {
  return (
    <article data-css="box[p:20px|radius:12px|shadow:0_8px_24px_rgba(0,0,0,0.12)]">
      <h2 data-css="text[size:20px|bold|cl:#172033]">Headphones</h2>
      <button
        data-css="name[buy-button] box[p:10px_14px|radius:8px|bgColor:#1976d2] text[cl:#fff|bold]"
        data-pc-hover="box[bgColor:#125ea9]"
      >
        Buy now
      </button>
    </article>
  );
}
```

`assetBase` must point to the public directory that contains `config.json`, `groups/*.json`, `base.css`, and the default `overrides.css`. Set `config.assets.overrides` to `null` only when you deliberately want to skip the override stylesheet. The Provider also accepts `stripAttributes` and `root`, plus `onReady` and `onError`.

For a simple client-only app, a side-effect import is also available:

```jsx
import 'data-css-react';
```

The import is SSR-safe: it does not load the DOM runtime on the server.

## DSL quick reference

```jsx
<div data-css="text[cl:#1976d2|size:18px|bold] box[flex|p:12px|radius:8px]">
  Styled content
</div>
```

- `group[key:value|binding]`: one or more properties in a configured group.
- `_` represents a space in a CSS value: `border:1px_solid_#ddd`.
- `name[card]` creates a stable generated class name.
- `data-pc-hover`, `data-pc-focus`, and similar attributes create pseudo-class rules.
- `data-pe-before` and `data-pe-after` create pseudo-element rules; use `content[TEXT]` for their content.
- Use `all{...}`, `mobile{...}`, `tablet{...}`, `desktop{...}` for responsive rules. Names and media queries come from `config.json`.

```jsx
<section
  data-css="
    all{box[grid|gap:12px]}
    mobile{box[gridBoxC:1fr]}
    desktop{box[gridBoxC:repeat(4,1fr)]}
  "
/>
```

## API

```ts
type DataCssInitOptions = {
  assetBase?: string;
  debug?: boolean;
  stripAttributes?: boolean;
  root?: Element | Document;
};

function initDataCss(options?: DataCssInitOptions): Promise<boolean>;
```

The first initialization owns these options; later calls cannot change the asset base or root. `await initDataCss()` resolves only after the initial scan and CSS insertion complete.

Lifecycle helpers are exported from both `data-css-react` and `data-css-react/react`. They are bound to this package's runtime, may be called before initialization, and return an unsubscribe function:

```js
import { onDataCssReady, onDataCssUpdate, nextDataCssUpdate, stopDataCss, startDataCss } from 'data-css-react/react';

onDataCssReady(ready => (ready ? startWidgets() : showConfigurationError()));
const off = onDataCssUpdate(() => refreshDynamicUi()); // every later CSS insertion
await nextDataCssUpdate(); // resolves after the next CSS insertion
```

In components, read the status with a hook:

```jsx
import { useDataCssStatus } from 'data-css-react/react';

function Widget() {
  const status = useDataCssStatus(); // 'loading' | 'ready' | 'error'
  return status === 'error' ? <Fallback /> : <Chart ready={status === 'ready'} />;
}
```

`stopDataCss()` pauses DOM observation for this package only; `startDataCss()` resumes it. The `window.dataCssReady`, `window.dataCssReadyAgain`, `window.destroyDataCss` and `window.startDataCss` globals still work but are deprecated.

## Performance and SSR

- Source attributes remain by default, allowing React updates and DOM mutations to be compiled. Set `stripAttributes` only for immutable pages.
- Pass `root` to limit scanning to a single subtree or micro-frontend.
- Development validation is loaded only when `debug` or `config.devMode` is enabled, so production avoids downloading diagnostics.
- For LCP- or SEO-critical output, compile rendered HTML ahead of time:

```sh
npx data-css-react-build page.html --out dist/page.html --css dist/page.data-css.css
```

The static builder creates classes and stylesheet rules without needing the runtime on the initial render.

## Security

Treat `data-css`, `data-pc-*`, and `data-pe-*` values as application-authored styling. Do not pass untrusted user input directly into these attributes.

## License

MIT
