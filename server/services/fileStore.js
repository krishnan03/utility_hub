/**
 * In-memory file metadata store.
 * Tracks processed file records using a Map keyed by file ID.
 */

const store = new Map();

/**
 * Add a file record to the store.
 * @param {object} record - File metadata record (must include `id`)
 * @returns {object} The stored record
 */
export function addFile(record) {
  if (!record || !record.id) {
    throw new Error('File record must include an id');
  }
  store.set(record.id, { ...record });
  return store.get(record.id);
}

/**
 * Retrieve a file record by ID.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getFile(id) {
  return store.get(id);
}

/**
 * Delete a file record by ID.
 * @param {string} id
 * @returns {boolean} true if the record existed and was removed
 */
export function deleteFile(id) {
  return store.delete(id);
}

/**
 * Return all file records whose expiresAt is in the past.
 * @returns {object[]}
 */
export function getExpiredFiles() {
  const now = new Date();
  const expired = [];
  for (const record of store.values()) {
    if (new Date(record.expiresAt) <= now) {
      expired.push(record);
    }
  }
  return expired;
}

/**
 * Return every file record in the store.
 * @returns {object[]}
 */
export function getAllFiles() {
  return Array.from(store.values());
}

/**
 * Clear all records (useful for testing).
 */
export function clearAll() {
  store.clear();
}

export default { addFile, getFile, deleteFile, getExpiredFiles, getAllFiles, clearAll };
