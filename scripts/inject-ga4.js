const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT_DIR = path.join(__dirname, '..');
const GA4_SNIPPET = `
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ESNYBTJ98S"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-ESNYBTJ98S');
  </script>`;
const MEASUREMENT_ID = 'G-ESNYBTJ98S';

const EXCLUDED_DIRS = ['node_modules', '.git', 'scripts', 'backups', 'migration-output', 'assets'];
const EXCLUDED_FILES = ['google964a2dbe5a7854e3.html'];

let modifiedFiles = [];

function processDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!EXCLUDED_DIRS.includes(file)) {
                processDirectory(fullPath);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            if (ext === '.html' && !file.includes('template') && !EXCLUDED_FILES.includes(file)) {
                processFile(fullPath);
            }
        }
    });
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already contains GA4
    if (content.includes(MEASUREMENT_ID)) {
        return;
    }

    // Using string replacement to ensure we don't format/alter the entire document via Cheerio
    const headIndex = content.indexOf('<head>');
    if (headIndex !== -1) {
        const insertPosition = headIndex + '<head>'.length;
        const newContent = content.slice(0, insertPosition) + GA4_SNIPPET + content.slice(insertPosition);
        
        fs.writeFileSync(filePath, newContent, 'utf8');
        modifiedFiles.push(path.relative(ROOT_DIR, filePath));
    }
}

console.log('Injecting GA4 tags...');
processDirectory(ROOT_DIR);
console.log(`\nSuccessfully injected GA4 into ${modifiedFiles.length} files.`);
fs.writeFileSync(path.join(ROOT_DIR, 'ga4-report.txt'), modifiedFiles.join('\\n'), 'utf8');
