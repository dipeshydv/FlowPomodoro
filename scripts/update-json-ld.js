const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const htmlPath = path.join(__dirname, '../blog/en/what-is-the-pomodoro-method.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
const $ = cheerio.load(htmlContent);

// We need to parse and replace the structured data script tags
$('script[type="application/ld+json"]').each((index, el) => {
  try {
    const jsonStr = $(el).html();
    const data = JSON.parse(jsonStr);

    if (data['@type'] === 'Article') {
      data.headline = 'What Is the Pomodoro Method? The Complete Guide to 25-Minute Focus Sessions';
      data.description = 'Master the Pomodoro Method: learn what it means, how the 25-minute focus technique works, and how to eliminate procrastination to boost your productivity.';
      data.url = 'https://flowpomodoro.xyz/blog/en/what-is-the-pomodoro-method.html';
      data.mainEntityOfPage['@id'] = 'https://flowpomodoro.xyz/blog/en/what-is-the-pomodoro-method.html';
      data.dateModified = '2026-09-05T00:00:00Z';
      $(el).html(JSON.stringify(data, null, 2));
    }
    
    if (data['@type'] === 'BreadcrumbList') {
      data.itemListElement.forEach(item => {
        if (item.position === 3) {
          item.name = 'What Is the Pomodoro Method?';
          item.item = 'https://flowpomodoro.xyz/blog/en/what-is-the-pomodoro-method.html';
        }
      });
      $(el).html(JSON.stringify(data, null, 2));
    }
  } catch(e) {
    console.error('Error parsing JSON-LD:', e);
  }
});

fs.writeFileSync(htmlPath, $.html(), 'utf-8');
console.log('JSON-LD updated successfully.');
