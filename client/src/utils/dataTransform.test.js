import { describe, it, expect } from 'vitest';
import {
  jsonToCsv, csvToJson,
  jsonToYaml, yamlToJson,
  jsonToXml, xmlToJson,
  formatJson, validateJson,
  formatXml, validateXml,
} from './dataTransform.js';

// ============================================================
// JSON ↔ CSV
// ============================================================

describe('jsonToCsv', () => {
  it('converts array of objects to CSV with header row', () => {
    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ];
    const csv = jsonToCsv(data);
    expect(csv).toBe('name,age\nAlice,30\nBob,25');
  });

  it('handles fields containing commas by quoting', () => {
    const data = [{ city: 'New York, NY', state: 'NY' }];
    const csv = jsonToCsv(data);
    expect(csv).toBe('city,state\n"New York, NY",NY');
  });

  it('handles fields containing double quotes', () => {
    const data = [{ text: 'He said "hello"' }];
    const csv = jsonToCsv(data);
    expect(csv).toContain('""hello""');
  });

  it('handles null and undefined values', () => {
    const data = [{ a: null, b: undefined, c: 'ok' }];
    const csv = jsonToCsv(data);
    expect(csv).toBe('a,b,c\n,,ok');
  });

  it('returns empty string for empty array', () => {
    expect(jsonToCsv([])).toBe('');
  });

  it('returns empty string for non-array input', () => {
    expect(jsonToCsv(null)).toBe('');
    expect(jsonToCsv('string')).toBe('');
  });

  it('handles objects with different keys (union of all keys)', () => {
    const data = [
      { a: 1, b: 2 },
      { b: 3, c: 4 },
    ];
    const csv = jsonToCsv(data);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('a,b,c');
    expect(lines[1]).toBe('1,2,');
    expect(lines[2]).toBe(',3,4');
  });

  it('handles boolean values', () => {
    const data = [{ active: true, deleted: false }];
    const csv = jsonToCsv(data);
    expect(csv).toBe('active,deleted\ntrue,false');
  });
});

describe('csvToJson', () => {
  it('parses CSV string to array of objects', () => {
    const csv = 'name,age\nAlice,30\nBob,25';
    const result = csvToJson(csv);
    expect(result).toEqual([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);
  });

  it('handles quoted fields with commas', () => {
    const csv = 'city,state\n"New York, NY",NY';
    const result = csvToJson(csv);
    expect(result).toEqual([{ city: 'New York, NY', state: 'NY' }]);
  });

  it('handles escaped double quotes inside quoted fields', () => {
    const csv = 'text\n"He said ""hello"""';
    const result = csvToJson(csv);
    expect(result).toEqual([{ text: 'He said "hello"' }]);
  });

  it('parses boolean and null values', () => {
    const csv = 'a,b,c\ntrue,false,null';
    const result = csvToJson(csv);
    expect(result).toEqual([{ a: true, b: false, c: null }]);
  });

  it('parses numeric values', () => {
    const csv = 'x,y\n42,3.14';
    const result = csvToJson(csv);
    expect(result).toEqual([{ x: 42, y: 3.14 }]);
  });

  it('returns empty array for empty string', () => {
    expect(csvToJson('')).toEqual([]);
    expect(csvToJson('  ')).toEqual([]);
  });

  it('returns empty array for header-only CSV', () => {
    expect(csvToJson('name,age')).toEqual([]);
  });
});

describe('JSON ↔ CSV round-trip', () => {
  it('round-trips flat objects', () => {
    const original = [
      { name: 'Alice', age: 30, active: true },
      { name: 'Bob', age: 25, active: false },
    ];
    const csv = jsonToCsv(original);
    const result = csvToJson(csv);
    expect(result).toEqual(original);
  });

  it('round-trips objects with commas in values', () => {
    const original = [{ city: 'New York, NY', pop: 8000000 }];
    const csv = jsonToCsv(original);
    const result = csvToJson(csv);
    expect(result).toEqual(original);
  });
});

// ============================================================
// JSON ↔ YAML
// ============================================================

describe('jsonToYaml', () => {
  it('converts flat object', () => {
    const yaml = jsonToYaml({ name: 'Alice', age: 30 });
    expect(yaml).toContain('name: Alice');
    expect(yaml).toContain('age: 30');
  });

  it('converts nested object', () => {
    const yaml = jsonToYaml({ person: { name: 'Alice', age: 30 } });
    expect(yaml).toContain('person:');
    expect(yaml).toContain('name: Alice');
  });

  it('converts arrays', () => {
    const yaml = jsonToYaml({ items: [1, 2, 3] });
    expect(yaml).toContain('items:');
    expect(yaml).toContain('- 1');
    expect(yaml).toContain('- 2');
    expect(yaml).toContain('- 3');
  });

  it('handles null values', () => {
    const yaml = jsonToYaml({ a: null });
    expect(yaml).toContain('a: null');
  });

  it('handles boolean values', () => {
    const yaml = jsonToYaml({ active: true, deleted: false });
    expect(yaml).toContain('active: true');
    expect(yaml).toContain('deleted: false');
  });

  it('handles empty object', () => {
    const yaml = jsonToYaml({});
    expect(yaml).toContain('{}');
  });

  it('handles empty array', () => {
    const yaml = jsonToYaml({ items: [] });
    expect(yaml).toContain('items: []');
  });

  it('quotes strings that look like booleans', () => {
    const yaml = jsonToYaml({ val: 'true' });
    expect(yaml).toContain("'true'");
  });

  it('quotes strings that look like numbers', () => {
    const yaml = jsonToYaml({ val: '42' });
    expect(yaml).toContain("'42'");
  });
});

describe('yamlToJson', () => {
  it('parses flat key-value pairs', () => {
    const yaml = 'name: Alice\nage: 30';
    expect(yamlToJson(yaml)).toEqual({ name: 'Alice', age: 30 });
  });

  it('parses nested objects', () => {
    const yaml = 'person:\n  name: Alice\n  age: 30';
    expect(yamlToJson(yaml)).toEqual({ person: { name: 'Alice', age: 30 } });
  });

  it('parses arrays', () => {
    const yaml = 'items:\n  - 1\n  - 2\n  - 3';
    expect(yamlToJson(yaml)).toEqual({ items: [1, 2, 3] });
  });

  it('parses null values', () => {
    const yaml = 'a: null';
    expect(yamlToJson(yaml)).toEqual({ a: null });
  });

  it('parses boolean values', () => {
    const yaml = 'a: true\nb: false';
    expect(yamlToJson(yaml)).toEqual({ a: true, b: false });
  });

  it('parses quoted strings', () => {
    const yaml = "a: 'true'\nb: '42'";
    expect(yamlToJson(yaml)).toEqual({ a: 'true', b: '42' });
  });

  it('parses empty object', () => {
    expect(yamlToJson('{}')).toEqual({});
  });

  it('parses empty array', () => {
    expect(yamlToJson('[]')).toEqual([]);
  });

  it('returns null for empty string', () => {
    expect(yamlToJson('')).toBeNull();
    expect(yamlToJson('  ')).toBeNull();
  });

  it('parses array of objects', () => {
    const yaml = 'people:\n  - name: Alice\n    age: 30\n  - name: Bob\n    age: 25';
    const result = yamlToJson(yaml);
    expect(result).toEqual({
      people: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ],
    });
  });
});

