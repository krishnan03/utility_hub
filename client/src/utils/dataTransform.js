// ============================================================
// JSON ↔ CSV
// ============================================================

/**
 * Converts an array of objects to a CSV string with a header row.
 * @param {Array<Object>} jsonData - Array of flat objects
 * @returns {string} CSV string
 */
export function jsonToCsv(jsonData) {
  if (!Array.isArray(jsonData) || jsonData.length === 0) return '';

  const headers = [...new Set(jsonData.flatMap(obj => Object.keys(obj)))];

  const escapeCsvField = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const headerRow = headers.map(escapeCsvField).join(',');
  const rows = jsonData.map(obj =>
    headers.map(h => escapeCsvField(obj[h])).join(',')
  );

  return [headerRow, ...rows].join('\n');
}

/**
 * Parses a CSV string to an array of objects. Handles quoted fields with commas.
 * @param {string} csvString
 * @returns {Array<Object>}
 */
export function csvToJson(csvString) {
  if (!csvString || !csvString.trim()) return [];

  const lines = parseCsvLines(csvString.trim());
  if (lines.length < 2) return [];

  const headers = lines[0];
  return lines.slice(1).map(fields => {
    const obj = {};
    headers.forEach((header, i) => {
      const val = i < fields.length ? fields[i] : '';
      obj[header] = parseValue(val);
    });
    return obj;
  });
}

function parseCsvLines(text) {
  const lines = [];
  let current = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field);
        field = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        current.push(field);
        field = '';
        lines.push(current);
        current = [];
        if (ch === '\r') i++;
      } else if (ch === '\r') {
        current.push(field);
        field = '';
        lines.push(current);
        current = [];
      } else {
        field += ch;
      }
    }
  }

  current.push(field);
  if (current.some(f => f !== '') || current.length > 1) {
    lines.push(current);
  }

  return lines;
}

function parseValue(str) {
  if (str === '') return '';
  if (str === 'true') return true;
  if (str === 'false') return false;
  if (str === 'null') return null;
  const num = Number(str);
  if (!isNaN(num) && str.trim() !== '') return num;
  return str;
}

// ============================================================
// JSON ↔ YAML
// ============================================================

/**
 * Converts a JS object to a YAML string.
 * Handles nested objects, arrays, strings, numbers, booleans, null.
 * @param {*} jsonData
 * @returns {string}
 */
export function jsonToYaml(jsonData) {
  return toYamlValue(jsonData, 0).trimEnd();
}

function toYamlValue(value, indent) {
  if (value === null || value === undefined) return 'null\n';
  if (typeof value === 'boolean') return value.toString() + '\n';
  if (typeof value === 'number') return value.toString() + '\n';
  if (typeof value === 'string') return yamlString(value) + '\n';
  if (Array.isArray(value)) return yamlArray(value, indent);
  if (typeof value === 'object') return yamlObject(value, indent);
  return String(value) + '\n';
}

function yamlString(str) {
  if (str === '') return "''";
  // Quote strings that could be misinterpreted
  if (
    str === 'true' || str === 'false' ||
    str === 'null' || str === 'yes' || str === 'no' ||
    str === 'on' || str === 'off' ||
    str === 'True' || str === 'False' ||
    str === 'Null' || str === 'Yes' || str === 'No' ||
    str === 'TRUE' || str === 'FALSE' ||
    str === 'NULL' || str === 'YES' || str === 'NO' ||
    str === 'ON' || str === 'OFF' ||
    (!isNaN(Number(str)) && str.trim() !== '') ||
    str.includes(':') || str.includes('#') ||
    str.includes('{') || str.includes('}') ||
    str.includes('[') || str.includes(']') ||
    str.includes(',') || str.includes('&') ||
    str.includes('*') || str.includes('?') ||
    str.includes('|') || str.includes('>') ||
    str.includes("'") || str.includes('"') ||
    str.includes('%') || str.includes('@') ||
    str.includes('`') || str.includes('!') ||
    str.startsWith(' ') || str.endsWith(' ') ||
    str.includes('\n')
  ) {
    return "'" + str.replace(/'/g, "''") + "'";
  }
  return str;
}

function yamlObject(obj, indent) {
  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}\n';

  let result = '\n';
  const prefix = '  '.repeat(indent + 1);

  for (const key of keys) {
    const val = obj[key];
    const safeKey = yamlString(key);

    if (val !== null && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0) {
      result += prefix + safeKey + ':' + toYamlValue(val, indent + 1);
    } else if (Array.isArray(val) && val.length > 0) {
      result += prefix + safeKey + ':' + toYamlValue(val, indent + 1);
    } else {
      result += prefix + safeKey + ': ' + toYamlValue(val, indent + 1);
    }
  }

  return result;
}

