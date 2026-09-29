const fs = require('fs');

// Load babel
const Babel = require('./babel.min.js');

const code = fs.readFileSync('frontend/src/components/FormsList.jsx', 'utf8');

try {
  const result = Babel.transform(code, {
    presets: ['react'],
    filename: 'FormsList.jsx'
  });
  console.log('SUCCESS: FormsList.jsx compiled without any Babel errors!');
} catch (err) {
  console.error('BABEL COMPILE ERROR:');
  console.error(err.message);
}