describe('JSON ↔ YAML round-trip', () => {
  it('round-trips flat object', () => {
    const original = { name: 'Alice', age: 30, active: true };
    const yaml = jsonToYaml(original);
    const result = yamlToJson(yaml);
    expect(result).toEqual(original);
  });

  it('round-trips nested object', () => {
    const original = { person: { name: 'Alice', address: { city: 'NYC' } } };
    const yaml = jsonToYaml(original);
    const result = yamlToJson(yaml);
    expect(result).toEqual(original);
  });

  it('round-trips object with arrays', () => {
    const original = { tags: [1, 2, 3], name: 'test' };
    const yaml = jsonToYaml(original);
    const result = yamlToJson(yaml);
    expect(result).toEqual(original);
  });

  it('round-trips null values', () => {
    const original = { a: null, b: 'hello' };
    const yaml = jsonToYaml(original);
    const result = yamlToJson(yaml);
    expect(result).toEqual(original);
  });
});

// ============================================================
// JSON ↔ XML
// ============================================================

describe('jsonToXml', () => {
  it('converts flat object to XML', () => {
    const xml = jsonToXml({ name: 'Alice', age: 30 }, 'person');
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<person>');
    expect(xml).toContain('<name>Alice</name>');
    expect(xml).toContain('<age>30</age>');
    expect(xml).toContain('</person>');
  });

  it('converts nested object', () => {
    const xml = jsonToXml({ address: { city: 'NYC' } }, 'person');
    expect(xml).toContain('<address>');
    expect(xml).toContain('<city>NYC</city>');
    expect(xml).toContain('</address>');
  });

  it('converts arrays with item tags', () => {
    const xml = jsonToXml({ items: [1, 2, 3] }, 'root');
    expect(xml).toContain('<items>');
    expect(xml).toContain('<item>1</item>');
    expect(xml).toContain('<item>2</item>');
    expect(xml).toContain('<item>3</item>');
    expect(xml).toContain('</items>');
  });

  it('handles null values as self-closing tags', () => {
    const xml = jsonToXml({ a: null }, 'root');
    expect(xml).toContain('<a/>');
  });

  it('escapes special XML characters', () => {
    const xml = jsonToXml({ text: '<hello> & "world"' }, 'root');
    expect(xml).toContain('&lt;hello&gt; &amp; &quot;world&quot;');
  });

  it('handles boolean values', () => {
    const xml = jsonToXml({ active: true }, 'root');
    expect(xml).toContain('<active>true</active>');
  });

  it('uses default root name', () => {
    const xml = jsonToXml({ a: 1 });
    expect(xml).toContain('<root>');
    expect(xml).toContain('</root>');
  });
});