function yamlArray(arr, indent) {
  if (arr.length === 0) return '[]\n';

  let result = '\n';
  const prefix = '  '.repeat(indent + 1);

  for (const item of arr) {
    if (item !== null && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length > 0) {
      const objYaml = toYamlValue(item, indent + 1);
      const lines = objYaml.trimStart().split('\n').filter(l => l !== '');
      result += prefix + '- ' + lines[0].trim() + '\n';
      for (let i = 1; i < lines.length; i++) {
        result += prefix + '  ' + lines[i].trim() + '\n';
      }
    } else {
      result += prefix + '- ' + toYamlValue(item, indent + 1).trimStart();
    }
  }

  return result;
}

/**
 * Parses simple YAML to a JS object.
 * Handles key: value, nested indentation, arrays with -, quoted strings.
 * @param {string} yamlString
 * @returns {*}
 */
export function yamlToJson(yamlString) {
  if (!yamlString || !yamlString.trim()) return null;

  const trimmed = yamlString.trim();

  // Handle inline values
  if (trimmed === '{}') return {};
  if (trimmed === '[]') return [];
  if (trimmed === 'null' || trimmed === 'Null' || trimmed === 'NULL' || trimmed === '~') return null;
  if (trimmed === 'true' || trimmed === 'True' || trimmed === 'TRUE' ||
      trimmed === 'yes' || trimmed === 'Yes' || trimmed === 'YES' ||
      trimmed === 'on' || trimmed === 'On' || trimmed === 'ON') return true;
  if (trimmed === 'false' || trimmed === 'False' || trimmed === 'FALSE' ||
      trimmed === 'no' || trimmed === 'No' || trimmed === 'NO' ||
      trimmed === 'off' || trimmed === 'Off' || trimmed === 'OFF') return false;

  const lines = yamlString.split('\n').filter(l => l.trim() !== '' && !l.trim().startsWith('#'));
  if (lines.length === 0) return null;

  return parseYamlBlock(lines, 0).value;
}

function parseYamlBlock(lines, startIndent) {
  if (lines.length === 0) return { value: null, consumed: 0 };

  const firstLine = lines[0];
  const firstTrimmed = firstLine.trim();

  // Check if it's an array (starts with -)
  if (firstTrimmed.startsWith('- ') || firstTrimmed === '-') {
    return parseYamlArray(lines, getIndent(lines[0]));
  }

  // Otherwise it's an object
  return parseYamlObject(lines, getIndent(lines[0]));
}

function parseYamlObject(lines, baseIndent) {
  const obj = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const indent = getIndent(line);
    const trimmed = line.trim();

    if (indent < baseIndent) break;
    if (indent > baseIndent) break;
    if (trimmed === '' || trimmed.startsWith('#')) { i++; continue; }

    const colonIdx = findKeyColonIndex(trimmed);
    if (colonIdx === -1) { i++; continue; }

    const rawKey = trimmed.substring(0, colonIdx).trim();
    const key = unquoteYamlString(rawKey);
    const afterColon = trimmed.substring(colonIdx + 1).trim();

    if (afterColon === '' || afterColon === '|' || afterColon === '>') {
      // Value is on next lines (nested block)
      const childLines = [];
      let j = i + 1;
      while (j < lines.length) {
        const childIndent = getIndent(lines[j]);
        const childTrimmed = lines[j].trim();
        if (childTrimmed === '' || childTrimmed.startsWith('#')) { j++; continue; }
        if (childIndent <= baseIndent) break;
        childLines.push(lines[j]);
        j++;
      }

      if (childLines.length > 0) {
        const parsed = parseYamlBlock(childLines, getIndent(childLines[0]));
        obj[key] = parsed.value;
      } else {
        obj[key] = null;
      }
      i = j;
    } else {
      obj[key] = parseYamlScalar(afterColon);
      i++;
    }
  }

  return { value: obj, consumed: i };
}

