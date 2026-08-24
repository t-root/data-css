// Generated from core/. Edit core files, then run node scripts/build-package.cjs.
// Tự động tìm đường dẫn base của module
import { escapeCssString, isValidDataCssClassName } from './security.js';
import { compileDataCss } from './compiler.js';

function getBasePath() {
    // Nếu có import.meta.url (ES modules)
    if (typeof import.meta !== 'undefined' && import.meta.url) {
        const url = new URL(import.meta.url);
        const path = url.pathname;
        // Lấy thư mục chứa index.js
        const baseDir = path.substring(0, path.lastIndexOf('/'));
        return baseDir;
    }
    // Fallback: Tìm script tag hiện tại
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
        const script = scripts[i];
        if (script.src) {
            const url = new URL(script.src, window.location.href);
            const path = url.pathname;
            const baseDir = path.substring(0, path.lastIndexOf('/'));
            return baseDir;
        }
    }
    // Fallback cuối cùng: dùng đường dẫn tương đối
    return '';
}

const basePath = getBasePath();
const assetBase = (window.__DATA_CSS_ASSET_BASE__ || '/data-css-react').replace(/\/$/, '');
const runtimeName = 'data-css-react';
const configStorageKey = `${runtimeName}:config:${assetBase}`;
const shouldStripAttributes = Boolean(window.__DATA_CSS_STRIP_ATTRIBUTES__);
const runtimeRoot = window.__DATA_CSS_ROOT__ || document;

const runtimeRegistry = window.__dataCssRuntimes || (window.__dataCssRuntimes = {});
const lifecycle = runtimeRegistry[runtimeName] || {
    status: 'loading', ready: false, resolveReady: null, readyPromise: null
};
runtimeRegistry[runtimeName] = lifecycle;
window.__dataCssLifecycle = lifecycle; // Backward-compatible alias for single-runtime pages.
if (!lifecycle.readyPromise) {
    lifecycle.readyPromise = new Promise(resolve => { lifecycle.resolveReady = resolve; });
}
window.__dataCssReady = lifecycle.ready;
window.whenDataCssReady = () => lifecycle.readyPromise;

function completeDataCssStartup(success) {
    if (lifecycle.status !== 'loading') return;
    lifecycle.status = success ? 'ready' : 'error';
    lifecycle.ready = success;
    window.__dataCssReady = success;
    lifecycle.resolveReady?.(success);
}

function emitDataCssEvent(type) {
    document.dispatchEvent(new Event(type));
    document.dispatchEvent(new CustomEvent(`${type}:${runtimeName}`, { detail: { runtime: runtimeName } }));
}

function readSessionValue(key) {
    try { return window.sessionStorage.getItem(key); } catch { return null; }
}

function writeSessionValue(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch { /* Storage may be unavailable. */ }
}

