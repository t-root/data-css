import { expect, test } from '@playwright/test';

for (const [packageName, fixtureName] of [['data-css-js', 'js'], ['data-css-react', 'react']]) {
  test(`${packageName} applies initial and dynamic CSS`, async ({ page }) => {
    await page.goto(`/test/fixtures/${fixtureName}/browser-lifecycle-fixture.html`);
    const body = page.locator('body');
    await expect(body).toHaveAttribute('data-started', 'true');
    await expect(body).toHaveAttribute('data-late-ready-callback', 'true');
    await expect(body).toHaveAttribute('data-dynamic-css', 'true');
    await expect(body).toHaveAttribute('data-updated-css', 'true');
    await expect(body).toHaveAttribute('data-source-retained', 'true');
    await expect(page.locator('link[data-data-css-asset]')).toHaveCount(2);
  });
}

test('JS and React runtimes remain isolated by root', async ({ page }) => {
  await page.goto('/test/fixtures/js/browser-multi-fixture.html');
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-ready', 'true');
  await expect(body).toHaveAttribute('data-js-css', 'true');
  await expect(body).toHaveAttribute('data-react-css', 'true');
  await expect(page.locator('style[data-data-css-runtime="data-css-js"]')).toHaveCount(2);
  await expect(page.locator('style[data-data-css-runtime="data-css-react"]')).toHaveCount(2);
});

test('optional overrides load only when declared and retain final precedence', async ({ page }) => {
  await page.goto('/test/fixtures/assets/browser-overrides-fixture.html');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('link[data-data-css-asset]')).toHaveCount(2);
  await expect(page.locator('link[data-data-css-asset="data-css-js:base"]')).toHaveAttribute('href', /base\.css$/);
  await expect(page.locator('link[data-data-css-asset="data-css-js:overrides"]')).toHaveAttribute('href', /overrides\.css$/);
  await expect(page.locator('.fixture-card')).toHaveCSS('color', 'rgb(68, 85, 102)');
});

const fixtureResults = async page => {
  await expect(page.locator('body')).toHaveAttribute('data-results', /.+/);
  return JSON.parse(await page.locator('body').getAttribute('data-results'));
};

test('exported lifecycle API supports early, late, persistent and scoped use', async ({ page }) => {
  await page.goto('/test/fixtures/js/browser-api-fixture.html');
  expect(await fixtureResults(page)).toEqual({
    statusBefore: 'idle',
    started: true,
    early: true,
    whenBefore: true,
    statusAfter: 'ready',
    late: true,
    updatesWhileSubscribed: 2,
    firstStyled: '700',
    updatesAfterUnsubscribe: 2,
    stoppedHasClass: false,
    resumedHasClass: true,
    cancelledCalls: 0,
    internalGlobals: [],
  });
});

test('lifecycle API reports configuration failures to early and late subscribers', async ({ page }) => {
  await page.goto('/test/fixtures/js/browser-error-fixture.html');
  expect(await fixtureResults(page)).toEqual({
    started: false,
    viaCallback: false,
    status: 'error',
    late: false,
    when: false,
  });
});

test('concurrent package initialization keeps options and stop/start isolated', async ({ page }) => {
  await page.goto('/test/fixtures/js/browser-multi-api-fixture.html');
  expect(await fixtureResults(page)).toEqual({
    ready: true,
    jsInitialCss: true,
    reactInitialCss: true,
    jsStopped: true,
    reactRunning: true,
  });
});
