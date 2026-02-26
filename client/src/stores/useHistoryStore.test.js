import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useHistoryStore from './useHistoryStore';
import { getRecentToolObjects } from './useHistoryStore';

describe('useHistoryStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useHistoryStore.setState({ recentTools: [] });
    });
    localStorage.clear();
  });

  it('starts with an empty recent tools list', () => {
    expect(useHistoryStore.getState().recentTools).toEqual([]);
  });

  it('adds a tool to the recent list', () => {
    act(() => {
      useHistoryStore.getState().addRecentTool('image-convert');
    });
    expect(useHistoryStore.getState().recentTools).toEqual(['image-convert']);
  });

  it('places the most recently used tool first (MRU order)', () => {
    act(() => {
      useHistoryStore.getState().addRecentTool('image-convert');
      useHistoryStore.getState().addRecentTool('pdf-merge');
      useHistoryStore.getState().addRecentTool('json-yaml-xml');
    });
    expect(useHistoryStore.getState().recentTools).toEqual([
      'json-yaml-xml',
      'pdf-merge',
      'image-convert',
    ]);
  });

  it('removes duplicates when re-adding an existing tool', () => {
    act(() => {
      useHistoryStore.getState().addRecentTool('image-convert');
      useHistoryStore.getState().addRecentTool('pdf-merge');
      useHistoryStore.getState().addRecentTool('image-convert');
    });
    expect(useHistoryStore.getState().recentTools).toEqual([
      'image-convert',
      'pdf-merge',
    ]);
  });

  it('caps the list at 10 entries', () => {
    act(() => {
      for (let i = 0; i < 15; i++) {
        useHistoryStore.getState().addRecentTool(`tool-${i}`);
      }
    });
    const recent = useHistoryStore.getState().recentTools;
    expect(recent).toHaveLength(10);
    // Most recent should be first
    expect(recent[0]).toBe('tool-14');
    // Oldest kept should be tool-5
    expect(recent[9]).toBe('tool-5');
  });

  it('getRecentTools returns tool objects from registry', () => {
    act(() => {
      useHistoryStore.getState().addRecentTool('image-convert');
      useHistoryStore.getState().addRecentTool('pdf-merge');
    });
    const recentIds = useHistoryStore.getState().recentTools;
    const toolObjects = getRecentToolObjects(recentIds);
    expect(toolObjects).toHaveLength(2);
    expect(toolObjects[0].id).toBe('pdf-merge');
    expect(toolObjects[1].id).toBe('image-convert');
  });

  it('getRecentTools filters out unknown tool IDs', () => {
    act(() => {
      useHistoryStore.setState({ recentTools: ['nonexistent-tool', 'image-convert'] });
    });
    const recentIds = useHistoryStore.getState().recentTools;
    const toolObjects = getRecentToolObjects(recentIds);
    expect(toolObjects).toHaveLength(1);
    expect(toolObjects[0].id).toBe('image-convert');
  });
});
