// Generated from core/. Edit core files, then run node scripts/build-package.cjs.
export function formatCssProperty(property) {
  return property.replace(/([A-Z])/g, '-$1').toLowerCase();
}

export function convertWUnits(value, devicePixel) {
  if (!devicePixel) return value;
  return String(value).replace(/(-?\d+(?:\.\d+)?)w\b/g, (_, number) => {
    const vw = (Number(number) / Number.parseFloat(devicePixel)) * 100;
    return `${vw.toFixed(5)}vw`;
  });
}

function maxDevicePixel(devices) {
  const pixels = Object.values(devices)
    .map(({ pixelCSS }) => Number.parseFloat(pixelCSS))
    .filter(Number.isFinite);
  return pixels.length ? Math.max(...pixels) : undefined;
}

function addValue(properties, property, value, pixel) {
  if (value === undefined || value === null || value === '') return;
  if (!(property in properties)) properties[property] = convertWUnits(value, pixel);
}

function propertyFromGroup(group, key) {
  if (group.property === key || (Array.isArray(group.property) && group.property.includes(key))) return key;
  for (const entry of Object.values(group)) {
    if (entry && typeof entry === 'object' && entry.property === key) return key;
  }
  return null;
}

function compileGroups(content, selector, config, pixel, mediaQuery = null) {
  const rules = [];
  for (const { name: groupName, value: valueList } of parseDataCssGroups(content)) {
    const group = config.group?.[groupName];
    if (!group) continue;

    const properties = {};
    for (const item of splitDataCssValues(valueList)) {
      const separator = item.indexOf(':');
      if (separator !== -1) {
        const key = item.slice(0, separator).trim();
        const rawValue = item.slice(separator + 1).trim().replace(/_/g, ' ');
        const definition = group[key];
        const property = definition?.property ?? propertyFromGroup(group, key);
        if (!property) continue;

        const functionMatch = rawValue.match(/^(\w+)\((.*)\)$/);
        const value = definition?.values?.[rawValue]
          ?? (functionMatch ? `${definition?.values?.[functionMatch[1]] ?? functionMatch[1]}(${functionMatch[2]})` : rawValue);
        addValue(properties, formatCssProperty(property), value, pixel);
        continue;
      }

      const bindings = group[item]?.bindings;
      if (!bindings) continue;
      for (const [bindingKey, bindingValue] of Object.entries(bindings)) {
        const definition = group[bindingKey];
        const property = definition?.property ?? bindingKey;
        const value = definition?.values?.[bindingValue] ?? bindingValue;
        addValue(properties, formatCssProperty(property), value, pixel);
      }
    }

    for (const [property, value] of Object.entries(properties)) {
      rules.push({ selector, property, value, mediaQuery });
    }
  }
  return rules;
}

/** Compiles a data-css value into CSS declarations without touching the DOM. */
export function compileDataCss(content, selector, config, fallbackPixel) {
  if (!content || !selector || !config?.group || !config?.devices) return [];

  const devices = Object.keys(config.devices);
  const { regular, blocks } = parseResponsiveBlocks(content);
  const hasResponsiveRules = blocks.some(({ name }) => name !== 'all' && devices.includes(name));
  const largestPixel = maxDevicePixel(config.devices) || fallbackPixel;

  if (!hasResponsiveRules) return compileGroups(content, selector, config, largestPixel);

  // Rules outside a responsive block are the default (`all`) rules. Keeping
  // them is important because the documented syntax permits both forms.
  const rules = compileGroups(regular, selector, config, largestPixel);
  for (const { name, content: blockContent } of blocks) {
    if (name === 'all') {
      rules.push(...compileGroups(blockContent, selector, config, largestPixel));
    } else if (config.devices[name]) {
      const device = config.devices[name];
      rules.push(...compileGroups(blockContent, selector, config, device.pixelCSS || fallbackPixel, device.query));
    }
  }
  return rules;
}
import { parseDataCssGroups, parseResponsiveBlocks, splitDataCssValues } from './parser.js';
