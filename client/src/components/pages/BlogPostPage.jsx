import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BLOG_POSTS } from './BlogPage';

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <span className="text-5xl mb-4" aria-hidden="true">📝</span>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-2">Post Not Found</h1>
        <p className="text-surface-500 dark:text-surface-400 mb-6">This blog post doesn't exist.</p>
        <Link to="/blog" className="btn-primary">← Back to Blog</Link>
      </div>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto pb-12"
    >
      <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-primary-500 transition-colors mb-6">
        ← Back to Blog
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-primary-500 bg-primary-500/10 px-2.5 py-1 rounded-full">
          {post.category}
        </span>
        <span className="text-xs text-surface-400 dark:text-surface-500">{post.readTime} read</span>
        <time className="text-xs text-surface-400 dark:text-surface-500">
          {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </time>
      </div>

      <h1 className="text-3xl lg:text-4xl font-extrabold text-surface-900 dark:text-surface-50 mb-6 leading-tight">
        {post.title}
      </h1>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-lg text-surface-600 dark:text-surface-300 leading-relaxed mb-6">
          {post.excerpt}
        </p>
        <div className="p-6 rounded-2xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/50 dark:border-surface-700/30 text-center">
          <p className="text-surface-500 dark:text-surface-400 mb-4">
            Full article content coming soon. In the meantime, try the tool:
          </p>
          <Link to="/" className="btn-primary inline-flex">
            Explore All Tools →
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