function removeSessionValue(key) {
    try { window.sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
}

// Load validateCssSyntax động dựa trên basePath
let usedNames = new Set();
let config;
let isDevMode;
// The validator is a development-only module. Keeping it lazy avoids loading
// nearly 20 KB of diagnostics in production browsers.
let validateCssSyntax = () => {};
let devicePixel; 
let tempC = document.createElement('sampleClass');
let tempE = document.createElement('template');

// Object lưu CSS rules cho từng device

let countStyle = 0;
let observerOptions = null;

//START FUNCTION CREATE CLASS
{
    window.generateRandomClassName = () => {
        const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        let className = '';
        const firstCharacterIndex = Math.floor(Math.random() * characters.length);
        className += characters[firstCharacterIndex];
        for (let i = 1; i < 10; i++) {
            const randomIndex = Math.floor(Math.random() * (characters.length + numbers.length));
            if (randomIndex < characters.length) {
                className += characters[randomIndex];
            } else {
                className += numbers[randomIndex - characters.length];
            }
        }
        return className;
    }
    // ====================================================================================================
    window.processClassName = function (name) {
        let className = name || generateRandomClassName();
        if (name && !isValidDataCssClassName(name)) {
            console.error(`Invalid data-css name "${name}". A generated class name was used instead.`);
            className = generateRandomClassName();
        }
        if (!name) {
            while (usedNames.has(className)) {
                className = generateRandomClassName();
            }
        }
        usedNames.add(className);
        return className;
    }
}
//END FUNCTION CREATE CLASS

function extractUnique(attrValue, keyword) {
    attrValue = String(attrValue ?? '');
    const regex = new RegExp(`${keyword}\\[([^\\]]+)\\]`);
    const match = attrValue.match(regex);
    const extracted = match ? match[1] : null;
    const cleaned = attrValue.replace(new RegExp(`${keyword}\\[[^\\]]*\\]`, 'g'), '').replace(/\s+/g, '');
    return [extracted, cleaned];
}

// CSS Rule Management
const cssRuleManager = {
    collectedRules: {},
    collectedMediaRules: {},

    addRule(selector, prop, value, mediaQuery = null, device = 'all') {
        if (mediaQuery) {
            // Loại bỏ @media nếu có ở đầu
            let mq = mediaQuery.trim();
            if (mq.startsWith('@media')) {
                mq = mq.replace(/^@media\s*/, '');
            }
            if (!this.collectedMediaRules[mq]) this.collectedMediaRules[mq] = {};
            if (!this.collectedMediaRules[mq][selector]) this.collectedMediaRules[mq][selector] = {};
            this.collectedMediaRules[mq][selector][prop] = value;
        } else {
            if (!this.collectedRules[selector]) this.collectedRules[selector] = {};
            this.collectedRules[selector][prop] = value;
        }
    },

    formatCSS(type, mediaQuery = null) {
        let css = '';

        if (!type) {
            // Chỉ xử lý regular rules (không có media)
            for (const selector in this.collectedRules) {
                css += `${selector} {\n`;
                for (const [prop, value] of Object.entries(this.collectedRules[selector])) {
                    css += `    ${prop}: ${value};\n`;
                }
                css += '}\n\n';
            }
        } else if (type === 'media') {
            // Chỉ xử lý media cho device cụ thể
            if (mediaQuery && this.collectedMediaRules[mediaQuery]) {
                css += `@media ${mediaQuery} {\n`;
                for (const selector in this.collectedMediaRules[mediaQuery]) {
                    css += `    ${selector} {\n`;
                    for (const [prop, value] of Object.entries(this.collectedMediaRules[mediaQuery][selector])) {
                        css += `        ${prop}: ${value};\n`;
                    }
                    css += '    }\n';
                }
                css += '}\n\n';
            }
        }

        return css;
    },

};

function waitForStylesheet(link) {
    if (!link || link.dataset.dataCssAssetStatus || link.sheet) return Promise.resolve();
    return new Promise(resolve => {
        let settled = false;
        let timeout;
        const finish = (status) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            link.dataset.dataCssAssetStatus = status;
            resolve();
        };
        link.addEventListener('load', () => finish('loaded'), { once: true });
        link.addEventListener('error', () => finish('error'), { once: true });
        timeout = setTimeout(() => finish('timeout'), 3000);
    });
}

function waitForStaticAssets() {
    return Promise.all([
        waitForStylesheet(document.querySelector(`link[data-data-css-asset="${runtimeName}:base"]`)),
        waitForStylesheet(document.querySelector(`link[data-data-css-asset="${runtimeName}:overrides"]`))
    ]);
}

