const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

const EXCLUDED_DIRS = ['node_modules', '.git', 'scripts', 'backups', 'migration-output'];
const TARGET_EXTS = ['.html', '.xml', '.txt', '.js'];

let modifiedFiles = 0;

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
            if (TARGET_EXTS.includes(ext) && file !== 'package-lock.json') {
                processFile(fullPath);
            }
        }
    });
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Normalize to non-www first
    content = content.replace(/https:\/\/www\.flowpomodoro\.xyz/g, 'https://flowpomodoro.xyz');
    
    // Change all to www
    content = content.replace(/https:\/\/flowpomodoro\.xyz/g, 'https://www.flowpomodoro.xyz');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${path.relative(ROOT_DIR, filePath)}`);
        modifiedFiles++;
    }
}

console.log('Enforcing www canonical domain across codebase...');
processDirectory(ROOT_DIR);
console.log(`\nSuccessfully updated ${modifiedFiles} files to use www.flowpomodoro.xyz.`);
