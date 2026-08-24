#!/usr/bin/env node
const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { dirname, relative, resolve } = require('node:path');

const validClassName = /^[A-Za-z_][A-Za-z0-9_-]*$/;

function loadDataCssConfig(configPath) {
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (config.group) return config;
  if (!Array.isArray(config.groups) || config.groups.length === 0) {
    throw new Error('Configuration does not declare any syntax groups');
  }
  config.group = Object.fromEntries(config.groups.map(name => {
    if (!/^[a-z][a-z0-9_-]*$/i.test(name)) throw new Error(`Invalid syntax group name "${name}"`);
    const groupPath = resolve(dirname(configPath), 'groups', `${name}.json`);
    return [name, JSON.parse(readFileSync(groupPath, 'utf8'))];
  }));
  return config;
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 10);
}

function attributesFromTag(tag) {
  const attributes = new Map();
  const expression = /\s([:@A-Za-z_][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = expression.exec(tag)) !== null) {
    attributes.set(match[1], match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function stripControlValue(value, key) {
  const expression = new RegExp(`${key}\\[([^\\]]*)\\]`);
  const match = expression.exec(value);
  return [match?.[1] ?? null, value.replace(new RegExp(`${key}\\[[^\\]]*\\]`, 'g'), '').replace(/\s+/g, '')];
}

function appendClass(tag, className) {
  if (/\sclass\s*=/.test(tag)) {
    return tag.replace(/\sclass\s*=\s*("([^"]*)"|'([^']*)')/, (_, quoted, doubleQuoted, singleQuoted) => {
      const current = doubleQuoted ?? singleQuoted ?? '';
      return ` class="${[...new Set([...current.split(/\s+/).filter(Boolean), className])].join(' ')}"`;
    });
  }
  return tag.replace(/(\/?)>$/, ` class="${className}"$1>`);
}

function removeDataCssAttributes(tag) {
  return tag.replace(/\sdata-(?:css|pc-[\w-]+|pe-[\w-]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g, '');
}

function addRules(target, rules) {
  for (const { selector, property, value, mediaQuery } of rules) {
    const bucketKey = mediaQuery || '';
    if (!target.has(bucketKey)) target.set(bucketKey, new Map());
    const bucket = target.get(bucketKey);
    if (!bucket.has(selector)) bucket.set(selector, new Map());
    bucket.get(selector).set(property, value);
  }
}

function formatCss(rules) {
  const formatBucket = (bucket, indent = '') => [...bucket.entries()].map(([selector, properties]) => (
    `${indent}${selector} {\n${[...properties.entries()].map(([property, value]) => `${indent}  ${property}: ${value};`).join('\n')}\n${indent}}`
  )).join('\n\n');

  let css = formatBucket(rules.get('') || new Map());
  for (const [mediaQuery, bucket] of rules) {
    if (!mediaQuery) continue;
    css += `${css ? '\n\n' : ''}@media ${mediaQuery} {\n${formatBucket(bucket, '  ')}\n}`;
  }
  return `${css}\n`;
}

/** Builds static CSS and transformed HTML from data-css attributes. */
async function buildDataCssHtml({ html, config, stripAttributes = true }) {
  const { compileDataCss } = await import('__DATA_CSS_INTERNAL_PATH__/compiler.js');
  const { escapeCssString } = await import('__DATA_CSS_INTERNAL_PATH__/security.js');
  const rules = new Map();
  const fallbackPixel = Math.max(...Object.values(config.devices || {}).map(device => Number(device.pixelCSS)).filter(Number.isFinite));
  let occurrence = 0;

  const output = html.replace(/<[A-Za-z][\w:-]*(?:\s[^<>]*?)?\/?>/g, tag => {
    const attributes = attributesFromTag(tag);
    const dataCss = attributes.get('data-css');
    if (dataCss === undefined || !dataCss.trim()) return tag;

    const [namedClass, content] = stripControlValue(dataCss, 'name');
    const className = namedClass && validClassName.test(namedClass)
      ? namedClass
      : `dc-${hash(`${occurrence}:${dataCss}:${[...attributes.entries()].filter(([name]) => name.startsWith('data-p')).join('|')}`)}`;
    occurrence += 1;
    addRules(rules, compileDataCss(content, `.${className}`, config, fallbackPixel));

    for (const [name, value] of attributes) {
      if (!name.startsWith('data-pc-') && !name.startsWith('data-pe-')) continue;
      const pseudo = name.slice(8);
      if (!/^[a-z][a-z0-9-]*$/i.test(pseudo)) continue;
      if (name.startsWith('data-pe-')) {
        const [text, pseudoContent] = stripControlValue(value, 'content');
        const selector = `.${className}::${pseudo}`;
        if (pseudo === 'before' || pseudo === 'after') {
          addRules(rules, [{ selector, property: 'content', value: `'${escapeCssString(text ?? '')}'`, mediaQuery: null }]);
        }
        addRules(rules, compileDataCss(pseudoContent, selector, config, fallbackPixel));
      } else {
        const [parent, withoutParent] = stripControlValue(value, 'parent');
        const [children, pseudoContent] = stripControlValue(withoutParent, 'children');
        const selector = parent ? `${parent}:${pseudo} .${className}`
          : children ? `.${className} ${children}:${pseudo}`
            : `.${className}:${pseudo}`;
        addRules(rules, compileDataCss(pseudoContent, selector, config, fallbackPixel));
      }
    }

    const withClass = appendClass(tag, className);
    return stripAttributes ? removeDataCssAttributes(withClass) : withClass;
  });

  return { html: output, css: formatCss(rules) };
}

async function runCli() {
  const [inputPath, ...args] = process.argv.slice(2);
  if (!inputPath) throw new Error('Usage: data-css-build <input.html> [--out output.html] [--css output.css] [--config config.json]');
  const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  const outputPath = resolve(option('--out', inputPath.replace(/\.html?$/i, '.built.html')));
  const cssPath = resolve(option('--css', outputPath.replace(/\.html?$/i, '.data-css.css')));
  const configPath = resolve(option('--config', require('node:path').join(__dirname, 'assets', 'config.json')));
  const result = await buildDataCssHtml({ html: readFileSync(inputPath, 'utf8'), config: loadDataCssConfig(configPath) });
  const href = relative(dirname(outputPath), cssPath).replace(/\\/g, '/') || require('node:path').basename(cssPath);
  const linkedHtml = result.html.includes('</head>')
    ? result.html.replace('</head>', `  <link rel="stylesheet" href="${href}">\n</head>`)
    : `<link rel="stylesheet" href="${href}">\n${result.html}`;
  writeFileSync(cssPath, result.css);
  writeFileSync(outputPath, linkedHtml);
  process.stdout.write(`Built ${outputPath} and ${cssPath}\n`);
}

module.exports = { buildDataCssHtml, loadDataCssConfig };
if (require.main === module) runCli().catch(error => { console.error(error.message); process.exitCode = 1; });
