// Generated from core/. Edit core files, then run node scripts/build-package.cjs.
function readBalanced(source, start, open, close) {
  let depth = 0;
  let quote = null;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === open) depth += 1;
    if (character === close) {
      depth -= 1;
      if (depth === 0) return { content: source.slice(start + 1, index), end: index + 1 };
    }
  }
  return null;
}

/** Splits a DSL value without splitting inside CSS functions or quoted strings. */
export function splitDataCssValues(value, separator = '|') {
  const items = [];
  let start = 0;
  let depth = 0;
  let quote = null;
  const source = String(value ?? '');

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '(' || character === '[') depth += 1;
    else if (character === ')' || character === ']') depth = Math.max(0, depth - 1);
    else if (character === separator && depth === 0) {
      const item = source.slice(start, index).trim();
      if (item) items.push(item);
      start = index + 1;
    }
  }
  const item = source.slice(start).trim();
  if (item) items.push(item);
  return items;
}

/** Returns every `group[...]` expression, including nested CSS functions. */
export function parseDataCssGroups(content) {
  const groups = [];
  const source = String(content ?? '');
  const name = /[A-Za-z0-9_-]/;

  for (let index = 0; index < source.length;) {
    if (!name.test(source[index])) { index += 1; continue; }
    const start = index;
    while (index < source.length && name.test(source[index])) index += 1;
    const groupName = source.slice(start, index);
    while (/\s/.test(source[index] ?? '')) index += 1;
    if (source[index] !== '[') continue;
    const balanced = readBalanced(source, index, '[', ']');
    if (!balanced) break;
    groups.push({ name: groupName, value: balanced.content, start, end: balanced.end });
    index = balanced.end;
  }
  return groups;
}

/** Separates top-level responsive blocks from default declarations. */
export function parseResponsiveBlocks(content) {
  const source = String(content ?? '');
  const blocks = [];
  const ranges = [];
  const name = /[A-Za-z0-9_-]/;

  for (let index = 0; index < source.length;) {
    if (!name.test(source[index])) { index += 1; continue; }
    const start = index;
    while (index < source.length && name.test(source[index])) index += 1;
    const blockName = source.slice(start, index);
    while (/\s/.test(source[index] ?? '')) index += 1;
    if (source[index] !== '{') continue;
    const balanced = readBalanced(source, index, '{', '}');
    if (!balanced) break;
    blocks.push({ name: blockName, content: balanced.content });
    ranges.push([start, balanced.end]);
    index = balanced.end;
  }

  let regular = '';
  let cursor = 0;
  for (const [start, end] of ranges) {
    regular += source.slice(cursor, start);
    cursor = end;
  }
  regular += source.slice(cursor);
  return { regular, blocks };
}
