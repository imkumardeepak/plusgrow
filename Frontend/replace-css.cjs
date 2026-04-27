const fs = require('fs');
const path = require('path');

const replacements = [
  { key: 'theme-shell', val: 'bg-base-200 min-h-screen flex' },
  { key: 'theme-panel', val: 'card bg-base-100 shadow-xl' },
  { key: 'card-base', val: 'card bg-base-100 shadow-xl border border-base-300' },
  { key: 'theme-card', val: 'card bg-base-100 shadow-sm border border-base-300' },
  { key: 'theme-hero', val: 'hero bg-base-200' },
  { key: 'page-toolbar', val: 'navbar bg-base-100 shadow-sm rounded-box mb-4' },
  { key: 'page-table-shell', val: 'card bg-base-100 shadow-sm overflow-hidden' },
  { key: 'page-title', val: 'text-2xl font-bold' },
  { key: 'page-subtitle', val: 'text-sm opacity-70' },
  { key: 'field-label', val: 'label-text font-medium inline-block mb-1' },
  { key: 'theme-textarea', val: 'textarea textarea-bordered w-full' },
  { key: 'theme-pill', val: 'badge badge-neutral' },
  { key: 'glassmorphism', val: 'glass' },
  { key: 'glass-dark', val: 'glass bg-neutral' },
  { key: 'btn-primary-gradient', val: 'btn btn-primary' },
  { key: 'btn-success-gradient', val: 'btn btn-success' },
  { key: 'text-gradient-ocean', val: 'text-primary font-bold' }
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const { key, val } of replacements) {
      if (content.includes(key)) {
        // use regex to replace whole words or exact matches
        const regex = new RegExp(key, 'g');
        content = content.replace(regex, val);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${filePath}`);
    }
  }
});
