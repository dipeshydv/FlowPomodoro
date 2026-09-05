const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BLOG_DIR = path.join(__dirname, '../blog');
const TEMPLATE_PATH = path.join(BLOG_DIR, 'templates/article-template.html');
const OUTPUT_DIR = path.join(__dirname, '../blog');

const LANGUAGES = ['en', 'hi', 'ne', 'es', 'vi', 'ru'];

// Load template
const templateHtml = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

// Ensure output directories exist
LANGUAGES.forEach(lang => {
  fs.mkdirSync(path.join(OUTPUT_DIR, lang), { recursive: true });
});

let report = {
  totalDiscovered: 0,
  totalMigrated: 0,
  totalSkipped: 0,
  totalFailed: 0,
  warnings: []
};

// Reusable CTA HTML
const FOCUS_CTA_HTML = `
<!-- FlowPomodoro Focus CTA -->
<div class="focus-cta">
  <h3>Ready to Focus?</h3>
  <p>Choose your interval and start a focused session right now.</p>
  <div class="timer-preview">
    <span class="control">−</span>
    <span>25:00</span>
    <span class="control">+</span>
  </div>
  <a href="/app/index.html" class="btn-focus">Start Focus Session &rarr;</a>
</div>
`;

function generateSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function processArticle(filePath, lang, isDryRun) {
  try {
    const html = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(html);

    // Extract metadata
    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content') || '';
    const canonical = $('link[rel="canonical"]').attr('href') || '';
    
    // OG & Twitter
    const ogTags = [];
    $('meta[property^="og:"]').each((_, el) => {
      ogTags.push($.html(el));
    });
    const twitterTags = [];
    $('meta[name^="twitter:"]').each((_, el) => {
      twitterTags.push($.html(el));
    });
    const ogImage = $('meta[property="og:image"]').attr('content') || '';

    // Hreflang
    const hreflangTags = [];
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      hreflangTags.push($.html(el));
    });

    // Structured Data
    const schemaTags = [];
    let hasFAQ = false;
    $('script[type="application/ld+json"]').each((_, el) => {
      const content = $(el).html();
      schemaTags.push($.html(el));
      if (content.includes('FAQPage')) {
        hasFAQ = true;
      }
    });

    // Article Content
    const h1Count = $('h1').length;
    if (h1Count === 0) report.warnings.push(`Missing H1 in ${filePath}`);
    if (h1Count > 1) report.warnings.push(`Multiple H1s in ${filePath}`);
    
    const h1 = $('h1').first().text().trim();
    
    // Extract metadata from header
    let readingTime = '';
    let publishedDate = '';
    let author = 'FlowPomodoro Team';
    let category = '';

    $('.article-meta span').each((_, el) => {
      const text = $(el).text().trim();
      if (text.includes('read')) readingTime = text;
      else if (text.match(/20\d\d/)) publishedDate = text;
      else if (text.includes('FlowPomodoro')) author = text;
      else if ($(el).hasClass('article-tag')) category = text;
    });

    // Fallbacks
    if (!readingTime) readingTime = '10 min read';
    if (!publishedDate) publishedDate = 'June 2026';
    if (!category) category = 'Productivity';

    // Extract body
    const $body = $('.article-body').length ? $('.article-body') : $('article');
    if (!$body.length) {
      report.totalFailed++;
      report.warnings.push(`FAILED: ${filePath} - Missing article body`);
      return;
    }

    const oldContentLength = $body.html().length;

    // Process TOC and H2s
    const toc = [];
    let h2Count = 1;
    const seenIds = new Set();
    $body.find('h2').each((_, el) => {
      const $el = $(el);
      let id = $el.attr('id');
      if (!id) {
        id = generateSlug($el.text());
      }
      
      if (!id) {
        id = 'section';
      }
      
      if (seenIds.has(id)) {
        let counter = 1;
        let newId = `${id}-${counter}`;
        while (seenIds.has(newId)) {
          counter++;
          newId = `${id}-${counter}`;
        }
        id = newId;
      }
      seenIds.add(id);
      $el.attr('id', id);

      toc.push({
        id,
        number: h2Count.toString().padStart(2, '0'),
        title: $el.text().trim()
      });
      h2Count++;
    });

    // Drop cap
    const $firstP = $body.find('p').first();
    if ($firstP.length) {
      $firstP.addClass('drop-cap');
    }

    // Insert CTA
    const existingCta = $body.html().includes('Ready to Try Your First Pomodoro') || $body.html().includes('focus-cta');
    if (existingCta) {
      report.warnings.push(`CTA already existed in ${filePath}`);
    } else {
      // Find a good place to insert CTA (before conclusion or FAQ)
      const $faqHeading = $body.find('h2').filter((_, el) => $(el).text().toLowerCase().includes('faq') || $(el).text().toLowerCase().includes('frequently'));
      if ($faqHeading.length) {
        $faqHeading.before(FOCUS_CTA_HTML);
      } else {
        $body.append(FOCUS_CTA_HTML);
      }
      report.warnings.push(`CTA inserted in ${filePath}`);
    }

    const newContentLength = $body.html().length;
    if (newContentLength < (oldContentLength * 0.7)) {
      report.warnings.push(`WARNING: possible content loss in ${filePath} (Old: ${oldContentLength}, New: ${newContentLength})`);
    }

    // Generate output from template
    let outputHtml = templateHtml;
    
    // Clean up unparsed Handlebars blocks
    outputHtml = outputHtml.replace(/{{#if article\.hasFAQ}}[\s\S]*?{{\/if}}/g, '');
    
    if (ogImage) {
      outputHtml = outputHtml.replace(/{{#if article\.heroImage}}/g, '');
      outputHtml = outputHtml.replace(/{{\/if}}/g, '');
    } else {
      outputHtml = outputHtml.replace(/{{#if article\.heroImage}}[\s\S]*?{{\/if}}/g, '');
    }
    
    // Simple templating engine
    const data = {
      'article.title': title,
      'article.description': description,
      'article.language': lang,
      'article.slug': path.basename(filePath, '.html'),
      'article.heroImage': ogImage,
      'article.heroAlt': h1,
      'article.publishedDate': publishedDate,
      'article.modifiedDate': publishedDate,
      'article.category': category,
      'article.readingTime': readingTime,
      'article.author': author
    };

    // Replace basic strings
    for (const [key, value] of Object.entries(data)) {
      outputHtml = outputHtml.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Since our template used handlebars logic, we'll replace the whole block dynamically with cheerio
    const $output = cheerio.load(outputHtml);
    
    // Inject Language
    $output('html').attr('lang', lang);

    // Inject metadata cleanly
    $output('title').text(title);
    $output('meta[name="description"]').attr('content', description);
    $output('link[rel="canonical"]').attr('href', canonical);
    
    // Replace OG/Twitter placeholders
    $output('meta[property^="og:"]').remove();
    $output('meta[name^="twitter:"]').remove();
    $output('link[rel="alternate"][hreflang]').remove();
    $output('script[type="application/ld+json"]').remove();
    
    // We will prepend the exact original tags to head
    const headInjection = [
      ...ogTags,
      ...twitterTags,
      ...hreflangTags,
      ...schemaTags
    ].join('\n  ');
    $output('head').append('\n  ' + headInjection + '\n');

    // Replace Article Header
    $output('h1.article-h1').text(h1);
    
    // Inject TOC
    const $tocList = $output('.toc-list');
    $tocList.empty();
    toc.forEach(item => {
      $tocList.append(`<li><a href="#${item.id}"><span class="toc-number">${item.number}</span> <span class="toc-text">${item.title}</span></a></li>`);
    });

    // Inject Content
    $output('.article-body').html($body.html());

    // Write file
    const outPath = path.join(OUTPUT_DIR, lang, path.basename(filePath));
    fs.writeFileSync(outPath, $output.html(), 'utf-8');
    
    report.totalMigrated++;

  } catch (err) {
    report.totalFailed++;
    report.warnings.push(`FAILED: ${filePath} - ${err.message}`);
  }
}

function runMigration(dryRunMode = true) {
  LANGUAGES.forEach(lang => {
    const langDir = path.join(BLOG_DIR, lang);
    if (!fs.existsSync(langDir)) return;

    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.html'));
    
    // Dry run limits
    let filesToProcess = files;
    if (dryRunMode) {
      if (lang === 'en') {
        filesToProcess = files.filter(f => f === 'what-is-the-pomodoro-method.html');
      } else {
        filesToProcess = [files.find(f => f !== 'index.html')]; // Just grab one
      }
    }

    filesToProcess.forEach(file => {
      if (file === 'index.html') {
        report.totalSkipped++;
        return;
      }
      report.totalDiscovered++;
      processArticle(path.join(langDir, file), lang, dryRunMode);
    });
  });

  // Write report
  fs.writeFileSync(path.join(__dirname, '../migration-output/migration-report.json'), JSON.stringify(report, null, 2));
  console.log('Migration report generated.');
  console.log(report);
}

// Run in production mode
runMigration(false);
