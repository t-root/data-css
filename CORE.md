# Shared core workflow

`core/` is the source of truth for the shared engine, including validation. `templates/` holds package-specific metadata and wrappers; `profiles/shared/assets/` holds default public styles; `profiles/shared/config/` holds runtime settings and CSS group definitions split by domain. The build writes a small public `assets/config.json` manifest and keeps each definition in `assets/groups/*.json`. `profiles/js.json` and `profiles/react.json` hold package build settings. A profile may optionally contain `profiles/<name>/assets/` to override an individual shared asset. `test/` holds regression fixtures. Publishable package artifacts are generated under `dist/`.

```sh
node scripts/build-package.cjs js
node scripts/build-package.cjs react
node scripts/build-package.cjs all
```

Each profile supplies runtime settings and its default asset path. Package wrappers, metadata, and documentation live under `templates/`; shared static assets live under `profiles/shared/assets/`; tests live under `test/`. Publish only from `dist/data-css-js` or `dist/data-css-react`.

Generated packages keep only their public entry files at the top level. Runtime, compiler, parser, security, and validation modules are placed in `internal/`; default public assets are placed in `assets/`.

```sh
npm pack ./dist/data-css-js --dry-run
npm pack ./dist/data-css-react --dry-run
```
