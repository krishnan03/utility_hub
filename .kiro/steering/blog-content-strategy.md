---
inclusion: manual
---

# Blog Content Strategy

## Core Rule
Every blog post MUST be directly related to one or more ToolsPilot tools. The blog exists to drive organic traffic to our tools — not for generic tech articles.

## Blog Post Requirements

1. **Tool-focused topic** — The post must showcase, explain, or provide a use case for a specific ToolsPilot tool or tool category
2. **Internal links** — Every post must include a `links` section at the end pointing to 3-6 related tools using their actual paths from toolRegistry
3. **Practical value** — Posts should answer "how do I do X?" where X is something our tools solve (e.g., "How to Merge PDF Files" → PDF Merger tool)
4. **SEO keywords** — Title and content should target search queries that lead to our tools (e.g., "free online JSON formatter", "compress images without losing quality")

## What Makes a Good Blog Topic
- A tool that's new or recently improved
- A common user task that one of our tools handles (e.g., "How to Convert HEIC to JPG")
- A comparison or guide that naturally features our tools (e.g., "Best Free PDF Editors in 2026")
- Tips and workflows that chain multiple tools together

## What to Avoid
- Generic tech articles not tied to any tool (e.g., "What is HTTPS")
- Posts about infrastructure, deployment, or internal engineering
- Topics where we don't have a relevant tool to link to

## Where to Add Blog Posts
1. Add entry to `BLOG_POSTS` array in `client/src/components/pages/BlogPage.jsx` (at the top — newest first)
2. Add content to `BLOG_CONTENT` in `client/src/lib/blogContent.js`
3. Add URL to `client/public/sitemap.xml` under the Blog Posts section

## Format Reference
```js
// BlogPage.jsx — BLOG_POSTS entry
{
  slug: 'your-post-slug',
  title: 'Your SEO-Friendly Title — With Tool Name',
  excerpt: 'A compelling 1-2 sentence description targeting search keywords.',
  date: 'YYYY-MM-DD',
  category: 'Category Name',
  readTime: 'X min',
}

// blogContent.js — BLOG_CONTENT entry
'your-post-slug': {
  sections: [
    { heading: '...', body: '...' },
    { heading: 'Try These Tools', links: [
      { label: 'Tool Name', path: '/tools/category/tool-id', icon: '🔧' },
    ]},
  ],
}
```