//START PROCESSDEVICES
{
    window.detectDevice = function (devices) {
        const width = window.innerWidth;
        // Tạo mảng các device từ object
        const deviceArr = Object.entries(devices)
            .map(([key, val]) => ({
                key,
                pixel: parseInt(val.pixelCSS),
                query: val.query,
                isDefault: !!val.default
            }))
            .filter(d => !isNaN(d.pixel))
            .sort((a, b) => a.pixel - b.pixel);

        for (let i = 0; i < deviceArr.length; i++) {
            if (width <= deviceArr[i].pixel) {
                return deviceArr[i].pixel;
            }
        }
        const defaultDevice = deviceArr.find(d => d.isDefault);
        if (defaultDevice) return defaultDevice.pixel;
        return deviceArr[deviceArr.length - 1].pixel;
    }
    // Sửa updateStylesheet để nhận device
    window.updateStylesheet = function () {
        let emittedCSS = false;
        const staticAssets = config.assets || {};
        const baseFile = staticAssets.base || 'base.css';
        const overridesFile = typeof staticAssets.overrides === 'string' && staticAssets.overrides.trim()
            ? staticAssets.overrides.trim()
            : null;
        let baseLink = document.querySelector(`link[data-data-css-asset="${runtimeName}:base"]`);
        if (!baseLink) {
            baseLink = document.createElement('link');
            baseLink.rel = 'stylesheet';
            baseLink.href = `${assetBase}/${baseFile}`;
            baseLink.dataset.dataCssAsset = `${runtimeName}:base`;
            document.head.appendChild(baseLink);
        }
        let overridesLink = document.querySelector(`link[data-data-css-asset="${runtimeName}:overrides"]`);
        if (overridesFile && !overridesLink) {
            overridesLink = document.createElement('link');
            overridesLink.rel = 'stylesheet';
            overridesLink.href = `${assetBase}/${overridesFile}`;
            overridesLink.dataset.dataCssAsset = `${runtimeName}:overrides`;
            document.head.appendChild(overridesLink);
        }

        // Tạo CSS cho regular rules (device 'all')
        if (isDevMode) {
            const regularCSS = cssRuleManager.formatCSS();
            if (regularCSS && regularCSS.trim().length > 0) {
                const style = document.createElement('style');
                style.setAttribute('data-css-device', 'all');
                style.setAttribute('data-css-id', countStyle);
                style.dataset.dataCssRuntime = runtimeName;
                style.textContent = regularCSS;
                emittedCSS = true;

                // Chèn style mới vào đúng vị trí 
                if (overridesLink) {
                    overridesLink.parentNode.insertBefore(style, overridesLink);
                } else {
                    document.head.appendChild(style);
                }
            }

            // Tạo CSS riêng cho từng media query (device)
            for (const mediaQuery in cssRuleManager.collectedMediaRules) {
                const deviceCSS = cssRuleManager.formatCSS('media', mediaQuery);
                if (deviceCSS && deviceCSS.trim().length > 0) {
                    const style = document.createElement('style');

                    // Tìm tên device từ media query
                    let deviceName = 'unknown';
                    for (const [deviceKey, deviceConfig] of Object.entries(config.devices || {})) {
                        if (deviceConfig.query === mediaQuery) {
                            deviceName = deviceKey;
                            break;
                        }
                    }

                    style.setAttribute('data-css-device', deviceName);
                    style.setAttribute('data-css-id', countStyle);
                    style.dataset.dataCssRuntime = runtimeName;
                    style.textContent = deviceCSS;
                    emittedCSS = true;

                    // Chèn style mới vào đúng vị trí 
                    if (overridesLink) {
                        overridesLink.parentNode.insertBefore(style, overridesLink);
                    } else {
                        document.head.appendChild(style);
                    }
                }
            }
        } else {
            // Nếu không phải dev mode, gộp collectedRules và collectedMediaRules lại và đẩy lên 1 thẻ style
            let allCSS = '';
            const regularCSS = cssRuleManager.formatCSS();
            if (regularCSS && regularCSS.trim().length > 0) {
                allCSS += regularCSS;
            }
            for (const mediaQuery in cssRuleManager.collectedMediaRules) {
                const deviceCSS = cssRuleManager.formatCSS('media', mediaQuery);
                if (deviceCSS && deviceCSS.trim().length > 0) {
                    allCSS += deviceCSS;
                }
            }
            if (allCSS.trim().length > 0) {
                const style = document.createElement('style');
                style.setAttribute('data-css-id', countStyle);
                style.dataset.dataCssRuntime = runtimeName;
                style.textContent = allCSS;
                emittedCSS = true;
                if (overridesLink) {
                    overridesLink.parentNode.insertBefore(style, overridesLink);
                } else {
                    document.head.appendChild(style);
                }
            }
        }

        if (emittedCSS) countStyle++;

        // Clear collected rules sau khi update


        cssRuleManager.collectedRules = {};
        cssRuleManager.collectedMediaRules = {};
    }



    // Sửa processDevices để update stylesheet theo device
    window.processDevices = function (content, selector, config, devicePixel) {
        for (const rule of compileDataCss(content, selector, config, devicePixel)) {
            cssRuleManager.addRule(rule.selector, rule.property, rule.value, rule.mediaQuery);
        }
    }
}
//END PROCESSDEVICES

