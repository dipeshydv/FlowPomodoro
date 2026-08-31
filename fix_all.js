const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BASE_URL = 'https://flowpomodoro.xyz';
const ROOT_DIR = __dirname;

function getAllHtmlFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'backups' && file !== 'migration-output') {
                arrayOfFiles = getAllHtmlFiles(dirPath + "/" + file, arrayOfFiles);
            }
        } else {
            if (file.endsWith('.html') && !file.includes('template')) {
                arrayOfFiles.push(path.join(dirPath, file));
            }
        }
    });

    return arrayOfFiles;
}

function normalizeUrlPath(filePath) {
    let relative = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
    if (relative === 'index.html') return '/';
    if (relative.endsWith('/index.html')) {
        return '/' + relative.substring(0, relative.length - 10);
    }
    return '/' + relative;
}

const htmlFiles = getAllHtmlFiles(ROOT_DIR);
const sitemapUrls = [];

htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const $ = cheerio.load(content, { decodeEntities: false });
    let isModified = false;

    const urlPath = normalizeUrlPath(file);
    const fullUrl = BASE_URL + (urlPath === '/' ? '/' : urlPath);
    sitemapUrls.push(fullUrl);

    // Fix canonical URL
    const canonical = $('link[rel="canonical"]');
    if (canonical.length > 0) {
        if (canonical.attr('href') !== fullUrl) {
            canonical.attr('href', fullUrl);
            isModified = true;
        }
    } else {
        $('head').append(`\n  <link rel="canonical" href="${fullUrl}">`);
        isModified = true;
    }

    // Fix og:url
    const ogUrl = $('meta[property="og:url"]');
    if (ogUrl.length > 0) {
        if (ogUrl.attr('content') !== fullUrl) {
            ogUrl.attr('content', fullUrl);
            isModified = true;
        }
    }

    // Fix http to https and remove www for flowpomodoro.xyz
    $('*[href]').each((i, el) => {
        let href = $(el).attr('href');
        if (href) {
            let original = href;
            href = href.replace('http://flowpomodoro.xyz', 'https://flowpomodoro.xyz');
            href = href.replace('http://www.flowpomodoro.xyz', 'https://flowpomodoro.xyz');
            href = href.replace('https://flowpomodoro.xyz', 'https://flowpomodoro.xyz');

            // Resolve relative paths to absolute root paths (e.g., ../app/index.html -> /app/index.html)
            if (href.startsWith('../') || href.startsWith('./') || (!href.startsWith('/') && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:'))) {
                let fileDir = path.dirname(path.relative(ROOT_DIR, file)).replace(/\\/g, '/');
                if (fileDir === '.') fileDir = '';
                else fileDir = '/' + fileDir;
                
                try {
                    let resolvedUrl = new URL(href, 'http://fake.com' + fileDir + '/');
                    href = resolvedUrl.pathname + resolvedUrl.search + resolvedUrl.hash;
                } catch(e) {}
            }

            if (href !== original) {
                $(el).attr('href', href);
                isModified = true;
            }
        }
    });

    $('*[src]').each((i, el) => {
        let src = $(el).attr('src');
        if (src) {
            let original = src;
            src = src.replace('http://flowpomodoro.xyz', 'https://flowpomodoro.xyz');
            src = src.replace('http://www.flowpomodoro.xyz', 'https://flowpomodoro.xyz');
            src = src.replace('https://flowpomodoro.xyz', 'https://flowpomodoro.xyz');

            if (src.startsWith('../') || src.startsWith('./') || (!src.startsWith('/') && !src.startsWith('http') && !src.startsWith('data:'))) {
                let fileDir = path.dirname(path.relative(ROOT_DIR, file)).replace(/\\/g, '/');
                if (fileDir === '.') fileDir = '';
                else fileDir = '/' + fileDir;
                
                try {
                    let resolvedUrl = new URL(src, 'http://fake.com' + fileDir + '/');
                    src = resolvedUrl.pathname + resolvedUrl.search + resolvedUrl.hash;
                } catch(e) {}
            }

            if (src !== original) {
                $(el).attr('src', src);
                isModified = true;
            }
        }
    });

    // Add loading="lazy" to images not in header/hero
    $('img').each((i, el) => {
        if (!$(el).attr('loading')) {
            $(el).attr('loading', 'lazy');
            isModified = true;
        }
    });

    if (isModified) {
        fs.writeFileSync(file, $.html());
        console.log('Fixed', file);
    }
});

// Generate Sitemap
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(url => `  <url>\n    <loc>${url}</loc>\n  </url>`).join('\n')}
</urlset>`;

fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), sitemapXml);
console.log('Generated sitemap.xml');

// Update robots.txt
const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://flowpomodoro.xyz/sitemap.xml`;
fs.writeFileSync(path.join(ROOT_DIR, 'robots.txt'), robotsTxt);
console.log('Updated robots.txt');

// Update _redirects
const redirectsContent = `# Netlify configurations
/index.html / 200
/landing /landing.html 200

# Blog Clean Category & Subdirectory Rewrites
/blog/productivity /blog/en/productivity.html 200
/blog/focus /blog/en/focus.html 200
/blog/study /blog/en/study.html 200
/blog/time-management /blog/en/time-management.html 200
/blog/habits /blog/en/habits.html 200
/blog/deep-work /blog/en/deep-work.html 200
`;
fs.writeFileSync(path.join(ROOT_DIR, '_redirects'), redirectsContent);
if (fs.existsSync(path.join(ROOT_DIR, 'public'))) {
    fs.writeFileSync(path.join(ROOT_DIR, 'public', '_redirects'), redirectsContent);
}
console.log('Updated _redirects');
