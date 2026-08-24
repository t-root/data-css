// Utility functions
const existingNames = new Set();
let className;

// Hàm chỉ nhận deviceKey, tự lấy styleMap từ window


// Gán hàm cho window để có thể gọi ở bất cứ đâu
// window.setInnerWidth = (deviceKey) => {
//   const styleMap = window.styleMap;
//   if (!styleMap || !styleMap.devices) {
//     console.warn('Không tìm thấy styleMap.devices!');
//     return;
//   }
//   const device = styleMap.devices[deviceKey];
//   if (!device) {
//     console.warn(`Device "${deviceKey}" không tồn tại trong styleMap.devices.`);
//     return;
//   }
//   const px = parseInt(device.pixelCSS);
//   if (!px) {
//     console.warn(`Device "${deviceKey}" không có giá trị pixelCSS hợp lệ.`);
//     return;
//   }
//   document.documentElement.style.width = px + 'px';
//   window.dispatchEvent(new Event('resize'));
//   console.log(`Đã set innerWidth theo device "${deviceKey}" = ${px}px`);
// };


function formatCSSProperty(property) {
  return property.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function displayError(message, element) {
  let htmlSnippet = '';
  let logMsg;
  if (element) {
    const tag = element.tagName.toLowerCase();
    const attrs = Array.from(element.attributes)
      .map(attr => `${attr.name}="${attr.value}"`).join(' ');
    if (element.children && element.children.length > 0) {
      htmlSnippet = `<${tag}${attrs ? ' ' + attrs : ''}>...<\/${tag}>`;
    } else {
      htmlSnippet = element.outerHTML;
    }
  }
   
  // Phân biệt rõ ràng giữa Element và Class
  if (element?.hasAttribute("element-from-js")) {
    logMsg = `${message} in element:`;
    console.error('This error comes from JS [ELEMENT LEVEL] ', '\n',logMsg, '\n', htmlSnippet , '\n', 'Class name:', className); 
  } else if (element && element.tagName === "SAMPLECLASS") { 
    logMsg = `This error comes from JS [CLASS LEVEL] \n ${message} in element:`;
    const attrs = Array.from(element.attributes)
      .map(attr => `${attr.name}="${attr.value}"`).join(' ');
    console.error(logMsg, '\n', attrs , '\n', 'Class name:', className);
  } else {
    logMsg = `${message} in element:`;
    console.error(logMsg, '\n', htmlSnippet, '\n', 'Class name:', className);
  }
}


// ===== Các hàm kiểm tra device =====
function getMaxDevicePixel(devices) {
  let max = 0;
  let maxKey = null;
  for (const key in devices) {
    const px = parseInt(devices[key].pixelCSS);
    if (px > max) {
      max = px;
      maxKey = key;
    }
  }
  return { max, maxKey };
}

function checkInnerWidthMatch(devices) {
  const width = window.innerWidth;
  let found = false;
  for (const key in devices) {
    const px = parseInt(devices[key].pixelCSS);
    if (width === px) {
      found = true;
      break;
    }
  }
  return found;
}

// Giữ lại các hàm validate, kiểm tra, isValidCSSValue, getCSSPropertyValue, isValidPseudo, isValidBracketContent, validateCssSyntax
// Tuyệt đối không còn biến htmlContent, reportedErrors, findErrorLineInRaw, getElementLineNumber, lineNumber, filePath, ...

function checkCSSPropertyExistence(groupKey, config, item, element) {
  // Nếu group không hợp lệ, chỉ báo lỗi và return false, không throw/dừng chương trình
  if (!config.group[groupKey]) {
    const error = `Invalid group "${groupKey}"`;
    displayError(error, element);
    // Chỉ báo lỗi, không ngăn code chạy tiếp các phần khác
    return false;
  }
  let prop, val;
  if (item.includes(':')) {
    [prop, val] = item.split(':').map(s => s.trim());
    if (!val || val.trim().length === 0) {
      const error = `Empty value for property "${prop}" in group "${groupKey}". Value is required.`;
      displayError(error, element);
      return false;
    }
  } else {
    prop = item;
    val = null;
  }
  let itemData = config.group[groupKey][prop];
  if (!itemData) {
    for (const subKey in config.group[groupKey]) {
      if (config.group[groupKey][subKey] && config.group[groupKey][subKey].property === prop) {
        itemData = config.group[groupKey][subKey];
        break;
      }
    }
  }
  if (!itemData) {
    const error = `Invalid property "${prop}" in group "${groupKey}"`;
    displayError(error, element);
    return false;
  }
  if (itemData.property && !itemData.bindings && val === null) {
    const error = `Property "${prop}" in group "${groupKey}" requires a value. Use format "${prop}:value"`;
    displayError(error, element);
    return false;
  }
  if (val === null) {
    if (!itemData.bindings) {
      const error = `No bindings found for property "${prop}" in group "${groupKey}"`;
      displayError(error, element);
      return false;
    }
    for (const key in itemData.bindings) {
      const bindingValue = itemData.bindings[key];
      const formattedKey = formatCSSProperty(key);
      if (isValidCSSValue(formattedKey, bindingValue)) {
        return true;
      }
    }
    const error = `No valid binding value found for property "${prop}" in group "${groupKey}"`;
    displayError(error, element);
    return false;
  }
  const [propName, resolvedValue] = getCSSPropertyValue(groupKey, prop, val, config);
  if (!isValidCSSValue(itemData.property || prop, resolvedValue)) {
    const error = `Invalid value "${val}" for property "${prop}" in group "${groupKey}"`;
    displayError(error, element);
    return false;
  }
  return true;
}

// Hàm kiểm tra giá trị CSS có hợp lệ không
function isValidCSSValue(prop, val) {
  // Chuyển đổi w sang vw nếu có
  if (typeof val === 'string') {
    val = val.replace(/(\d+(\.\d+)?)w/g, (_, num) => {
      const vwValue = (parseFloat(num) / window.innerWidth) * 100;
      return `${vwValue.toFixed(5)}vw`;
    });
  }

  const el = document.createElement('div');
  el.style[prop] = '';
  el.style[prop] = val;
  return el.style[prop] !== '';
}

function getCSSPropertyValue(groupKey, prop, val, config) {
  let propName, finalVal;

  // Nếu có dấu :, xử lý dạng key:value
  if (val !== null) {
    let raw = val.replace(/_/g, ' ');
    const cfg = config.group[groupKey]?.[prop] || null;

    if (!cfg) {
      propName = formatCSSProperty(prop);
      finalVal = raw;
    } else {
      if (cfg.values?.[raw]) {
        propName = formatCSSProperty(cfg.property);
        finalVal = cfg.values[raw];
      } else {
        const fnMatch = raw.match(/^\(\w+\)\(([^)]+)\)$/);
        if (fnMatch) {
          finalVal = `${cfg.values?.[fnMatch[1]] || fnMatch[1]}(${fnMatch[2]})`;
          propName = formatCSSProperty(cfg.property);
        } else {
          propName = formatCSSProperty(cfg.property);
          finalVal = raw;
        }
      }
    }
  }
  // Nếu không có dấu :, xử lý dạng binding
  else {
    const bindings = config.group[groupKey]?.[prop]?.bindings || {};
    const bindingEntries = Object.entries(bindings);

    if (bindingEntries.length === 0) {
      const error = `No bindings found for "${prop}" in group "${groupKey}"`;
      displayError(error, null);
      return null;
    }

    // Lấy binding đầu tiên
    const [bindingKey, bindingValue] = bindingEntries[0];
    const cfg = config.group[groupKey]?.[bindingKey] || null;

    if (!cfg) {
      propName = formatCSSProperty(bindingKey);
      finalVal = bindingValue;
    } else {
      if (cfg.values?.[bindingValue]) {
        propName = formatCSSProperty(cfg.property);
        finalVal = cfg.values[bindingValue];
      } else {
        propName = formatCSSProperty(cfg.property);
        finalVal = bindingValue;
      }
    }
  }

  return [propName, finalVal];
}

