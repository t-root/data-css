// Generated from core/. Edit core files, then run node scripts/build-package.cjs.
export const DATA_CSS_CLASS_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export function isValidDataCssClassName(value) {
  return typeof value === 'string' && DATA_CSS_CLASS_NAME.test(value);
}

export function escapeCssString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, '\\A ');
}
