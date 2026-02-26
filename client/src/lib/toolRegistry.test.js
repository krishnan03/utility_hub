import { describe, it, expect } from 'vitest';
import tools, { CATEGORIES } from './toolRegistry.js';

describe('toolRegistry', () => {
  it('exports a non-empty array of tools', () => {
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThanOrEqual(40);
  });

  it('every tool has required fields', () => {
    const requiredKeys = ['id', 'name', 'description', 'category', 'keywords', 'path', 'icon', 'isClientSide'];
    for (const tool of tools) {
      for (const key of requiredKeys) {
        expect(tool).toHaveProperty(key);
      }
    }
  });

  it('every tool id is unique', () => {
    const ids = tools.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every tool path is unique', () => {
    const paths = tools.map((t) => t.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('every tool belongs to a valid category', () => {
    for (const tool of tools) {
      expect(CATEGORIES).toContain(tool.category);
    }
  });

  it('every tool has at least one keyword', () => {
    for (const tool of tools) {
      expect(tool.keywords.length).toBeGreaterThan(0);
    }
  });

  it('every tool path starts with /tools/', () => {
    for (const tool of tools) {
      expect(tool.path).toMatch(/^\/tools\//);
    }
  });

  it('CATEGORIES contains all expected categories', () => {
    const expected = ['image', 'document', 'text', 'developer', 'media', 'finance', 'ai', 'student', 'design', 'security', 'seo', 'utility', 'spreadsheet'];
    expect(CATEGORIES).toEqual(expected);
  });

  it('every category has at least one tool', () => {
    for (const cat of CATEGORIES) {
      const count = tools.filter((t) => t.category === cat).length;
      expect(count).toBeGreaterThan(0);
    }
  });
});