function cleanupDataAttributes(element) {
    element.removeAttribute('data-css');
    Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('data-pc-') || attr.name.startsWith('data-pe-'))
        .forEach(attr => element.removeAttribute(attr.name));
}

//STARTSTART CLEAR STYLE DATA-CSS-ID
{

    let cleanupTimeout = null;
    let pendingCleanupIds = new Set(); // Set để lưu cssId

    // Hàm xóa CSS element khi phần tử bị xóa
    window.removeCssElement = function (cssId) {
        if (!cssId) return;

        // Thêm cssId vào danh sách chờ cleanup
        pendingCleanupIds.add(cssId);

        // Chỉ tạo timeout mới nếu chưa có timeout nào đang chạy
        if (!cleanupTimeout) {
            cleanupTimeout = setTimeout(() => {
                performCleanup();
            }, 0);
        }
        // Nếu đã có timeout đang chạy thì bỏ qua, không reset
    }

    // Hàm thực hiện cleanup sau 1 phút
    function performCleanup() {
        if (pendingCleanupIds.size === 0) return;

        // Lấy tất cả style tags có data-css-id
        const styleTags = document.querySelectorAll(`style[data-css-id][data-data-css-runtime="${runtimeName}"]`);

        styleTags.forEach(styleTag => {
            const cssId = styleTag.getAttribute('data-css-id');

            // Chỉ xử lý những style tag có cssId trong danh sách chờ
            if (pendingCleanupIds.has(cssId)) {
                // Kiểm tra xem còn element nào khác (không phải style tag) có data-css-id trùng không
                const elementsWithSameId = document.querySelectorAll(`*:not(style)[data-css-id="${cssId}"]`);

                // Nếu không còn element nào khác có data-css-id trùng, xóa style tag
                if (elementsWithSameId.length === 0) {
                    styleTag.remove();
                }
            }
        });

        // Reset danh sách chờ
        pendingCleanupIds.clear();
        cleanupTimeout = null;
    }
}
//END CLEAR STYLE DATA-CSS-ID