function isValidPseudo(pseudo, type, attr, element) {
  const selector = type === 'pe' ? `::${pseudo}` : `:${pseudo}`;
  const style = document.createElement('style');

  try {
    style.textContent = `div${selector} { }`;
    document.head.appendChild(style);

    const sheet = style.sheet;
    const rules = sheet.cssRules || sheet.rules;
    const rule = rules[0].selectorText;

    const hasPseudoElement = rule.includes('::');

    if (type === 'pe' && !hasPseudoElement) {
      const error = `"${pseudo}" is a pseudo-class but was used as a pseudo-element in attribute "${attr}"`;
      displayError(error, element);
    }

    if (type === 'pc' && hasPseudoElement) {
      const error = `"${pseudo}" is a pseudo-element but was used as a pseudo-class in attribute "${attr}"`;
      displayError(error, element);
    }

    return true;
  } catch (e) {
    if (e.name === 'Error') {
      throw e;
    }
    const error = `Invalid ${type === 'pe' ? 'pseudo-element' : 'pseudo-class'} "${pseudo}" in attribute "${attr}"`;
    displayError(error, element);
    return false;
  } finally {
    if (document.head.contains(style)) {
      document.head.removeChild(style);
    }
  }
}

// Sửa: Thêm styleMap vào tham số của isValidBracketContent
function isValidBracketContent(str, groupName, config, element) {
  if (!str || str.trim().length === 0 || str === "[]") {
    const error = `Empty property "${groupName}[]" found`;
    displayError(error, element);
    return false;
  }

  if (str.startsWith('|') || str.endsWith('|')) {
    const error = `Invalid syntax: Leading or trailing | found in property "${groupName}[]"`;
    displayError(error, element);
    return false;
  }

  const parts = str.split('|');
  const seenKeys = new Set();

  for (let part of parts) {
    if (!part.match(/^[\w\-]+(:[^:|]+)?$/)) {
      const error = `Invalid syntax "${part}" in property "${groupName}[]"`;
      displayError(error, element);
      return false;
    }

    if (part.includes(':')) {
      const key = part.split(':')[0];
      if (seenKeys.has(key)) {
        const error = `Duplicate key "${key}" found in property "${groupName}[]"`;
        displayError(error, element);
        return false;
      }
      seenKeys.add(key);
    }

    if (!checkCSSPropertyExistence(groupName, config, part, element)) {
      return false;
    }
  }

  return true;
}

