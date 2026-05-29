/**
 * Generate Teal + DMS brand CSS variables from variables.json and patch figma-variables.css
 * Usage: node src/theme/generate-variables.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, 'variables.json');
const cssPath = path.join(__dirname, 'figma-variables.css');

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function sanitizeVarName(name) {
  return String(name)
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const SHADE_ORDER = [
  '25',
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
];

// Build --figma-teal-* from Colors.Teal (ordered)
const tealVars = [];
if (data.Colors?.Teal) {
  for (const key of SHADE_ORDER) {
    const item = data.Colors.Teal[key];
    if (item?.$value && item.$type === 'color') {
      tealVars.push(`  --figma-teal-${key}: ${item.$value};`);
    }
  }
}

// Build --figma-dms-brand-* from Brands.DMS (ordered)
const dmsBrandVars = [];
if (data.Brands?.DMS) {
  for (const key of SHADE_ORDER) {
    const item = data.Brands.DMS[key];
    if (item?.$value && item.$type === 'color') {
      dmsBrandVars.push(`  --figma-dms-brand-${key}: ${item.$value};`);
    }
  }
}

// Read existing CSS and replace Teal block and DMS brand block
let css = fs.readFileSync(cssPath, 'utf8');

const tealBlock = tealVars.join('\n');
const dmsBlock = dmsBrandVars.join('\n');

// Replace --figma-teal-* block (any order of 12 lines)
const tealRegex =
  /  --figma-teal-\d+: #[^\n]+\n(  --figma-teal-\d+: #[^\n]+\n){10}  --figma-teal-\d+: #[^\n]+/;
if (tealRegex.test(css)) {
  css = css.replace(tealRegex, tealBlock);
}

// Replace DMS brand block
const dmsRegex = /  \/\* DMS Brand \(Teal\) \*\/\n(?:  --figma-dms-brand-[^\n]+\n)+/;
css = css.replace(dmsRegex, `  /* DMS Brand (Teal) */\n${dmsBlock}\n\n  `);

fs.writeFileSync(cssPath, css, 'utf8');

console.log('✅ Generated figma-variables.css (Teal + DMS brand from variables.json)');
console.log(`📁 ${cssPath}`);
console.log(`   Teal: ${tealVars.length} variables, DMS brand: ${dmsBrandVars.length} variables`);
