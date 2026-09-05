const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const langs = ['en', 'hi', 'ne', 'es', 'vi', 'ru'];
const blogDir = path.join(__dirname, '../blog');

langs.forEach(lang => {
  const dir = path.join(blogDir, lang);
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  files.forEach(f => {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const $ = cheerio.load(content);
    let visible = $('.author-details').text() || $('.featured-meta-date').text() || '';
    let published = '';
    let modified = '';
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (data['@type'] === 'Article') {
          published = data.datePublished;
          modified = data.dateModified;
        }
      } catch(e) {}
    });
    if (visible || published) {
      if (lang === 'en' || f === 'what-is-the-pomodoro-method.html') {
        console.log(`${lang}/${f} => visible: "${visible.trim()}" | pub: "${published}" | mod: "${modified}"`);
      }
    }
  });
});
