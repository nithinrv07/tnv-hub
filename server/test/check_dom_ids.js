const fs = require('fs');
const appJs = fs.readFileSync('public/app.js', 'utf8');
const indexHtml = fs.readFileSync('public/index.html', 'utf8');

const idRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const missingIds = [];
const checked = new Set();

while ((match = idRegex.exec(appJs)) !== null) {
  const id = match[1];
  if (checked.has(id)) continue;
  checked.add(id);

  if (!indexHtml.includes(`id="${id}"`)) {
    missingIds.push(id);
  }
}

console.log(`Total unique IDs checked: ${checked.size}`);
if (missingIds.length > 0) {
  console.error('Missing IDs in index.html:', missingIds);
  process.exit(1);
} else {
  console.log('PASS: All IDs exist in index.html!');
}
