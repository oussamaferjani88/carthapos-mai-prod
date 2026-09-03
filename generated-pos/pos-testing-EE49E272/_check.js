const fs = require('fs');
const content = fs.readFileSync('src/pages/Customers.jsx', 'utf8');
const lines = content.split('\n');

// Check line 603 (Fidélité table header)
console.log('=== Line 603 (Fidelite) ===');
console.log('Raw JSON:', JSON.stringify(lines[602]));

// Check line 40
console.log('\n=== Line 40 ===');
console.log('Raw JSON:', JSON.stringify(lines[39]));

// Check line 584 (Réinitialiser)
console.log('\n=== Line 584 (Reinitialiser) ===');
console.log('Raw JSON:', JSON.stringify(lines[583]));

// Count actual UTF-8 accented chars
let utf8Accents = 0;
for (const ch of content) {
  const code = ch.charCodeAt(0);
  if (code > 127) utf8Accents++;
}
console.log('\nTotal non-ASCII chars in file:', utf8Accents);

// Count lines with backslash-u sequences  
let escapeCount = 0;
let linesWithEscapes = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('\\u00') || lines[i].includes('\\u20') || lines[i].includes('\\u00b') || lines[i].includes('\\u00d')) {
    escapeCount++;
    if (linesWithEscapes.length < 5) linesWithEscapes.push(i + 1);
  }
}
console.log('Lines with \\u escape sequences:', escapeCount);
console.log('Sample lines:', linesWithEscapes);
