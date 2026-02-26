import { create } from 'zustand';

let nextId = 1;

const useFileStore = create((set, get) => ({
  files: [],
  processing: false,
  progress: 0,
  error: null,
  result: null,

  addFiles: (fileList) => {
    const newFiles = Array.from(fileList).map((file) => ({
      id: String(nextId++),
      file,
      name: file.name,
      size: file.size,
      status: 'pending',
      progress: 0,
    }));
    set((state) => ({ files: [...state.files, ...newFiles] }));
  },

  removeFile: (id) => {
    set((state) => ({ files: state.files.filter((f) => f.id !== id) }));
  },

  clearFiles: () => set({ files: [] }),

  setProcessing: (processing) => set({ processing }),

  setProgress: (progress) => set({ progress: Math.min(100, Math.max(0, progress)) }),

  setError: (error) => set({ error }),

  setResult: (result) => set({ result }),

  reset: () =>
    set({
      files: [],
      processing: false,
      progress: 0,
      error: null,
      result: null,
    }),
}));

export default useFileStore;
