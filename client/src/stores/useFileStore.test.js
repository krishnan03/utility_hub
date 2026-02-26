import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useFileStore from './useFileStore.js';

function makeFile(name = 'test.png', size = 1024) {
  return new File(['x'.repeat(size)], name, { type: 'image/png' });
}

describe('useFileStore', () => {
  beforeEach(() => {
    act(() => useFileStore.getState().reset());
  });

  it('starts with default state', () => {
    const state = useFileStore.getState();
    expect(state.files).toEqual([]);
    expect(state.processing).toBe(false);
    expect(state.progress).toBe(0);
    expect(state.error).toBeNull();
    expect(state.result).toBeNull();
  });

  it('addFiles adds files with metadata', () => {
    const file = makeFile('photo.png', 2048);
    act(() => useFileStore.getState().addFiles([file]));

    const { files } = useFileStore.getState();
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('photo.png');
    expect(files[0].size).toBe(2048);
    expect(files[0].file).toBe(file);
    expect(files[0].status).toBe('pending');
    expect(files[0].progress).toBe(0);
    expect(files[0].id).toBeDefined();
  });

  it('addFiles appends to existing files', () => {
    act(() => useFileStore.getState().addFiles([makeFile('a.png')]));
    act(() => useFileStore.getState().addFiles([makeFile('b.png')]));

    expect(useFileStore.getState().files).toHaveLength(2);
  });

  it('removeFile removes by id', () => {
    act(() => useFileStore.getState().addFiles([makeFile('a.png'), makeFile('b.png')]));
    const id = useFileStore.getState().files[0].id;

    act(() => useFileStore.getState().removeFile(id));

    const { files } = useFileStore.getState();
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('b.png');
  });

  it('clearFiles removes all files', () => {
    act(() => useFileStore.getState().addFiles([makeFile(), makeFile()]));
    act(() => useFileStore.getState().clearFiles());

    expect(useFileStore.getState().files).toEqual([]);
  });

  it('setProcessing updates processing flag', () => {
    act(() => useFileStore.getState().setProcessing(true));
    expect(useFileStore.getState().processing).toBe(true);

    act(() => useFileStore.getState().setProcessing(false));
    expect(useFileStore.getState().processing).toBe(false);
  });

  it('setProgress clamps between 0 and 100', () => {
    act(() => useFileStore.getState().setProgress(50));
    expect(useFileStore.getState().progress).toBe(50);

    act(() => useFileStore.getState().setProgress(150));
    expect(useFileStore.getState().progress).toBe(100);

    act(() => useFileStore.getState().setProgress(-10));
    expect(useFileStore.getState().progress).toBe(0);
  });

  it('setError sets and clears error', () => {
    act(() => useFileStore.getState().setError('Something went wrong'));
    expect(useFileStore.getState().error).toBe('Something went wrong');

    act(() => useFileStore.getState().setError(null));
    expect(useFileStore.getState().error).toBeNull();
  });

  it('setResult sets and clears result', () => {
    const result = { success: true, fileId: '123' };
    act(() => useFileStore.getState().setResult(result));
    expect(useFileStore.getState().result).toEqual(result);

    act(() => useFileStore.getState().setResult(null));
    expect(useFileStore.getState().result).toBeNull();
  });

  it('reset clears everything', () => {
    act(() => {
      const s = useFileStore.getState();
      s.addFiles([makeFile()]);
      s.setProcessing(true);
      s.setProgress(75);
      s.setError('err');
      s.setResult({ success: true });
    });

    act(() => useFileStore.getState().reset());

    const state = useFileStore.getState();
    expect(state.files).toEqual([]);
    expect(state.processing).toBe(false);
    expect(state.progress).toBe(0);
    expect(state.error).toBeNull();
    expect(state.result).toBeNull();
  });
});
