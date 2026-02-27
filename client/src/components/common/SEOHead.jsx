import { useEffect } from 'react';

const BASE_URL = 'https://toolspilot.work';

/**
 * SEOHead — dynamically sets document <head> meta tags for each page.
 *
 * Sets: title, description, canonical, Open Graph, Twitter Card,
 * and per-tool SoftwareApplication structured data.
 *
 * Uses direct DOM manipulation since this is a SPA without SSR.
 */
export default function SEOHead({ title, description, path, tool = null }) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ToolsPilot` : 'ToolsPilot — Free Online Tools for Everyone';
    const desc = description || '159+ free online tools — PDF editor, Excel editor, image converter, developer tools, and more. No signup required.';
    const url = `${BASE_URL}${path || ''}`;

    // Title
    document.title = fullTitle;

    // Helper to set/create a meta tag
    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Standard meta
    setMeta('name', 'description', desc);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // Open Graph
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'ToolsPilot');
    setMeta('property', 'og:image', `${BASE_URL}/og-image.svg`);
    setMeta('property', 'og:image:width', '1200');
    setMeta('property', 'og:image:height', '630');

    // Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', `${BASE_URL}/og-image.svg`);

    // Per-tool structured data
    let scriptEl = document.getElementById('tool-structured-data');
    if (tool) {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: tool.name,
        description: tool.description,
        url,
        applicationCategory: getCategoryType(tool.category),
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        author: { '@type': 'Organization', name: 'ToolsPilot' },
      };

      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'tool-structured-data';
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(schema);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    // BreadcrumbList structured data
    let breadcrumbEl = document.getElementById('breadcrumb-structured-data');
    if (tool) {
      const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: capitalize(tool.category), item: `${BASE_URL}/category/${tool.category}` },
          { '@type': 'ListItem', position: 3, name: tool.name, item: url },
        ],
      };
      if (!breadcrumbEl) {
        breadcrumbEl = document.createElement('script');
        breadcrumbEl.id = 'breadcrumb-structured-data';
        breadcrumbEl.type = 'application/ld+json';
        document.head.appendChild(breadcrumbEl);
      }
      breadcrumbEl.textContent = JSON.stringify(breadcrumb);
    } else if (breadcrumbEl) {
      breadcrumbEl.remove();
    }
  }, [title, description, path, tool]);

  return null;
}

function getCategoryType(category) {
  const map = {
    developer: 'DeveloperApplication',
    security: 'SecurityApplication',
    finance: 'FinanceApplication',
    design: 'DesignApplication',
    image: 'MultimediaApplication',
    media: 'MultimediaApplication',
  };
  return map[category] || 'UtilitiesApplication';
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