function processCssElement(element) {
    if (!element?.hasAttribute('data-css')) return;
    const previousClassName = element.getAttribute('data-css-generated-class');
    const previousCssId = element.getAttribute('data-css-id');
    let val = element.getAttribute('data-css');
    if (!val?.trim()) return;
    const [firstContent, lastContent] = extractUnique(val, 'name');
    // A generated class belongs to this element, so reuse it for attribute
    // updates. This avoids class churn and redundant CSS for dynamic UIs.
    const className = previousClassName && (!firstContent || firstContent === previousClassName)
        ? previousClassName
        : processClassNameForRuntime(firstContent);
    isDevMode && validateCssSyntax(element, config, className);
    processDevicesForRuntime(lastContent, `.${className}`, config, devicePixel);

    // Process pseudo elements/classes
    Array.from(element.attributes).forEach(attr => {
        let selector;
        let lastContent;
        let pseudo = attr.name.slice(8);
        if (attr.name.startsWith('data-pc-') || attr.name.startsWith('data-pe-')) {
            if (!/^[a-z][a-z0-9-]*$/i.test(pseudo)) return;
            if (attr.name.startsWith('data-pe-')) {
                const [firstContent, contentLast] = extractUnique(attr.value, 'content');
                const contentValue = firstContent ?? '';
                selector = `.${className}::${pseudo}`;
                lastContent = contentLast;
                if (['before', 'after'].includes(pseudo)) cssRuleManager.addRule(selector, 'content', `'${escapeCssString(contentValue)}'`);
            } else {
                const [parentContent, parentLast] = extractUnique(attr.value, 'parent');
                const [childrenContent, childrenLast] = extractUnique(attr.value, 'children');
                if (parentContent) {
                    selector = `${parentContent}:${pseudo} .${className}`;
                } else if (childrenContent) {
                    selector = `.${className} ${childrenContent}:${pseudo}`;
                } else {
                    selector = `.${className}:${pseudo}`;
                }
                lastContent = childrenLast || parentLast;
            }
            processDevicesForRuntime(lastContent, selector, config, devicePixel);
        }
    });
    if (previousClassName && previousClassName !== className) {
        element.classList.remove(previousClassName);
    }
    element.classList.add(className);
    element.setAttribute('data-css-generated-class', className);
    element.setAttribute('data-css-id', countStyle);
    if (previousCssId && previousCssId !== String(countStyle)) {
        removeCssElementForRuntime(previousCssId);
    }

    // Xóa các data attributes sau khi đã xử lý
    if (shouldStripAttributes) cleanupDataAttributes(element);
}






// START PROCESS ELEMENT
{
    window.createElementDataCss = function createElementDataCss(htmlString) {
        // Nếu chuỗi có thẻ bảng, dùng table tạm
        tempE.innerHTML = htmlString.trim();
        const fragment = tempE.content;
        // Set attribute cho tất cả element con nếu isDevMode
        if (isDevMode) {
            fragment.querySelectorAll('*').forEach(el => {
                el.setAttribute('element-from-js', '');
            });
        }
        fragment.querySelectorAll('[data-css]').forEach(el => {
            processCssElement(el);
        })

        updateStylesheetForRuntime();
        // Trả về chuỗi HTML đúng cấu trúc gốc
        return Array.from(fragment.childNodes).map(node => {
            if (node.nodeType === 1) return node.outerHTML;
            if (node.nodeType === 3) return node.textContent;
            return '';
        }).join('');
    } 
    Object.defineProperty(Element.prototype, 'addElementDataCss', { configurable: true, writable: true, enumerable: false, value: function (htmlString) {
        const processedHtml = createElementDataCssForRuntime(htmlString);
        this.insertAdjacentHTML('beforeend', processedHtml);
    }});
}
// END PROCESS ELEMENT

 
// START PROCESS CLASS
{
    window.createClassDataCss = function (data) {
        const results = [];  
        if (Array.isArray(data)) {
            data.forEach(elementData => {
                const className = createClassSingleDataCss(elementData);
                results.push(className);
            });
        } else {
            const className = createClassSingleDataCss(data);
            results.push(className);
        } 
        updateStylesheetForRuntime(); 
        return Array.isArray(data) ? results : results[0];
    }

    function createClassSingleDataCss(elementData) { 
        let className = null;
        Object.entries(elementData).forEach(([attr, value]) => {
            if (attr === 'data-css') {
                if (value.includes('name[')) {
                    const [firstContent] = extractUnique(value, 'name');
                    className = firstContent;
                    tempC.setAttribute('data-css', value);
                } else {
                    className = processClassNameForRuntime(null, usedNames);
                    tempC.setAttribute('data-css', `name[${className}] ${value}`);
                }
            } else {
                tempC.setAttribute(attr, value);
            }
        });
        processCssElement(tempC);
        tempC.getAttributeNames().forEach(attr => tempC.removeAttribute(attr));
        return className;
    }
    Object.defineProperty(Element.prototype, 'addClassDataCss', { configurable: true, writable: true, enumerable: false, value: function (data) {
        const cls = createClassDataCssForRuntime(data);
        if (Array.isArray(cls)) {
            cls.forEach(c => this.classList.add(c));
        } else {
            this.classList.add(cls);
        }
    }});
}
// END PROCESS CLASS

