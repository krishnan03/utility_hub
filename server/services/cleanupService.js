import cron from 'node-cron';
import config from '../config/index.js';
import { getExpiredFiles, deleteFile } from './fileStore.js';
import { safeUnlink } from '../utils/fileHelpers.js';

let cronJob = null;

/**
 * Run a single cleanup cycle.
 * Gets all expired files, deletes their physical files from disk,
 * and removes their metadata records from the store.
 * Errors on individual files are logged and skipped.
 * @returns {Promise<{ deleted: number, failed: number }>}
 */
export async function runCleanup() {
  const expired = getExpiredFiles();

  if (expired.length === 0) {
    return { deleted: 0, failed: 0 };
  }

  let deleted = 0;
  let failed = 0;

  for (const file of expired) {
    try {
      // Try to delete physical files (input and output)
      if (file.inputPath) {
        await safeUnlink(file.inputPath);
      }
      if (file.outputPath) {
        await safeUnlink(file.outputPath);
      }

      // Remove metadata record
      deleteFile(file.id);
      deleted++;
    } catch (err) {
      failed++;
      console.error(`Cleanup failed for file ${file.id}: ${err.message}`);
    }
  }

  console.log(`Cleanup complete: ${deleted} files deleted, ${failed} failed`);
  return { deleted, failed };
}

/**
 * Start the cleanup cron job using the configured interval.
 * @returns {object} The cron job instance
 */
export function startCleanup() {
  if (cronJob) {
    return cronJob;
  }

  cronJob = cron.schedule(config.cleanupInterval, () => {
    runCleanup().catch((err) => {
      console.error(`Cleanup job error: ${err.message}`);
    });
  });

  console.log(`Cleanup service started with schedule: ${config.cleanupInterval}`);
  return cronJob;
}

/**
 * Stop the cleanup cron job (useful for testing / shutdown).
 */
export function stopCleanup() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
}
