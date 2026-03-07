import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BLOG_POSTS } from './BlogPage';
import SEOHead from '../common/SEOHead';
import BLOG_CONTENT from '../../lib/blogContent';

/** Glassmorphism tool link cards — reusable grid */
function ToolLinksGrid({ links, compact = false }) {
  if (!links?.length) return null;
  return (
    <div className={compact ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 sm:grid-cols-3 gap-3'}>
      {links.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          className={`group relative flex items-center gap-2 rounded-2xl text-center transition-all duration-300 hover:scale-[1.04] hover:shadow-lg hover:shadow-primary-500/10 ${compact ? 'flex-row px-4 py-2.5' : 'flex-col p-4'}`}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--tp-selection)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {link.icon && (
            <span className={`relative group-hover:scale-110 transition-transform duration-300 ${compact ? 'text-lg' : 'text-2xl'}`} aria-hidden="true">
              {link.icon}
            </span>
          )}
          <span className={`relative font-semibold text-surface-200 group-hover:text-primary-400 transition-colors duration-300 ${compact ? 'text-sm' : 'text-sm'}`}>
            {link.label}
          </span>
          {!compact && (
            <span className="relative text-xs text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium">
              Try it free →
            </span>
          )}
          {compact && (
            <span className="relative text-xs text-primary-500 font-medium ml-0.5">→</span>
          )}
        </Link>
      ))}
    </div>
  );
}

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

      {/* Collect all tool links from blog content */}
      {(() => {
        const content = BLOG_CONTENT[slug];
        const allLinks = content?.sections?.flatMap(s => s.links || []) || [];
        return (
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-lg text-surface-600 dark:text-surface-300 leading-relaxed mb-6">
              {post.excerpt}
            </p>

            {/* Top CTA — compact tool links strip */}
            {allLinks.length > 0 && (
              <div className="mb-8 p-4 rounded-2xl" style={{ background: 'var(--tp-selection)', border: '1px solid var(--tp-border-hover)' }}>
                <p className="text-xs font-bold uppercase tracking-wider text-primary-500 mb-3">🚀 Jump to tools mentioned in this article</p>
                <ToolLinksGrid links={allLinks} compact />
              </div>
            )}

            {content ? (
              <div className="space-y-8">
                {content.sections.map((section, i) => (
                  <div key={i}>
                    {section.heading && !section.links && (
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
                    {/* Skip inline links rendering — we show them top & bottom instead */}
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

            {/* Bottom CTA — full grid tool links */}
            {allLinks.length > 0 && (
              <div className="mt-10 pt-8" style={{ borderTop: '1px solid var(--tp-border-hover)' }}>
                <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50 mb-4">
                  ✨ Try These Tools
                </h2>
                <ToolLinksGrid links={allLinks} />
              </div>
            )}
          </div>
        );
      })()}
    </motion.article>
  );
}