// Capture internal APIs so loading the React runtime (or a second bundle) does
// not redirect this runtime's observer to another bundle's globals.
const processClassNameForRuntime = window.processClassName;
const processDevicesForRuntime = window.processDevices;
const updateStylesheetForRuntime = window.updateStylesheet;
const removeCssElementForRuntime = window.removeCssElement;
const createElementDataCssForRuntime = window.createElementDataCss;
const createClassDataCssForRuntime = window.createClassDataCss;
const detectDeviceForRuntime = window.detectDevice;

let stylesheetUpdateScheduled = false;
let readyAgainPending = false;
function scheduleStylesheetUpdate() {
    readyAgainPending = true;
    if (stylesheetUpdateScheduled) return;
    stylesheetUpdateScheduled = true;
    const flush = () => {
        stylesheetUpdateScheduled = false;
        updateStylesheetForRuntime();
        if (readyAgainPending) {
            readyAgainPending = false;
            emitDataCssEvent('dataCssReadyAgain');
        }
    };
    if (document.visibilityState === 'hidden' || typeof requestAnimationFrame !== 'function') setTimeout(flush, 16);
    else requestAnimationFrame(flush);
}

window.dataCssReady = function (callback) {
    if (typeof callback !== 'function') return;
    if (lifecycle.ready) {
        Promise.resolve().then(() => callback(new Event('dataCssReady')));
        return;
    }
    document.addEventListener('dataCssReady', function handler(e) {
        callback(e);
    }, { once: true });
}


window.dataCssReadyAgain = function (callback) {
    if (typeof callback !== 'function') return;
    document.addEventListener('dataCssReadyAgain', function handler(e) {
        callback(e);
    }, { once: true });
}

// Khởi tạo MutationObserver
const observer = new MutationObserver((mutations) => {
    const pendingElements = new Set();
    for (const mutation of mutations) {
        // Xử lý node mới thêm vào - tối ưu cho nhiều node cùng lúc

        for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue; // Bỏ qua nếu không phải element

            // Gom tất cả các node cần xử lý vào một mảng (gồm chính nó và con của nó)
            const candidates = node.matches?.('[data-css]')
                ? [node, ...node.querySelectorAll?.('[data-css]') ?? []]
                : [...node.querySelectorAll?.('[data-css]') ?? []];

            if (candidates.length > 0) {
                candidates.forEach(element => pendingElements.add(element));
            }
        }


        // Xử lý khi node bị xóa
        for (const node of mutation.removedNodes) {
            if (node.nodeType !== 1) continue;

            // Gom tất cả các node cần xử lý (node bị xóa + các con có data-css-id)
            const elementsToRemove = node.matches?.('[data-css-id]')
                ? [node, ...node.querySelectorAll?.('[data-css-id]') ?? []]
                : [...node.querySelectorAll?.('[data-css-id]') ?? []];

            if (elementsToRemove.length > 0) {
                elementsToRemove.forEach(el => {
                    const cssId = el.getAttribute('data-css-id');
                    if (cssId) removeCssElementForRuntime(cssId);
                });
            }
        }


        // Xử lý khi thuộc tính thay đổi
        if (mutation.type === 'attributes') {
            const target = mutation.target;
            const attributeName = mutation.attributeName;

            // Chỉ xử lý các thuộc tính liên quan đến data-css
            if (attributeName === 'data-css' ||
                attributeName.startsWith('data-pc-') ||
                attributeName.startsWith('data-pe-')) {

                // Chỉ xử lý nếu element có data-css
                if (target.hasAttribute('data-css')) {
                    pendingElements.add(target);
                }
            }
        }

        // Chỉ update stylesheet một lần sau khi xử lý tất cả mutations
    }
    if (pendingElements.size > 0) {
        pendingElements.forEach(processCssElement);
        scheduleStylesheetUpdate();
    }
});

