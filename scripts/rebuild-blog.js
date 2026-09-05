const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT_DIR = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT_DIR, 'blog');
const TEMPLATE_PATH = path.join(BLOG_DIR, 'templates/article-template.html');

const LANGUAGES = ['en', 'hi', 'ne', 'es', 'vi', 'ru'];

const LOCALE_MAP = {
  en: 'en_US',
  hi: 'hi_IN',
  ne: 'ne_NP',
  es: 'es_ES',
  vi: 'vi_VN',
  ru: 'ru_RU'
};

const CATEGORIES = [
  { id: 'all', name: 'All', slug: 'index' },
  { id: 'productivity', name: 'Productivity', slug: 'productivity' },
  { id: 'focus', name: 'Focus', slug: 'focus' },
  { id: 'study', name: 'Study', slug: 'study' },
  { id: 'time-management', name: 'Time Management', slug: 'time-management' },
  { id: 'habits', name: 'Habits', slug: 'habits' },
  { id: 'deep-work', name: 'Deep Work', slug: 'deep-work' }
];

// Curated metadata registry for the 25 active authoritative articles
const ARTICLE_CATALOG = {
  'what-is-the-pomodoro-method': {
    category: 'Productivity',
    heroImage: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'May 12, 2024',
    updatedDate: 'September 5, 2026',
    readingTime: '9 min read',
    author: 'Dipesh Yadav',
    isFeatured: true
  },
  'benefits-of-pomodoro-technique': {
    category: 'Productivity',
    heroImage: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'May 5, 2024',
    readingTime: '7 min read',
    author: 'FlowPomodoro Team'
  },
  'science-behind-pomodoro': {
    category: 'Productivity',
    heroImage: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Jan 20, 2024',
    readingTime: '8 min read',
    author: 'FlowPomodoro Team'
  },
  'pomodoro-faq': {
    category: 'Productivity',
    heroImage: 'https://images.unsplash.com/photo-1516387938699-a93567ec168e?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Feb 26, 2024',
    readingTime: '6 min read',
    author: 'FlowPomodoro Team'
  },
  'pomodoro-mistakes': {
    category: 'Productivity',
    heroImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Feb 10, 2024',
    readingTime: '6 min read',
    author: 'FlowPomodoro Team'
  },
  'how-many-pomodoros-per-day': {
    category: 'Time Management',
    heroImage: 'https://images.unsplash.com/photo-1501139083538-0139583c060f?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Mar 22, 2024',
    readingTime: '5 min read',
    author: 'FlowPomodoro Team'
  },
  'best-pomodoro-apps': {
    category: 'Productivity',
    heroImage: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Apr 28, 2024',
    readingTime: '8 min read',
    author: 'FlowPomodoro Team'
  },
  'flow-state-explained': {
    category: 'Focus',
    heroImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Apr 4, 2024',
    readingTime: '8 min read',
    author: 'Dipesh Yadav'
  },
  'adhd-focus': {
    category: 'Focus',
    heroImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'May 10, 2024',
    readingTime: '6 min read',
    author: 'FlowPomodoro Team'
  },
  'adhd-productivity-methods': {
    category: 'Productivity',
    heroImage: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'May 8, 2024',
    readingTime: '7 min read',
    author: 'FlowPomodoro Team'
  },
  'how-to-beat-procrastination': {
    category: 'Focus',
    heroImage: 'https://images.unsplash.com/photo-1507842229451-79b1be897a20?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Mar 18, 2024',
    readingTime: '7 min read',
    author: 'FlowPomodoro Team'
  },
  'distraction-control': {
    category: 'Focus',
    heroImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Apr 8, 2024',
    readingTime: '6 min read',
    author: 'FlowPomodoro Team'
  },
  'focus-techniques': {
    category: 'Focus',
    heroImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Mar 26, 2024',
    readingTime: '6 min read',
    author: 'FlowPomodoro Team'
  },
  'pomodoro-for-programming': {
    category: 'Deep Work',
    heroImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Feb 18, 2024',
    readingTime: '8 min read',
    author: 'FlowPomodoro Team'
  },
  'focus-techniques-for-developers': {
    category: 'Focus',
    heroImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Mar 30, 2024',
    readingTime: '7 min read',
    author: 'FlowPomodoro Team'
  },
  'pomodoro-for-exams': {
    category: 'Study',
    heroImage: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Feb 22, 2024',
    readingTime: '8 min read',
    author: 'FlowPomodoro Team'
  },
  'how-to-study-for-long-hours': {
    category: 'Study',
    heroImage: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Mar 10, 2024',
    readingTime: '8 min read',
    author: 'FlowPomodoro Team'
  },
  'student-productivity': {
    category: 'Study',
    heroImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Jan 16, 2024',
    readingTime: '6 min read',
    author: 'FlowPomodoro Team'
  },
  'pomodoro-for-remote-workers': {
    category: 'Productivity',
    heroImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Feb 14, 2024',
    readingTime: '6 min read',
    author: 'FlowPomodoro Team'
  },
  'daily-planning-system': {
    category: 'Time Management',
    heroImage: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Apr 20, 2024',
    readingTime: '7 min read',
    author: 'FlowPomodoro Team'
  },
  'pomodoro-vs-time-blocking': {
    category: 'Time Management',
    heroImage: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Jan 28, 2024',
    readingTime: '7 min read',
    author: 'FlowPomodoro Team'
  },
  'deep-work-guide': {
    category: 'Deep Work',
    heroImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Apr 16, 2024',
    readingTime: '9 min read',
    author: 'FlowPomodoro Team'
  },
  'pomodoro-vs-deep-work': {
    category: 'Deep Work',
    heroImage: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Feb 2, 2024',
    readingTime: '6 min read',
    author: 'FlowPomodoro Team'
  },
  'how-to-build-better-habits': {
    category: 'Habits',
    heroImage: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Mar 14, 2024',
    readingTime: '7 min read',
    author: 'FlowPomodoro Team'
  },
  'best-productivity-techniques': {
    category: 'Productivity',
    heroImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80',
    publishedDate: 'Apr 24, 2024',
    readingTime: '8 min read',
    author: 'FlowPomodoro Team'
  }
};

