/**
 * Dynamic Sitemap Generator
 * Generates sitemap.xml with all static and dynamic pages
 * Run: npm run generate-sitemap
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

// Mock data types (in production, fetch from actual data sources)
interface Tool {
  id: string;
  slug: string;
  updatedAt?: string;
}

interface NewsArticle {
  id: string;
  slug: string;
  publishedAt?: string;
}

interface ForumThread {
  id: string;
  slug: string;
  updatedAt?: string;
  category: string;
}

const SITE_URL = 'https://mikesaiforge.netlify.app';

// Static pages configuration
const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/#/tools', priority: '0.9', changefreq: 'weekly' },
  { path: '/#/news', priority: '0.9', changefreq: 'daily' },
  { path: '/#/forum', priority: '0.8', changefreq: 'daily' },
  { path: '/#/workflows', priority: '0.7', changefreq: 'weekly' },
  { path: '/#/utilities', priority: '0.7', changefreq: 'monthly' },
  { path: '/#/content-studio', priority: '0.6', changefreq: 'monthly' },
  { path: '/#/chat', priority: '0.6', changefreq: 'weekly' },
  { path: '/#/contact', priority: '0.5', changefreq: 'yearly' },
  { path: '/#/book', priority: '0.5', changefreq: 'yearly' },
  { path: '/#/login', priority: '0.3', changefreq: 'yearly' },
  { path: '/#/signup', priority: '0.3', changefreq: 'yearly' },
];

/**
 * Load dynamic data - In production, replace with actual data fetching
 * For now, returns empty arrays. Integrate with your data sources.
 */
async function loadDynamicData() {
  // TODO: Replace with actual data loading from your backend/database
  // Example implementations:
  
  // const tools = await fetch(`${API_URL}/tools`).then(r => r.json());
  // const news = await fetch(`${API_URL}/news`).then(r => r.json());
  // const threads = await fetch(`${API_URL}/forum/threads`).then(r => r.json());
  
  const tools: Tool[] = [];
  const news: NewsArticle[] = [];
  const threads: ForumThread[] = [];
  
  return { tools, news, threads };
}

/**
 * Generate sitemap URL entry
 */
function generateUrl(
  loc: string,
  priority: string,
  changefreq: string,
  lastmod?: string
): string {
  const lastmodTag = lastmod ? `    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${lastmodTag ? '\n' + lastmodTag : ''}
  </url>`;
}

/**
 * Format date to ISO 8601 (YYYY-MM-DD)
 */
function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Generate complete sitemap XML
 */
async function generateSitemap() {
  console.log('🗺️  Generating sitemap...');
  
  const { tools, news, threads } = await loadDynamicData();
  
  const urls: string[] = [];
  
  // Add static pages
  console.log(`📄 Adding ${staticPages.length} static pages...`);
  staticPages.forEach(page => {
    urls.push(generateUrl(
      `${SITE_URL}${page.path}`,
      page.priority,
      page.changefreq
    ));
  });
  
  // Add tool pages
  if (tools.length > 0) {
    console.log(`🔧 Adding ${tools.length} tool pages...`);
    tools.forEach(tool => {
      const lastmod = tool.updatedAt ? formatDate(tool.updatedAt) : undefined;
      urls.push(generateUrl(
        `${SITE_URL}/#/tools/${tool.slug || tool.id}`,
        '0.8',
        'weekly',
        lastmod
      ));
    });
  } else {
    console.log('⚠️  No tools found. Add data fetching in loadDynamicData()');
  }
  
  // Add news article pages
  if (news.length > 0) {
    console.log(`📰 Adding ${news.length} news articles...`);
    news.forEach(article => {
      const lastmod = article.publishedAt ? formatDate(article.publishedAt) : undefined;
      urls.push(generateUrl(
        `${SITE_URL}/#/news/${article.slug || article.id}`,
        '0.7',
        'monthly',
        lastmod
      ));
    });
  } else {
    console.log('⚠️  No news articles found. Add data fetching in loadDynamicData()');
  }
  
  // Add forum thread pages
  if (threads.length > 0) {
    console.log(`💬 Adding ${threads.length} forum threads...`);
    threads.forEach(thread => {
      const lastmod = thread.updatedAt ? formatDate(thread.updatedAt) : undefined;
      urls.push(generateUrl(
        `${SITE_URL}/#/forum/${thread.category}/${thread.slug || thread.id}`,
        '0.6',
        'daily',
        lastmod
      ));
    });
  } else {
    console.log('⚠️  No forum threads found. Add data fetching in loadDynamicData()');
  }
  
  // Build complete sitemap
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
  
  // Write to public directory
  const outputPath = resolve(process.cwd(), 'public', 'sitemap.xml');
  writeFileSync(outputPath, sitemap, 'utf-8');
  
  console.log(`✅ Sitemap generated successfully!`);
  console.log(`📍 Location: ${outputPath}`);
  console.log(`📊 Total URLs: ${urls.length}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Integrate with your data sources in loadDynamicData()`);
  console.log(`   2. Add to package.json: "generate-sitemap": "tsx scripts/generate-sitemap.ts"`);
  console.log(`   3. Run before build: "prebuild": "npm run generate-sitemap"`);
  console.log(`   4. Submit to Google Search Console: https://search.google.com/search-console`);
}

// Run generator
generateSitemap().catch(error => {
  console.error('❌ Error generating sitemap:', error);
  process.exit(1);
});