function parseYamlArray(lines, baseIndent) {
  const arr = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const indent = getIndent(line);
    const trimmed = line.trim();

    if (indent < baseIndent) break;
    if (trimmed === '' || trimmed.startsWith('#')) { i++; continue; }
    if (!trimmed.startsWith('-')) break;

    const afterDash = trimmed.substring(1).trim();

    if (afterDash === '') {
      // Nested block under dash
      const childLines = [];
      let j = i + 1;
      while (j < lines.length) {
        const childIndent = getIndent(lines[j]);
        const childTrimmed = lines[j].trim();
        if (childTrimmed === '' || childTrimmed.startsWith('#')) { j++; continue; }
        if (childIndent <= baseIndent) break;
        childLines.push(lines[j]);
        j++;
      }
      if (childLines.length > 0) {
        const parsed = parseYamlBlock(childLines, getIndent(childLines[0]));
        arr.push(parsed.value);
      } else {
        arr.push(null);
      }
      i = j;
    } else if (afterDash.includes(':')) {
      // Inline object start: - key: value
      // Collect this and subsequent indented lines as an object
      const objLines = [' '.repeat(baseIndent + 2) + afterDash];
      let j = i + 1;
      while (j < lines.length) {
        const childIndent = getIndent(lines[j]);
        const childTrimmed = lines[j].trim();
        if (childTrimmed === '' || childTrimmed.startsWith('#')) { j++; continue; }
        if (childIndent <= baseIndent) break;
        if (childTrimmed.startsWith('-') && childIndent === baseIndent) break;
        objLines.push(lines[j]);
        j++;
      }
      const parsed = parseYamlBlock(objLines, getIndent(objLines[0]));
      arr.push(parsed.value);
      i = j;
    } else {
      arr.push(parseYamlScalar(afterDash));
      i++;
    }
  }

  return { value: arr, consumed: i };
}

function parseYamlScalar(str) {
  if (str === '' || str === '~' || str === 'null' || str === 'Null' || str === 'NULL') return null;
  if (str === 'true' || str === 'True' || str === 'TRUE' ||
      str === 'yes' || str === 'Yes' || str === 'YES') return true;
  if (str === 'false' || str === 'False' || str === 'FALSE' ||
      str === 'no' || str === 'No' || str === 'NO') return false;
  if (str === '{}') return {};
  if (str === '[]') return [];

  // Quoted strings
  const unquoted = unquoteYamlString(str);
  if (unquoted !== str) return unquoted;

  // Numbers
  const num = Number(str);
  if (!isNaN(num) && str.trim() !== '') return num;

  return str;
}

function unquoteYamlString(str) {
  if ((str.startsWith("'") && str.endsWith("'")) ||
      (str.startsWith('"') && str.endsWith('"'))) {
    const inner = str.slice(1, -1);
    if (str.startsWith("'")) return inner.replace(/''/g, "'");
    return inner.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  }
  return str;
}

function getIndent(line) {
  let count = 0;
  for (const ch of line) {
    if (ch === ' ') count++;
    else break;
  }
  return count;
}

function findKeyColonIndex(str) {
  // Find the colon that separates key from value, respecting quotes
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === ':' && !inSingle && !inDouble) {
      // Must be followed by space, end of string, or newline
      if (i + 1 >= str.length || str[i + 1] === ' ' || str[i + 1] === '\n') {
        return i;
      }
    }
  }
  return -1;
}

// ============================================================
// JSON ↔ XML
// ============================================================

/**
 * Converts a JS object to an XML string with proper indentation.
 * @param {*} jsonData
 * @param {string} [rootName='root']
 * @returns {string}
 */
export function jsonToXml(jsonData, rootName = 'root') {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += objectToXml(jsonData, rootName, 0);
  return xml;
}

