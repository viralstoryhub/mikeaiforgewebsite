import React, { useEffect } from 'react';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string; // absolute or /public path
  canonicalPath?: string; // e.g. '/tools'
  jsonLd?: Record<string, any> | Record<string, any>[];
}

const DEFAULT_IMAGE = '/vite.svg';
const ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

function setTag(selector: string, create: () => HTMLElement, set: (el: HTMLElement) => void) {
  let el = document.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  set(el);
  return el;
}

const Seo: React.FC<SeoProps> = ({ title, description, image, canonicalPath, jsonLd }) => {
  useEffect(() => {
    const prevTitle = document.title;
    const prevDescTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = prevDescTag?.getAttribute('content') ?? '';

    if (title) document.title = title;
    if (description) {
      setTag('meta[name="description"]', () => {
        const m = document.createElement('meta');
        m.setAttribute('name', 'description');
        return m;
      }, (el) => el.setAttribute('content', description));
    }

    const imgUrl = image || DEFAULT_IMAGE;
    // Open Graph
    if (title) setTag('meta[property="og:title"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:title');
      return m;
    }, (el) => el.setAttribute('content', title));

    if (description) setTag('meta[property="og:description"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:description');
      return m;
    }, (el) => el.setAttribute('content', description));

    setTag('meta[property="og:image"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:image');
      return m;
    }, (el) => el.setAttribute('content', imgUrl));

    // Twitter
    setTag('meta[name="twitter:card"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'twitter:card');
      return m;
    }, (el) => el.setAttribute('content', 'summary_large_image'));

    if (title) setTag('meta[name="twitter:title"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'twitter:title');
      return m;
    }, (el) => el.setAttribute('content', title));

    if (description) setTag('meta[name="twitter:description"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'twitter:description');
      return m;
    }, (el) => el.setAttribute('content', description));

    setTag('meta[name="twitter:image"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'twitter:image');
      return m;
    }, (el) => el.setAttribute('content', imgUrl));

    // Canonical
    if (canonicalPath) {
      setTag('link[rel="canonical"]', () => {
        const l = document.createElement('link');
        l.setAttribute('rel', 'canonical');
        return l;
      }, (el) => el.setAttribute('href', `${ORIGIN}${canonicalPath}`));
    }

    // JSON-LD
    let jsonLdScript: HTMLScriptElement | null = null;
    if (jsonLd) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.type = 'application/ld+json';
      jsonLdScript.text = Array.isArray(jsonLd) ? JSON.stringify(jsonLd) : JSON.stringify(jsonLd);
      document.head.appendChild(jsonLdScript);
    }

    return () => {
      if (title) document.title = prevTitle;
      if (prevDescTag) prevDescTag.setAttribute('content', prevDesc);
      if (!prevDescTag && description) {
        const cur = document.querySelector('meta[name="description"]');
        cur?.parentElement?.removeChild(cur);
      }
      if (jsonLdScript) jsonLdScript.remove();
    };
  }, [title, description, image, canonicalPath, jsonLd]);

  return null;
};

export default Seo;