// Thêm export cho hàm validateCssSyntax
export function validateCssSyntax(el, config, classNameShadow = null) {
  className = classNameShadow;
 
  // ===== Kiểm tra device ngay khi validate (chỉ 1 lần duy nhất) =====
  if (config && config.devices && !window._checkedDeviceWidth) {
    window._checkedDeviceWidth = true; // Mark as checked
    const { max, maxKey } = getMaxDevicePixel(config.devices);
    const isMatch = checkInnerWidthMatch(config.devices);
    if (!isMatch && window.innerWidth < max) {
      console.warn(`Warning: Current screen width (${window.innerWidth}px) does NOT satisfy the highest device pixelCSS (${maxKey}: ${max}px)`);
    }
    if (!isMatch) {
      console.warn('Warning: Current innerWidth does NOT match any pixelCSS value in devices!');
    }
  }

  const attrsToCheck = [];

  // ✅ 1. Kiểm tra nếu có data-css
  if (el.hasAttribute('data-css')) {
    attrsToCheck.push('data-css');
  }

  // ✅ 2. Duyệt tất cả thuộc tính để lấy thêm các data-pc-* hoặc data-pe-*
  for (let attr of el.attributes) {
    const name = attr.name;
    if (/^(data-pe|data-pc)/.test(name)) {
      attrsToCheck.push(name);

      // ✅ 2.1 Kiểm tra phần pseudo-class/element phía sau data-pc-* hoặc data-pe-*
      const type = name.includes('pc-') ? 'pc' : 'pe';
      const pseudo = name.split('-').slice(2).join('-');

      // Kiểm tra tính hợp lệ của pseudo-class/element
      const isValid = isValidPseudo(pseudo, type, name, el);
      if (!isValid) {
        const error = `Invalid pseudo-class/element in "${name}"`;
        displayError(error, el);
      }
    }
  }

  // ✅ 3. Duyệt từng thuộc tính để kiểm tra cú pháp
  for (let attr of attrsToCheck) {
    let attrValue = el.getAttribute(attr);
    if (!attrValue || !attrValue.trim()) continue;

    let rawAttrValue = attrValue;

    //bỏ khoảng trắng và kiểm tra ký tự không hợp lệ
    attrValue = attrValue.replace(/\s+/g, '');
    if (!/^[\w\s\[\]\{\}\(\)\:\|\-\_\,\.\#\%\/]+$/.test(attrValue)) {
      const error = `Invalid characters found in attribute "${attr}"`;
      displayError(error, el);
    }

   

    //kiểm tra tính hợp lệ name,parent,content
    const isValid = (value) => /^[a-zA-Z][a-zA-Z0-9\-_]*$/.test(value);

    if (attr === 'data-css') {
      const nameMatches = attrValue.match(/name\[[^\]]*?\]/g) || [];
      if (nameMatches.length > 1) {
        const error = `Multiple name[] declarations are not allowed in one element`;
        displayError(error, el);
      }

      if (nameMatches.length === 1) {
        const uniqueName = nameMatches[0].replace(/name\[|\]/g, '');
        if (!isValid(uniqueName)) {
          const error = `Invalid name value`;
          displayError(error, el);
        } else if (uniqueName === "") {
          const error = `Name value cannot be empty`;
          displayError(error, el);
        } else if (existingNames.has(uniqueName)) {
          // Chỉ cảnh báo nếu chưa từng cảnh báo tên này
          if (!window._warnedNames) window._warnedNames = new Set();
          if (!window._warnedNames.has(uniqueName)) {
            console.warn(`Warning: Class name "${uniqueName}" already exists`);
            window._warnedNames.add(uniqueName);
          }
        }
        existingNames.add(uniqueName);
      }
      attrValue = attrValue.replace(/name\[[^\]]*?\]/g, '');
    } else if (/^data-pc-/i.test(attr)) {
      const parentMatches = attrValue.match(/parent\[[^\]]*?\]/g) || [];
      const childrenMatches = attrValue.match(/children\[[^\]]*?\]/g) || [];

      if (parentMatches.length > 1) {
        const error = `Multiple parent[] declarations are not allowed in one element`;
        displayError(error, el);
      }

      if (childrenMatches.length > 1) {
        const error = `Multiple children[] declarations are not allowed in one element`;
        displayError(error, el);
      }

      if (parentMatches.length === 1 && childrenMatches.length === 1) {
        const error = `Cannot use both parent[] and children[] in the same attribute`;
        displayError(error, el);
      }

      if (parentMatches.length === 1) {
        const parentValue = parentMatches[0].replace(/parent\[|\]/g, '');
        if (parentValue === "") {
          const error = `PParent value cannot be empty`;
          displayError(error, el);
        }
      }

      if (childrenMatches.length === 1) {
        const childrenValue = childrenMatches[0].replace(/children\[|\]/g, '');
        if (childrenValue === "") {
          const error = `Children value cannot be empty`;
          displayError(error, el);
        }
      }

      attrValue = attrValue.replace(/parent\[[^\]]*?\]/g, '').replace(/children\[[^\]]*?\]/g, '');
    } else if (/^data-pe-/i.test(attr)) {
      const contentMatches = attrValue.match(/content\[[^\]]*?\]/g) || [];
      if (contentMatches.length > 1) {
        const error = `Multiple content[] declarations are not allowed in one element`;
        displayError(error, el);
      }

      if (contentMatches.length === 1) {
        const uniqueName = contentMatches[0].replace(/content\[|\]/g, '');
        if (!isValid(uniqueName)) {
          const error = `Invalid content value`;
          displayError(error, el);
        }
      }
      attrValue = attrValue.replace(/content\[[^\]]*?\]/g, '');
    }

    // Kiểm tra số lượng ngoặc mở/đóng {, }, [, ], (, )
    const pairs = { '{}': ['{', '}'], '[]': ['[', ']'], '()': ['(', ')'] };
    for (const [symbol, [open, close]] of Object.entries(pairs)) {
      const openCount = (attrValue.match(new RegExp(`\\${open}`, 'g')) || []).length;
      const closeCount = (attrValue.match(new RegExp(`\\${close}`, 'g')) || []).length;
      if (openCount !== closeCount) {
        const error = `Mismatched ${symbol} in "${attr}"`;
        displayError(error, el);
      }
    }

   

    // ✅ 3.4 Hàm con kiểm tra nội dung bên trong dấu {}
    const blockRegex = /(\w+)\{([^}]*)\}/g;
    const hasGraces = /{[^}]*}/;
    let match;

    // Kiểm tra xem có {} hay không
    const containsBraces = hasGraces.test(attrValue);

    if (!containsBraces) {
      // Nếu không có {}, cho phép các [] ở bất kỳ đâu
      const propRegex = /(\w+)\[([^\]]*)\]/g;
      let propMatch;
      const seen = new Set();

      while ((propMatch = propRegex.exec(attrValue)) !== null) {
        const groupKey = propMatch[1];
        const insideRaw = propMatch[2];
        if (groupKey === 'name' || groupKey === 'parent' || groupKey === 'content') {
          continue; // Bỏ qua các thuộc tính đặc biệt
        }
        if (seen.has(groupKey)) {
          const error = `Duplicate property "${groupKey}[]" found`;
          displayError(error, el);
          return false;
        }
        seen.add(groupKey);
        // Kiểm tra nội dung trong []
        if (!isValidBracketContent(insideRaw, groupKey, config, el)) {
          return false;
        }
      }
    } else {
      // Nếu có {}, kiểm tra các khối
      while ((match = blockRegex.exec(attrValue)) !== null) {
        const blockContent = match[2];
        const deviceKey = match[1];
        const seen = new Set();

        // Kiểm tra nội dung trong {} không được rỗng
        if (blockContent.trim().length === 0) {
          const error = `Empty block "${deviceKey}{}" found`;
          displayError(error, el);
        }

        // Nếu không phải device "all", kiểm tra sự tồn tại
        if (deviceKey !== "all" && !(deviceKey in config.devices)) {
          const error = `Invalid device key "${deviceKey}"`;
          displayError(error, el);
        }

        // Tìm các prop[] trong block
        const propRegex = /(\w+)\[([^\]]*)\]/g;
        let propMatch;

        while ((propMatch = propRegex.exec(blockContent)) !== null) {
          const groupKey = propMatch[1];
          const insideRaw = propMatch[2];

          // Kiểm tra trùng lặp
          if (seen.has(groupKey)) {
            const error = `Duplicate "${groupKey}[]" in the same block`;
            displayError(error, el);
            return false;
          }
          seen.add(groupKey);

          // Kiểm tra nội dung trong []
          if (!isValidBracketContent(insideRaw, groupKey, config, el)) {
            // Không báo lỗi lại ở đây nữa để tránh lặp
            return false;
          }
        }
      }
    }

    // ✅ 3.6 Kiểm tra các thuộc tính nằm ngoài block
    const outside = attrValue.replace(blockRegex, '').trim();
    const outsideProps = [];
    const outsidePropRegex = /(\w+)\[([^\]]*)\]/g;
    let outMatch;

    while ((outMatch = outsidePropRegex.exec(outside)) !== null) {
      const name = outMatch[1];
      if (name === 'name' || name === 'parent' || name === 'content') {
        continue; // Bỏ qua các thuộc tính đặc biệt
      }
      if (outsideProps.includes(name)) {
        const error = `Duplicate "${name}[]" outside blocks`;
        displayError(error, el);
        return false;
      }
      outsideProps.push(name);

      const insideRaw = outMatch[2];
      if (!isValidBracketContent(insideRaw, name, config, el)) {
        // Không báo lỗi lại ở đây nữa để tránh lặp
        return false;
      }
    }

    // ✅ 3.7 Không cho phép vừa có block vừa có prop[] ngoài block
     // 1. Không cho phép dấu '/' ngoài block

    // 2. Kiểm tra thiếu dấu '/' giữa các group liền nhau ở ngoài block (cấp thuộc tính)
  }
}  