window.destroyDataCss = function () {
    observer.disconnect();
};
runtimeRegistry[runtimeName].destroy = window.destroyDataCss;

window.startDataCss = function () {
    if (observerOptions) observer.observe(runtimeRoot === document ? document.body : runtimeRoot, observerOptions);
};
runtimeRegistry[runtimeName].start = window.startDataCss;
// START CONFIG
{
    async function fetchConfigAsset(fileName) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const res = await fetch(`${assetBase}/${fileName}`, { signal: controller.signal });
            if (!res.ok) throw new Error(`HTTP ${res.status} while loading ${fileName}`);
            return await res.json();
        } finally {
            clearTimeout(timeout);
        }
    }

    async function loadSyntaxGroups(loadedConfig) {
        if (loadedConfig?.group) return loadedConfig;
        const groupNames = loadedConfig?.groups;
        if (!Array.isArray(groupNames) || groupNames.length === 0) {
            throw new Error('Configuration does not declare any syntax groups');
        }
        const entries = await Promise.all(groupNames.map(async name => {
            if (!/^[a-z][a-z0-9_-]*$/i.test(name)) {
                throw new Error(`Invalid syntax group name "${name}"`);
            }
            return [name, await fetchConfigAsset(`groups/${name}.json`)];
        }));
        loadedConfig.group = Object.fromEntries(entries);
        return loadedConfig;
    }

    window.initConfig = async function () {
        let config;
        let configStr = readSessionValue(configStorageKey);
        if (configStr) {
            try {
                config = JSON.parse(configStr);
            } catch {
                removeSessionValue(configStorageKey);
            }
        }
        if (!config) {
            try {
                config = await loadSyntaxGroups(await fetchConfigAsset('config.json'));
                if (!config.devMode) {
                    writeSessionValue(configStorageKey, JSON.stringify(config));
                }
            } catch (e) {
                console.error('Unable to load config:', e);
                config = {}; // hoặc giá trị mặc định
            }
        }

        return config;
    }

}
// END CONFIG

// Main execution   
{
    (async () => {
        // Load validateCssSyntax động
        config = await initConfig();
        if (!config?.group || !config?.devices) {
            console.error('data-css could not start because its configuration is invalid or unavailable.');
            completeDataCssStartup(false);
            emitDataCssEvent('dataCssError');
            return;
        }
        if (!document.body) {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
        }
        isDevMode = Boolean(window.__DATA_CSS_DEBUG__ || config.devMode);
        if (isDevMode) {
            ({ validateCssSyntax } = await import('./validateCssSyntax.js'));
        }
        devicePixel = config.devices ? detectDeviceForRuntime(config.devices) : undefined;
        // Cấu hình cho obsever
        observerOptions = {
            childList: true,
            subtree: true,
            attributes: true
        };

        // Chạy nếu js thuần 
        const elements = [
            ...(runtimeRoot.matches?.('[data-css]') ? [runtimeRoot] : []),
            ...runtimeRoot.querySelectorAll('[data-css]')
        ];
        elements.forEach(el => {
            processCssElement(el);
        });

        updateStylesheetForRuntime();
        await waitForStaticAssets();
        // Chạy observer
        observer.observe(runtimeRoot === document ? document.body : runtimeRoot, observerOptions);
        // Hiển thị lại html và phát sự kiện
        completeDataCssStartup(true);
        emitDataCssEvent('dataCssReady');
    })();
}
