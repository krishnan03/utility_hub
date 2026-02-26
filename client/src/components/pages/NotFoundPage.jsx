import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <span className="text-7xl mb-6 block" aria-hidden="true">🔍</span>
        <h1 className="text-4xl font-bold text-surface-900 dark:text-surface-50 mb-3">
          404 — Page Not Found
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="btn-primary inline-flex items-center gap-2"
        >
          ← Back to Home
        </Link>
      </motion.div>
    </div>
  );
}
