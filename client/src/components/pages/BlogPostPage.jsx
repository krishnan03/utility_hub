import { useParams, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BLOG_POSTS } from './BlogPage';
import SEOHead from '../common/SEOHead';
import BLOG_CONTENT from '../../lib/blogContent';

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  // Inject Article structured data for blog posts
  useEffect(() => {
    if (!post) return;
    let scriptEl = document.getElementById('article-structured-data');
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt,
      datePublished: post.date,
      dateModified: post.date,
      url: `https://toolspilot.work/blog/${post.slug}`,
      author: { '@type': 'Organization', name: 'ToolsPilot' },
      publisher: {
        '@type': 'Organization',
        name: 'ToolsPilot',
        logo: { '@type': 'ImageObject', url: 'https://toolspilot.work/favicon.svg' },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `https://toolspilot.work/blog/${post.slug}` },
    };
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'article-structured-data';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(schema);
    return () => { if (scriptEl) scriptEl.remove(); };
  }, [post]);

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
      <SEOHead
        title={post.title}
        description={post.excerpt}
        path={`/blog/${post.slug}`}
      />
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

        {BLOG_CONTENT[slug] ? (
          <div className="space-y-8">
            {BLOG_CONTENT[slug].sections.map((section, i) => (
              <div key={i}>
                {section.heading && (
                  <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50 mb-3">
                    {section.heading}
                  </h2>
                )}
                {section.body && (
                  <p className="text-surface-600 dark:text-surface-300 leading-relaxed whitespace-pre-line">
                    {section.body}
                  </p>
                )}
                {section.code && (
                  <pre className="p-4 rounded-xl text-sm font-mono overflow-x-auto" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <code className="text-surface-200">{section.code}</code>
                  </pre>
                )}
                {section.links && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {section.links.map((link) => (
                      <Link key={link.path} to={link.path} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors" style={{ background: 'rgba(255,99,99,0.08)', border: '1px solid rgba(255,99,99,0.15)' }}>
                        {link.icon && <span aria-hidden="true">{link.icon}</span>}
                        {link.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/50 dark:border-surface-700/30 text-center">
            <p className="text-surface-500 dark:text-surface-400 mb-4">
              Full article content coming soon. In the meantime, try the tool:
            </p>
            <Link to="/" className="btn-primary inline-flex">
              Explore All Tools →
            </Link>
          </div>
        )}
      </div>
    </motion.article>
  );
}