function objectToXml(value, tagName, indent) {
  const prefix = '  '.repeat(indent);
  const safeTag = escapeXmlTag(tagName);

  if (value === null || value === undefined) {
    return prefix + '<' + safeTag + '/>\n';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return prefix + '<' + safeTag + '>' + escapeXml(String(value)) + '</' + safeTag + '>\n';
  }

  if (Array.isArray(value)) {
    let result = '';
    for (const item of value) {
      result += objectToXml(item, 'item', indent);
    }
    return result;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return prefix + '<' + safeTag + '/>\n';
    }

    let result = prefix + '<' + safeTag + '>\n';
    for (const key of keys) {
      const childVal = value[key];
      if (Array.isArray(childVal)) {
        result += prefix + '  <' + escapeXmlTag(key) + '>\n';
        for (const item of childVal) {
          result += objectToXml(item, 'item', indent + 2);
        }
        result += prefix + '  </' + escapeXmlTag(key) + '>\n';
      } else {
        result += objectToXml(childVal, key, indent + 1);
      }
    }
    result += prefix + '</' + safeTag + '>\n';
    return result;
  }

  return prefix + '<' + safeTag + '>' + escapeXml(String(value)) + '</' + safeTag + '>\n';
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeXmlTag(name) {
  // XML tag names can't start with numbers or contain certain chars
  let safe = name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  if (/^[^a-zA-Z_]/.test(safe)) safe = '_' + safe;
  return safe;
}

/**
 * Parses an XML string to a JS object using DOMParser.
 * @param {string} xmlString
 * @returns {Object}
 */
export function xmlToJson(xmlString) {
  if (!xmlString || !xmlString.trim()) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  const errorNode = doc.querySelector('parsererror');
  if (errorNode) {
    throw new Error('Invalid XML: ' + errorNode.textContent);
  }

  return xmlNodeToJson(doc.documentElement);
}

function xmlNodeToJson(node) {
  // If it's a text-only element
  if (node.children.length === 0) {
    const text = node.textContent;
    if (text === '' && !node.hasChildNodes()) return null;
    return parseXmlValue(text);
  }

  const obj = {};

  for (const child of node.children) {
    const key = child.tagName;
    const value = xmlNodeToJson(child);

    if (key in obj) {
      // Convert to array if duplicate keys
      if (!Array.isArray(obj[key])) {
        obj[key] = [obj[key]];
      }
      obj[key].push(value);
    } else {
      obj[key] = value;
    }
  }

  return obj;
}

function parseXmlValue(str) {
  if (str === '') return '';
  if (str === 'true') return true;
  if (str === 'false') return false;
  if (str === 'null') return null;
  const num = Number(str);
  if (!isNaN(num) && str.trim() !== '') return num;
  return str;
}

// ============================================================
// Formatters & Validators
// ============================================================

/**
 * Pretty-print JSON with 2-space indentation.
 * @param {string} jsonString
 * @returns {{ result?: string, error?: string }}
 */
export function formatJson(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    return { result: JSON.stringify(parsed, null, 2) };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Validate a JSON string.
 * @param {string} jsonString
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateJson(jsonString) {
  try {
    JSON.parse(jsonString);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

/**
 * Pretty-print XML with indentation.
 * @param {string} xmlString
 * @returns {string}
 */
export function formatXml(xmlString) {
  if (!xmlString || !xmlString.trim()) return '';

  // Parse and re-serialize with indentation
  let result = '';
  let indent = 0;
  const tokens = xmlString.replace(/>\s*</g, '><').split(/(<[^>]+>)/);

  for (const token of tokens) {
    if (!token.trim()) continue;

    if (token.startsWith('<?')) {
      // Processing instruction
      result += token + '\n';
    } else if (token.startsWith('</')) {
      // Closing tag
      indent--;
      result += '  '.repeat(Math.max(0, indent)) + token + '\n';
    } else if (token.startsWith('<') && token.endsWith('/>')) {
      // Self-closing tag
      result += '  '.repeat(indent) + token + '\n';
    } else if (token.startsWith('<')) {
      // Opening tag
      result += '  '.repeat(indent) + token + '\n';
      indent++;
    } else {
      // Text content — attach to previous line
      result = result.trimEnd() + token + '\n';
      // Don't increment indent for text
    }
  }

  return result.trimEnd();
}

/**
 * Validate an XML string.
 * @param {string} xmlString
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateXml(xmlString) {
  if (!xmlString || !xmlString.trim()) {
    return { valid: false, error: 'Empty XML string' };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) {
      return { valid: false, error: errorNode.textContent };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}
