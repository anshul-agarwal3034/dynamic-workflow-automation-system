const fs = require('fs');
const path = require('path');
const Babel = require('./babel.min.js');

const dir = 'frontend/src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

let allGood = true;
for (const file of files) {
  const filePath = path.join(dir, file);
  const code = fs.readFileSync(filePath, 'utf8');
  try {
    Babel.transform(code, {
      presets: ['react'],
      filename: file
    });
    console.log(`✓ ${file}: OK`);
  } catch (err) {
    console.error(`✗ ${file}: ERROR - ${err.message}`);
    allGood = false;
  }
}

if (allGood) {
  console.log('\nAll JSX files compiled cleanly!');
} else {
  process.exit(1);
}