describe('xmlToJson', () => {
  it('parses simple XML to object', () => {
    const xml = '<person><name>Alice</name><age>30</age></person>';
    const result = xmlToJson(xml);
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('parses nested XML', () => {
    const xml = '<root><person><name>Alice</name></person></root>';
    const result = xmlToJson(xml);
    expect(result).toEqual({ person: { name: 'Alice' } });
  });

  it('parses duplicate tags as arrays', () => {
    const xml = '<root><item>1</item><item>2</item><item>3</item></root>';
    const result = xmlToJson(xml);
    expect(result).toEqual({ item: [1, 2, 3] });
  });

  it('parses boolean and null text values', () => {
    const xml = '<root><a>true</a><b>false</b><c>null</c></root>';
    const result = xmlToJson(xml);
    expect(result).toEqual({ a: true, b: false, c: null });
  });

  it('throws on invalid XML', () => {
    expect(() => xmlToJson('<root><unclosed>')).toThrow('Invalid XML');
  });

  it('returns null for empty string', () => {
    expect(xmlToJson('')).toBeNull();
    expect(xmlToJson('  ')).toBeNull();
  });

  it('handles self-closing tags', () => {
    const xml = '<root><empty/></root>';
    const result = xmlToJson(xml);
    expect(result).toEqual({ empty: null });
  });
});

describe('JSON ↔ XML round-trip', () => {
  it('round-trips flat object', () => {
    const original = { name: 'Alice', age: 30, active: true };
    const xml = jsonToXml(original, 'root');
    const result = xmlToJson(xml);
    expect(result).toEqual(original);
  });

  it('round-trips nested object', () => {
    const original = { person: { name: 'Alice', city: 'NYC' } };
    const xml = jsonToXml(original, 'root');
    const result = xmlToJson(xml);
    expect(result).toEqual(original);
  });
});

// ============================================================
// Formatters & Validators
// ============================================================

describe('formatJson', () => {
  it('pretty-prints valid JSON', () => {
    const result = formatJson('{"a":1,"b":2}');
    expect(result.result).toBe('{\n  "a": 1,\n  "b": 2\n}');
    expect(result.error).toBeUndefined();
  });

  it('returns error for invalid JSON', () => {
    const result = formatJson('{invalid}');
    expect(result.result).toBeUndefined();
    expect(result.error).toBeDefined();
  });

  it('handles arrays', () => {
    const result = formatJson('[1,2,3]');
    expect(result.result).toBe('[\n  1,\n  2,\n  3\n]');
  });

  it('handles nested objects', () => {
    const result = formatJson('{"a":{"b":1}}');
    expect(result.result).toContain('"a": {');
    expect(result.result).toContain('"b": 1');
  });
});

describe('validateJson', () => {
  it('returns valid for correct JSON', () => {
    expect(validateJson('{"a":1}')).toEqual({ valid: true });
  });

  it('returns invalid with error for bad JSON', () => {
    const result = validateJson('{bad}');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('validates arrays', () => {
    expect(validateJson('[1,2,3]')).toEqual({ valid: true });
  });

  it('validates primitives', () => {
    expect(validateJson('"hello"')).toEqual({ valid: true });
    expect(validateJson('42')).toEqual({ valid: true });
    expect(validateJson('true')).toEqual({ valid: true });
    expect(validateJson('null')).toEqual({ valid: true });
  });
});

describe('formatXml', () => {
  it('formats compact XML with indentation', () => {
    const xml = '<root><a>1</a><b>2</b></root>';
    const result = formatXml(xml);
    expect(result).toContain('<root>');
    expect(result).toContain('</root>');
  });

  it('returns empty string for empty input', () => {
    expect(formatXml('')).toBe('');
    expect(formatXml('  ')).toBe('');
  });

  it('handles self-closing tags', () => {
    const xml = '<root><empty/></root>';
    const result = formatXml(xml);
    expect(result).toContain('<empty/>');
  });

  it('preserves processing instructions', () => {
    const xml = '<?xml version="1.0"?><root><a>1</a></root>';
    const result = formatXml(xml);
    expect(result).toContain('<?xml version="1.0"?>');
  });
});

describe('validateXml', () => {
  it('returns valid for correct XML', () => {
    expect(validateXml('<root><a>1</a></root>')).toEqual({ valid: true });
  });

  it('returns invalid for malformed XML', () => {
    const result = validateXml('<root><unclosed>');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns invalid for empty string', () => {
    const result = validateXml('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Empty XML string');
  });

  it('validates self-closing tags', () => {
    expect(validateXml('<root/>')).toEqual({ valid: true });
  });

  it('validates XML with processing instruction', () => {
    expect(validateXml('<?xml version="1.0"?><root/>')).toEqual({ valid: true });
  });
});