const FOCUS_CTA_HTML = `
<!-- FlowPomodoro Focus CTA Widget -->
<div class="focus-cta">
  <h3>Ready to Focus?</h3>
  <p>Choose your interval and start a focused session right now.</p>
  <div class="timer-preview">
    <span class="control">−</span>
    <span>25:00</span>
    <span class="control">+</span>
  </div>
  <a href="/app/index.html" class="btn-focus"><i class="fas fa-play" style="font-size:0.85rem;" aria-hidden="true"></i> Start Focus Session &rarr;</a>
</div>
`;

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

// Load template
const templateHtml = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

// Store parsed articles by language: lang -> slug -> data
const parsedStore = {};

console.log('--- Step 1: Parsing Existing Articles Across All Languages ---');

LANGUAGES.forEach(lang => {
  parsedStore[lang] = {};
  const langDir = path.join(BLOG_DIR, lang);
  if (!fs.existsSync(langDir)) return;

  const files = fs.readdirSync(langDir).filter(f => f.endsWith('.html') && f !== 'index.html');

  files.forEach(file => {
    const slug = path.basename(file, '.html');
    const filePath = path.join(langDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(content);

    const title = $('title').text().replace(/\s*\|\s*FlowPomodoro.*$/i, '').trim() || $('h1').first().text().trim();
    const description = $('meta[name="description"]').attr('content') || '';
    const h1 = $('h1').first().text().trim() || title;

    // Check FAQ schema
    let faqSchema = '';
    $('script[type="application/ld+json"]').each((_, el) => {
      const raw = $(el).html();
      if (raw.includes('FAQPage')) {
        faqSchema = $.html(el);
      }
    });

    // Extract body
    const $body = $('.article-body').length ? $('.article-body') : $('article');
    
    // Remove duplicate/old breadcrumb, header, CTA or related articles from body if nested
    $body.find('.editorial-breadcrumb, .editorial-header, .article-hero, .layout-sidebar, .bottom-components, .editorial-nav, .lp-nav, .lp-footer, footer, header').remove();
    
    // Clean old duplicate CTAs inside body to avoid double CTAs
    $body.find('.focus-cta').remove();

    parsedStore[lang][slug] = {
      slug,
      title,
      h1,
      description,
      faqSchema,
      bodyHtml: $body.html() || '',
      catalog: ARTICLE_CATALOG[slug] || {
        category: 'Productivity',
        heroImage: 'https://flowpomodoro.xyz/og-image.jpg',
        publishedDate: 'September 5, 2026',
        readingTime: '5 min read',
        author: 'FlowPomodoro Team'
      }
    };
  });
});

console.log(`Parsed ${Object.keys(parsedStore.en).length} English articles.`);

console.log('--- Step 2: Regenerating All Articles with Master Template ---');

const articleSlugs = Object.keys(ARTICLE_CATALOG);

LANGUAGES.forEach(lang => {
  const articlesInLang = parsedStore[lang] || {};
  const slugs = Object.keys(articlesInLang);

  slugs.forEach((slug, idx) => {
    const article = articlesInLang[slug];
    const catalog = article.catalog;

    // Load body in cheerio to process TOC IDs and add CTA
    const $b = cheerio.load(`<div class="article-body">${article.bodyHtml}</div>`, null, false);
    
    // Process H2s and build TOC
    const tocItems = [];
    let h2Idx = 1;
    const seenIds = new Set();
    $b('h2').each((_, el) => {
      const $el = $b(el);
      let id = $el.attr('id');
      if (!id) {
        id = slugify($el.text()) || `section-${h2Idx}`;
      }
      if (seenIds.has(id)) {
        id = `${id}-${h2Idx}`;
      }
      seenIds.add(id);
      $el.attr('id', id);

      tocItems.push({
        id,
        number: h2Idx.toString().padStart(2, '0'),
        title: $el.text().trim()
      });
      h2Idx++;
    });

    // Make first paragraph drop-cap
    const $firstP = $b('p').first();
    if ($firstP.length) {
      $firstP.addClass('drop-cap');
    }

    // Insert CTA before FAQs or conclusion
    const $faqH2 = $b('h2').filter((_, el) => $b(el).text().toLowerCase().includes('faq') || $b(el).text().toLowerCase().includes('frequently'));
    if ($faqH2.length) {
      $faqH2.before(FOCUS_CTA_HTML);
    } else {
      $b('.article-body').append(FOCUS_CTA_HTML);
    }

    // Build TOC HTML
    const tocHtml = tocItems.map(item => `
      <li>
        <a href="#${item.id}">
          <span class="toc-number">${item.number}</span>
          <span class="toc-text">${item.title}</span>
        </a>
      </li>
    `).join('\n');

    // Build Related Articles (3 items)
    const otherSlugs = slugs.filter(s => s !== slug);
    // Find articles in same category first
    const sameCat = otherSlugs.filter(s => ARTICLE_CATALOG[s] && ARTICLE_CATALOG[s].category === catalog.category);
    const diffCat = otherSlugs.filter(s => !sameCat.includes(s));
    const relatedList = [...sameCat, ...diffCat].slice(0, 3);

    const relatedArticlesHtml = relatedList.map(rSlug => {
      const relData = articlesInLang[rSlug] || parsedStore['en'][rSlug] || { title: rSlug, catalog: {} };
      const relCat = ARTICLE_CATALOG[rSlug] ? ARTICLE_CATALOG[rSlug].category : 'Productivity';
      const relImg = ARTICLE_CATALOG[rSlug] ? ARTICLE_CATALOG[rSlug].heroImage : 'https://flowpomodoro.xyz/og-image.jpg';
      const relTime = ARTICLE_CATALOG[rSlug] ? ARTICLE_CATALOG[rSlug].readingTime : '5 min read';

      return `
        <a href="/blog/${lang}/${rSlug}.html" class="related-card">
          <img src="${relImg}" alt="${relData.title}" class="related-thumb" loading="lazy">
          <div class="related-info">
            <h4>${relData.title}</h4>
            <div class="related-meta">${relCat} · ${relTime}</div>
          </div>
        </a>
      `;
    }).join('\n');

    // Prev / Next Navigation
    const prevSlug = slugs[idx - 1] || slugs[slugs.length - 1];
    const nextSlug = slugs[idx + 1] || slugs[0];
    const prevArticle = articlesInLang[prevSlug] || parsedStore['en'][prevSlug];
    const nextArticle = articlesInLang[nextSlug] || parsedStore['en'][nextSlug];

    const prevNextHtml = `
      <a href="/blog/${lang}/${prevSlug}.html" class="pn-link prev">
        <span class="pn-label">&larr; Previous</span>
        <h4 class="pn-title">${prevArticle ? prevArticle.title : 'Previous Article'}</h4>
      </a>
      <a href="/blog/${lang}/${nextSlug}.html" class="pn-link next">
        <span class="pn-label">Next &rarr;</span>
        <h4 class="pn-title">${nextArticle ? nextArticle.title : 'Next Article'}</h4>
      </a>
    `;

    // Helper to format ISO date safely
    function formatIsoDate(dStr) {
      if (!dStr) return '';
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return '2024-01-01'; // Fallback
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const schemaDatePublished = formatIsoDate(catalog.publishedDate);
    const schemaDateModified = formatIsoDate(catalog.updatedDate || catalog.publishedDate);
    const visibleDateStr = catalog.updatedDate 
      ? `Updated ${catalog.updatedDate}` 
      : catalog.publishedDate;

    // Replace template tokens
    let rendered = templateHtml
      .replace(/{{article\.language}}/g, lang)
      .replace(/{{article\.ogLocale}}/g, LOCALE_MAP[lang] || 'en_US')
      .replace(/{{article\.slug}}/g, slug)
      .replace(/{{article\.title}}/g, article.title)
      .replace(/{{article\.description}}/g, article.description)
      .replace(/{{article\.category}}/g, catalog.category)
      .replace(/{{article\.heroImage}}/g, catalog.heroImage)
      .replace(/{{article\.schemaDatePublished}}/g, schemaDatePublished)
      .replace(/{{article\.schemaDateModified}}/g, schemaDateModified)
      .replace(/{{article\.visibleDateStr}}/g, visibleDateStr)
      .replace(/{{article\.readingTime}}/g, catalog.readingTime)
      .replace(/{{article\.author}}/g, catalog.author || 'FlowPomodoro Team')
      .replace(/{{article\.authorInitial}}/g, (catalog.author || 'F')[0])
      .replace(/{{article\.faqSchema}}/g, article.faqSchema || '')
      .replace(/{{article\.tocHtml}}/g, tocHtml)
      .replace(/{{article\.bodyHtml}}/g, $b('.article-body').html())
      .replace(/{{article\.relatedArticlesHtml}}/g, relatedArticlesHtml)
      .replace(/{{article\.prevNextHtml}}/g, prevNextHtml);

    const outPath = path.join(BLOG_DIR, lang, `${slug}.html`);
    fs.writeFileSync(outPath, rendered, 'utf-8');
  });
});

console.log('All articles regenerated successfully.');

console.log('--- Step 3: Generating Modern Blog Homepages & Category Pages ---');

function generateBlogHome(lang, activeCategory = 'all') {
  const articlesInLang = parsedStore[lang] || parsedStore['en'];
  const allSlugs = Object.keys(ARTICLE_CATALOG);

  // Filter if activeCategory !== 'all'
  let displaySlugs = allSlugs;
  if (activeCategory !== 'all') {
    const targetCat = CATEGORIES.find(c => c.id === activeCategory);
    if (targetCat) {
      displaySlugs = allSlugs.filter(s => ARTICLE_CATALOG[s].category.toLowerCase().replace(/[^a-z0-9]/g, '-') === activeCategory);
    }
  }

  // Featured Article
  const featuredSlug = 'what-is-the-pomodoro-method';
  const featuredArticle = articlesInLang[featuredSlug] || parsedStore['en'][featuredSlug];
  const featuredCatalog = ARTICLE_CATALOG[featuredSlug];
  const featuredVisibleDateStr = featuredCatalog.updatedDate ? `Updated ${featuredCatalog.updatedDate}` : featuredCatalog.publishedDate;

  // Latest Articles (exclude featured from main grid if displaying 'all')
  const gridSlugs = activeCategory === 'all' ? displaySlugs.filter(s => s !== featuredSlug) : displaySlugs;

  // Article Cards HTML
  const cardsHtml = gridSlugs.map(slug => {
    const art = articlesInLang[slug] || parsedStore['en'][slug];
    const cat = ARTICLE_CATALOG[slug];
    const catSlug = cat.category.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const visibleDateStr = cat.updatedDate ? `Updated ${cat.updatedDate}` : cat.publishedDate;

    return `
      <article class="article-card" data-category="${catSlug}" data-title="${art.title.toLowerCase()}">
        <a href="/blog/${lang}/${slug}.html" class="article-card-thumb" aria-label="${art.title}">
          <img src="${cat.heroImage}" alt="${art.title}" loading="lazy">
        </a>
        <div class="article-card-body">
          <div class="article-card-meta">
            <span class="article-card-category">${cat.category}</span>
            <span class="article-card-time">${visibleDateStr} · ${cat.readingTime}</span>
          </div>
          <h3 class="article-card-title">
            <a href="/blog/${lang}/${slug}.html">${art.title}</a>
          </h3>
          <p class="article-card-excerpt">${art.description}</p>
          <div class="article-card-footer">
            <span>Read Article</span>
            <span class="read-arrow"><i class="fas fa-arrow-right"></i></span>
          </div>
        </div>
        <button class="btn-bookmark mobile-card-bookmark" aria-label="Bookmark article" data-slug="${slug}">
          <i class="far fa-bookmark"></i>
        </button>
      </article>
    `;
  }).join('\n');

  // Popular Reads HTML (4 top curated articles)
  const popularSlugs = ['science-behind-pomodoro', 'how-to-beat-procrastination', 'deep-work-guide', 'pomodoro-vs-time-blocking'];
  const popularHtml = popularSlugs.map((slug, pIdx) => {
    const pArt = articlesInLang[slug] || parsedStore['en'][slug];
    const pCat = ARTICLE_CATALOG[slug];
    const num = (pIdx + 1).toString().padStart(2, '0');

    return `
      <a href="/blog/${lang}/${slug}.html" class="popular-read-card">
        <div class="popular-number">${num}</div>
        <div class="popular-info">
          <div class="popular-category">${pCat.category}</div>
          <div class="popular-title">${pArt.title}</div>
          <div class="popular-meta">${pCat.readingTime}</div>
        </div>
        <div class="popular-arrow"><i class="fas fa-arrow-right"></i></div>
      </a>
    `;
  }).join('\n');

  // Category Pills HTML
  const categoryPillsHtml = CATEGORIES.map(cat => {
    const isActive = cat.id === activeCategory;
    const count = cat.id === 'all' 
      ? allSlugs.length 
      : allSlugs.filter(s => ARTICLE_CATALOG[s].category.toLowerCase().replace(/[^a-z0-9]/g, '-') === cat.id).length;
    
    const href = cat.id === 'all' 
      ? `/blog/${lang}/index.html` 
      : `/blog/${lang}/${cat.slug}.html`;

    return `
      <a href="${href}" class="category-pill ${isActive ? 'active' : ''}" data-filter="${cat.id}">
        ${cat.name} <span class="pill-count">${count}</span>
      </a>
    `;
  }).join('\n');

  const pageTitle = activeCategory === 'all'
    ? 'FlowPomodoro Journal — Productivity, Focus & Deep Work Guides'
    : `${CATEGORIES.find(c => c.id === activeCategory).name} Guides & Articles | FlowPomodoro Journal`;

  const pageDesc = activeCategory === 'all'
    ? 'Practical ideas for productivity, focus, studying, time management, and building better habits. Evidence-based deep work strategies.'
    : `Explore curated ${CATEGORIES.find(c => c.id === activeCategory).name.toLowerCase()} articles and expert guides to help you master focus and time management.`;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="ltr" data-theme="light">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ESNYBTJ98S"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-ESNYBTJ98S');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <title>${pageTitle}</title>
  <meta name="description" content="${pageDesc}">
  <link rel="canonical" href="https://flowpomodoro.xyz/blog/${lang}/${activeCategory === 'all' ? 'index.html' : activeCategory + '.html'}">
  <meta name="theme-color" content="#FAFAF7">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="FlowPomodoro">
  <meta property="og:url" content="https://flowpomodoro.xyz/blog/${lang}/">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDesc}">
  <meta property="og:image" content="https://flowpomodoro.xyz/og-image.jpg">
  <meta property="og:locale" content="${LOCALE_MAP[lang] || 'en_US'}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${pageTitle}">
  <meta name="twitter:description" content="${pageDesc}">
  <meta name="twitter:image" content="https://flowpomodoro.xyz/og-image.jpg">

  <!-- Hreflang Links -->
  <link rel="alternate" hreflang="en" href="https://flowpomodoro.xyz/blog/en/${activeCategory === 'all' ? 'index.html' : activeCategory + '.html'}" />
  <link rel="alternate" hreflang="hi" href="https://flowpomodoro.xyz/blog/hi/${activeCategory === 'all' ? 'index.html' : activeCategory + '.html'}" />
  <link rel="alternate" hreflang="ne" href="https://flowpomodoro.xyz/blog/ne/${activeCategory === 'all' ? 'index.html' : activeCategory + '.html'}" />
  <link rel="alternate" hreflang="es" href="https://flowpomodoro.xyz/blog/es/${activeCategory === 'all' ? 'index.html' : activeCategory + '.html'}" />
  <link rel="alternate" hreflang="vi" href="https://flowpomodoro.xyz/blog/vi/${activeCategory === 'all' ? 'index.html' : activeCategory + '.html'}" />
  <link rel="alternate" hreflang="ru" href="https://flowpomodoro.xyz/blog/ru/${activeCategory === 'all' ? 'index.html' : activeCategory + '.html'}" />
  <link rel="alternate" hreflang="x-default" href="https://flowpomodoro.xyz/blog/en/${activeCategory === 'all' ? 'index.html' : activeCategory + '.html'}" />

  <!-- Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "FlowPomodoro Journal",
    "url": "https://flowpomodoro.xyz/blog/${lang}/",
    "description": "${pageDesc}",
    "publisher": {
      "@type": "Organization",
      "name": "FlowPomodoro",
      "url": "https://flowpomodoro.xyz",
      "logo": {
        "@type": "ImageObject",
        "url": "https://flowpomodoro.xyz/assets/favicon.svg"
      }
    }
  }
  </script>

  <!-- Fonts & Icons -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" crossorigin="anonymous">

  <!-- Global Styles -->
  <link rel="stylesheet" href="/css/variables.css">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/layout.css">
  <link rel="stylesheet" href="/css/components.css">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/css/pages/blog.css">
</head>

<body>

  <!-- ── Navigation ────────────────────────────────────────────────────────── -->
  <nav class="lp-nav" aria-label="Main navigation" id="main-nav">
    <div class="nav-inner">
      <a href="/" class="logo" aria-label="FlowPomodoro home">
        <div class="logo-dot"><i class="fas fa-stopwatch"></i></div>
        FlowPomodoro
      </a>

      <div class="nav-links" id="nav-links">
        <a href="/app/index.html" class="nav-link">Timer</a>
        <a href="/#features" class="nav-link">Features</a>
        <a href="/blog/${lang}/" class="nav-link" aria-current="page" style="color:var(--brand-primary); font-weight:700;">Blog</a>
        <a href="/pages/pricing.html" class="nav-link">Pricing</a>
        <a href="/pages/about.html" class="nav-link">About</a>
      </div>

      <div class="nav-actions">
        <div class="lang-switcher" style="position:relative; display:inline-block;">
          <button class="btn-icon lang-btn" id="lang-menu-btn" aria-label="Select Language" title="Select Language">
            <i class="fas fa-globe"></i>
          </button>
          <div class="lang-dropdown" id="lang-dropdown" style="display:none; position:absolute; top:120%; right:0; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:12px; padding:0.5rem; min-width:150px; z-index:999; flex-direction:column; gap:0.2rem; box-shadow:var(--shadow-lg);">
            <a href="/blog/en/${activeCategory === 'all' ? 'index.html' : activeCategory + '.html'}" class="lang-option" style="display:block; padding:0.5rem 1rem; color:var(--text-primary); text-decoration:none; border-radius:6px; font-size:0.85rem;">🇺🇸 English</a>
            <a href="/blog/hi/${activeCategory === 'all' ? 'index.html' : activeCategory + '.html'}" class="lang-option" style="display:block; padding:0.5rem 1rem; color:var(--text-primary); text-decoration:none; border-radius:6px; font-size:0.85rem;">🇮🇳 Hindi</a>
            <a href="/blog/ne/${activeCategory === 'all' ? 'index.html' : activeCategory + '.html'}" class="lang-option" style="display:block; padding:0.5rem 1rem; color:var(--text-primary); text-decoration:none; border-radius:6px; font-size:0.85rem;">🇳🇵 Nepali</a>
            <a href="/blog/es/${activeCategory === 'all' ? 'index.html' : activeCategory + '.html'}" class="lang-option" style="display:block; padding:0.5rem 1rem; color:var(--text-primary); text-decoration:none; border-radius:6px; font-size:0.85rem;">🇪🇸 Spanish</a>
            <a href="/blog/vi/${activeCategory === 'all' ? 'index.html' : activeCategory + '.html'}" class="lang-option" style="display:block; padding:0.5rem 1rem; color:var(--text-primary); text-decoration:none; border-radius:6px; font-size:0.85rem;">🇻🇳 Vietnamese</a>
            <a href="/blog/ru/${activeCategory === 'all' ? 'index.html' : activeCategory + '.html'}" class="lang-option" style="display:block; padding:0.5rem 1rem; color:var(--text-primary); text-decoration:none; border-radius:6px; font-size:0.85rem;">🇷🇺 Русский</a>
          </div>
        </div>

        <button class="btn-icon" id="theme-toggle" aria-label="Toggle theme">
          <i class="fas fa-sun"></i>
        </button>
        <a href="/pages/login.html" class="nav-link">Log in</a>
        <a href="/app/index.html" class="btn-primary">Start Focusing</a>
      </div>

      <button class="nav-hamburger" id="nav-hamburger" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>

  <!-- Mobile Drawer -->
  <div class="nav-drawer" id="nav-drawer" role="dialog" aria-modal="true" aria-label="Mobile navigation">
    <a href="/app/index.html" class="nav-drawer-link">Timer</a>
    <a href="/#features" class="nav-drawer-link">Features</a>
    <a href="/blog/${lang}/" class="nav-drawer-link" style="color:var(--brand-primary); font-weight:700;">Blog</a>
    <a href="/pages/pricing.html" class="nav-drawer-link">Pricing</a>
    <a href="/pages/about.html" class="nav-drawer-link">About</a>
    <div style="display:flex; gap:1rem; margin-top:2rem;">
      <a href="/pages/login.html" class="btn-secondary">Log in</a>
      <a href="/app/index.html" class="btn-primary">Start Focusing</a>
    </div>
  </div>

  <main id="main-content">

    <!-- ── Hero ──────────────────────────────────────────────────────────────── -->
    <section class="blog-hero" aria-label="Blog header">
      <div class="container">
        <div class="blog-eyebrow">
          <i class="fas fa-pen-nib" aria-hidden="true"></i> FLOWPOMODORO JOURNAL
        </div>
        <h1>Get better at focusing.</h1>
        <p class="hero-subtitle">
          Practical ideas for productivity, focus, studying, time management, and building better habits.
        </p>

        <!-- Search Bar -->
        <div class="blog-search-wrap">
          <div class="blog-search" role="search" aria-label="Search articles">
            <i class="fas fa-search" aria-hidden="true"></i>
            <input type="search" id="blog-search-input" placeholder="Search articles..." aria-label="Search articles">
            <button class="blog-search-btn" id="blog-search-btn">Search</button>
          </div>
        </div>
      </div>
    </section>

    <div class="container" style="max-width:1140px; margin:0 auto; padding:0 1.5rem;">

      <!-- ── Category Filter Pills ─────────────────────────────────────────── -->
      <nav class="blog-nav-categories" aria-label="Article categories">
        ${categoryPillsHtml}
      </nav>

      ${activeCategory === 'all' ? `
      <!-- ── Featured Article ──────────────────────────────────────────────── -->
      <article class="featured-article-card" aria-label="Featured article">
        <a href="/blog/${lang}/${featuredSlug}.html" class="featured-image-wrapper" aria-label="${featuredArticle.title}">
          <span class="featured-badge">FEATURED</span>
          <img src="${featuredCatalog.heroImage}" alt="${featuredArticle.title}" loading="eager">
        </a>
        <div class="featured-content">
          <div class="featured-meta-row">
            <span class="article-category-tag">${featuredCatalog.category}</span>
            <span class="featured-meta-date">${featuredVisibleDateStr} · ${featuredCatalog.readingTime}</span>
          </div>
          <h2 class="featured-title">
            <a href="/blog/${lang}/${featuredSlug}.html" style="color:inherit; text-decoration:none;">${featuredArticle.title}</a>
          </h2>
          <p class="featured-excerpt">${featuredArticle.description}</p>
          <div class="featured-footer">
            <a href="/blog/${lang}/${featuredSlug}.html" class="read-more-link">
              Read Article <i class="fas fa-arrow-right" aria-hidden="true"></i>
            </a>
            <button class="btn-bookmark" aria-label="Bookmark article" data-slug="${featuredSlug}">
              <i class="far fa-bookmark"></i>
            </button>
          </div>
        </div>
      </article>
      ` : ''}

      <!-- ── Latest Articles Grid ──────────────────────────────────────────── -->
      <section aria-label="Articles list">
        <div class="blog-section-header">
          <h2>${activeCategory === 'all' ? 'Latest Articles' : CATEGORIES.find(c => c.id === activeCategory).name + ' Articles'}</h2>
          <span id="article-count-label" style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">${gridSlugs.length} articles</span>
        </div>

        <div class="articles-grid" id="articles-grid">
          ${cardsHtml}
        </div>

        <!-- Search Empty State -->
        <div id="search-empty-state" style="display:none; text-align:center; padding:4rem 1.5rem; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-xl); margin-bottom:4rem;">
          <i class="fas fa-search" style="font-size:2.5rem; color:var(--text-muted); margin-bottom:1rem;" aria-hidden="true"></i>
          <h3 style="font-size:1.4rem; font-weight:700; color:var(--text-primary); margin:0 0 0.5rem 0;">No articles found.</h3>
          <p style="color:var(--text-secondary); margin:0;">Try searching for another topic or keyword.</p>
        </div>
      </section>

      <!-- ── Popular Reads Section ─────────────────────────────────────────── -->
      <section class="popular-reads-section" aria-label="Popular reads">
        <div class="blog-section-header">
          <h2>Popular Reads</h2>
        </div>
        <div class="popular-reads-grid">
          ${popularHtml}
        </div>
      </section>

      <!-- ── Product CTA ───────────────────────────────────────────────────── -->
      <section class="blog-product-cta" aria-label="Product introduction">
        <h3>Turn ideas into focused action.</h3>
        <p>Read less about productivity. Start practicing it with FlowPomodoro's distraction-free timer.</p>
        <a href="/app/index.html" class="btn-primary"><i class="fas fa-play" aria-hidden="true"></i> Start Focusing</a>
      </section>

      <!-- ── Newsletter Section ────────────────────────────────────────────── -->
      <section class="blog-newsletter-section" aria-label="Newsletter">
        <h3>Get better at focusing.</h3>
        <p>Practical productivity ideas delivered occasionally. No spam.</p>
        <form class="blog-newsletter-form" onsubmit="handleNewsletterSubmit(event)">
          <input type="email" placeholder="Enter your email" required aria-label="Email address">
          <button type="submit" class="btn-primary">Subscribe</button>
        </form>
      </section>

    </div><!-- .container -->

  </main>

  <!-- ── Mobile Bottom Navigation Bar (Matching Mockup Reference) ──────────── -->
  <nav class="mobile-bottom-bar" aria-label="Mobile application navigation">
    <a href="/" class="bottom-bar-item">
      <i class="fas fa-house"></i>
      <span>Home</span>
    </a>
    <a href="/app/index.html" class="bottom-bar-item">
      <i class="fas fa-stopwatch"></i>
      <span>Timer</span>
    </a>
    <a href="/app/index.html#tasks" class="bottom-bar-item">
      <i class="fas fa-list-check"></i>
      <span>Tasks</span>
    </a>
    <a href="/app/index.html#stats" class="bottom-bar-item">
      <i class="fas fa-chart-simple"></i>
      <span>Stats</span>
    </a>
    <a href="/blog/${lang}/" class="bottom-bar-item active">
      <i class="fas fa-newspaper"></i>
      <span>Blog</span>
    </a>
  </nav>

  <!-- ── Footer ────────────────────────────────────────────────────────────── -->
  <footer class="lp-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <a href="/" class="logo">
            <div class="logo-dot"><i class="fas fa-stopwatch"></i></div>
            FlowPomodoro
          </a>
          <p>A beautiful Pomodoro timer to help you focus deeply, beat procrastination, and build better habits.</p>
        </div>
        <div class="footer-col">
          <div class="fc-title">Product</div>
          <ul>
            <li><a href="/app/index.html">Timer</a></li>
            <li><a href="/#features">Features</a></li>
            <li><a href="/pages/pricing.html">Pricing</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <div class="fc-title">Resources</div>
          <ul>
            <li><a href="/blog/${lang}/">Blog</a></li>
            <li><a href="/pages/about.html">About</a></li>
            <li><a href="/pages/download.html">Download</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <div class="fc-title">Legal</div>
          <ul>
            <li><a href="/pages/privacy.html">Privacy</a></li>
            <li><a href="/pages/terms.html">Terms</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <div>© 2026 FlowPomodoro. All rights reserved.</div>
        <div class="fb-links">
          <a href="/pages/privacy.html">Privacy</a>
          <a href="/pages/terms.html">Terms</a>
          <a href="/blog/${lang}/">Blog</a>
        </div>
      </div>
    </div>
  </footer>

  <!-- ── Interactive Client Scripts ────────────────────────────────────────── -->
  <script>
    // Theme Management
    const themeBtn = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('flow_theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    if (themeBtn) {
      themeBtn.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
      themeBtn.addEventListener('click', () => {
        const isDark = html.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('flow_theme', newTheme);
        themeBtn.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
      });
    }

    // Mobile Navigation Drawer
    const hamburger = document.getElementById('nav-hamburger');
    const drawer = document.getElementById('nav-drawer');
    if (hamburger && drawer) {
      hamburger.addEventListener('click', () => {
        const isOpen = drawer.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', isOpen);
      });
    }

    // Language Dropdown
    const langBtn = document.getElementById('lang-menu-btn');
    const langDropdown = document.getElementById('lang-dropdown');
    if (langBtn && langDropdown) {
      langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        langDropdown.style.display = langDropdown.style.display === 'flex' ? 'none' : 'flex';
      });
      document.addEventListener('click', () => {
        langDropdown.style.display = 'none';
      });
    }

    // Real-Time Search Filtering
    const searchInput = document.getElementById('blog-search-input');
    const searchBtn = document.getElementById('blog-search-btn');
    const articleCards = document.querySelectorAll('.articles-grid .article-card');
    const emptyState = document.getElementById('search-empty-state');
    const countLabel = document.getElementById('article-count-label');

    function performSearch() {
      const query = (searchInput.value || '').trim().toLowerCase();
      let visibleCount = 0;

      articleCards.forEach(card => {
        const title = card.getAttribute('data-title') || '';
        const excerpt = card.querySelector('.article-card-excerpt')?.textContent.toLowerCase() || '';
        const category = card.getAttribute('data-category') || '';
        
        if (!query || title.includes(query) || excerpt.includes(query) || category.includes(query)) {
          card.style.display = 'flex';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (emptyState) {
        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
      }
      if (countLabel) {
        countLabel.textContent = visibleCount + ' articles';
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', performSearch);
    }
    if (searchBtn) {
      searchBtn.addEventListener('click', performSearch);
    }

    // Bookmark Persistence
    function initBookmarks() {
      const bookmarks = JSON.parse(localStorage.getItem('flow_bookmarks') || '[]');
      document.querySelectorAll('.btn-bookmark').forEach(btn => {
        const slug = btn.getAttribute('data-slug');
        const isSaved = bookmarks.includes(slug);
        btn.classList.toggle('bookmarked', isSaved);
        btn.innerHTML = isSaved ? '<i class="fas fa-bookmark"></i>' : '<i class="far fa-bookmark"></i>';
        
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          let bms = JSON.parse(localStorage.getItem('flow_bookmarks') || '[]');
          if (bms.includes(slug)) {
            bms = bms.filter(s => s !== slug);
          } else {
            bms.push(slug);
          }
          localStorage.setItem('flow_bookmarks', JSON.stringify(bms));
          initBookmarks();
        });
      });
    }
    initBookmarks();

    function handleNewsletterSubmit(e) {
      e.preventDefault();
      const input = e.target.querySelector('input');
      if (input) {
        input.value = '';
        alert('Thank you for subscribing to FlowPomodoro Journal!');
      }
    }
  </script>
</body>
</html>`;
}

// Generate Blog Home & Category Pages for each language
LANGUAGES.forEach(lang => {
  // Main index.html
  const homeHtml = generateBlogHome(lang, 'all');
  fs.writeFileSync(path.join(BLOG_DIR, lang, 'index.html'), homeHtml, 'utf-8');

  // Category Pages
  CATEGORIES.filter(c => c.id !== 'all').forEach(cat => {
    const catHtml = generateBlogHome(lang, cat.id);
    fs.writeFileSync(path.join(BLOG_DIR, lang, `${cat.slug}.html`), catHtml, 'utf-8');
  });
});

console.log('--- Step 4: Updating Root Blog Router (/blog/index.html) ---');

const rootBlogRouterHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ESNYBTJ98S"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-ESNYBTJ98S');
  </script>
  <meta charset="UTF-8">
  <title>Redirecting to FlowPomodoro Blog...</title>
  <script>
    const currentLang = localStorage.getItem('fp_lang') || 'en';
    window.location.replace('/blog/' + currentLang + '/');
  </script>
  <link rel="alternate" href="https://flowpomodoro.xyz/blog/en/index.html" hreflang="en" />
  <link rel="alternate" href="https://flowpomodoro.xyz/blog/hi/index.html" hreflang="hi" />
  <link rel="alternate" href="https://flowpomodoro.xyz/blog/ne/index.html" hreflang="ne" />
  <link rel="alternate" href="https://flowpomodoro.xyz/blog/es/index.html" hreflang="es" />
  <link rel="alternate" href="https://flowpomodoro.xyz/blog/vi/index.html" hreflang="vi" />
  <link rel="alternate" href="https://flowpomodoro.xyz/blog/ru/index.html" hreflang="ru" />
  <link rel="alternate" href="https://flowpomodoro.xyz/blog/en/index.html" hreflang="x-default" />
</head>
<body>
  Redirecting...
</body>
</html>`;

fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), rootBlogRouterHtml, 'utf-8');

console.log('=== FlowPomodoro Blog Rebuild Complete! ===');
