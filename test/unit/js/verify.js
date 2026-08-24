import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { initDataCss } from '../../../dist/data-css-js/index.js';
import { escapeCssString, isValidDataCssClassName } from '../../../dist/data-css-js/internal/security.js';
import { compileDataCss, convertWUnits } from '../../../dist/data-css-js/internal/compiler.js';

const require = createRequire(import.meta.url);
const { copyAssets } = require('../../../dist/data-css-js/copy-assets.cjs');
const { buildDataCssHtml, loadDataCssConfig } = require('../../../dist/data-css-js/build.cjs');

assert.equal(await initDataCss(), false, 'non-browser import should be a no-op');
assert.equal(isValidDataCssClassName('product_card-2'), true);
assert.equal(isValidDataCssClassName('bad selector]'), false);
assert.equal(escapeCssString("O'Reilly\nnext"), "O\\'Reilly\\A next");
assert.equal(convertWUnits('-20w 10width', 400), '-5.00000vw 10width');

const configPath = fileURLToPath(new URL('../../../dist/data-css-js/assets/config.json', import.meta.url));
const config = loadDataCssConfig(configPath);
assert.equal(config.group.text.ellipsis.bindings.textOverflow, 'ellipsis');
assert.equal(config.group.box.inlineGrid.bindings.display, 'inline-grid');
assert.equal(config.group.cursor.allScroll.bindings.cursor, 'all-scroll');
assert.equal(config.assets.base, 'base.css');
assert.equal(config.assets.overrides, 'overrides.css');
assert.deepEqual(config.groups, ['text', 'box', 'pos', 'anim', 'tf', 'cursor']);

const regularRules = compileDataCss('text[cl:#123|size:20w|lineThrough] box[inlineGrid]', '.card', config, 450);
assert.deepEqual(regularRules, [
  { selector: '.card', property: 'color', value: '#123', mediaQuery: null },
  { selector: '.card', property: 'font-size', value: '1.04167vw', mediaQuery: null },
  { selector: '.card', property: 'text-decoration', value: 'line-through', mediaQuery: null },
  { selector: '.card', property: 'display', value: 'inline-grid', mediaQuery: null },
]);

const responsiveRules = compileDataCss('all{text[cl:#111]} mobile{box[p:20w]}', '.card', config, 450);
assert.equal(responsiveRules[0].mediaQuery, null);
assert.equal(responsiveRules[1].mediaQuery, '(max-width: 700px)');
assert.equal(responsiveRules[1].value, '4.44444vw');

const mixedRules = compileDataCss('box[m:32px] mobile{box[m:64px]}', '.card', config, 450);
assert.equal(mixedRules.length, 2);
assert.equal(mixedRules[0].value, '32px');
assert.equal(mixedRules[1].value, '64px');
assert.deepEqual(compileDataCss('text[cl:#123]', '.card', { group: config.group, devices: {} }, 450), [
  { selector: '.card', property: 'color', value: '#123', mediaQuery: null },
]);
assert.deepEqual(compileDataCss('text[cl:#123]', '', config, 450), []);

const staticBuild = await buildDataCssHtml({
  html: '<main data-css="text[cl:#123|size:calc(10w_+_2px)] box[p:-20w]">Demo</main>',
  config,
});
assert.match(staticBuild.html, /class="dc-[a-f0-9]+"/);
assert.doesNotMatch(staticBuild.html, /data-css=/);
assert.match(staticBuild.css, /calc\(0\.52083vw \+ 2px\)/);
assert.match(staticBuild.css, /padding: -1\.04167vw/);

const target = mkdtempSync(join(tmpdir(), 'data-css-js-'));
try {
  copyAssets({ targetPath: target });
  for (const fileName of ['config.json', 'base.css', 'overrides.css']) {
    assert.equal(existsSync(join(target, fileName)), true, `${fileName} was not copied`);
  }
  assert.equal(existsSync(join(target, 'groups', 'box.json')), true, 'syntax groups were copied');
} finally {
  rmSync(target, { recursive: true, force: true });
}

console.log('SSR entry and asset copier verified.');
