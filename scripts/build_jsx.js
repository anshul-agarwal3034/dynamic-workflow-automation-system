const fs = require('fs');
const path = require('path');

let babel;
try {
  babel = require('@babel/core');
} catch (e) {
  babel = require(path.join(__dirname, '..', 'scratch', 'babel.min.js'));
}

// Ensure dist exists
const distDir = path.resolve(__dirname, '../frontend/public/dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Explicitly copy i18n.js to dist
const i18nSrc = path.resolve(__dirname, '../frontend/src/utils/i18n.js');
const i18nDist = path.join(distDir, 'i18n.js');

if (fs.existsSync(i18nSrc)) {
  fs.copyFileSync(i18nSrc, i18nDist);
  console.log('[build_jsx] Successfully copied universal i18n.js to frontend/public/dist/i18n.js');
}

const files = [
  'components/SharedComponents.jsx',
  'components/SimpleRouter.jsx',
  'api/formsApi.js',
  'components/Signup.jsx',
  'components/SignupVerify.jsx',
  'components/Signin.jsx',
  'components/ForgotPassword.jsx',
  'components/ForgotVerify.jsx',
  'components/ForgotReset.jsx',
  'components/EmbedModal.jsx',
  'components/Home.jsx',
  'components/FormsList.jsx',
  'components/CreateFormPage.jsx',
  'components/FormBuilder.jsx',
  'components/FormDetail.jsx',
  'components/PublicFormView.jsx',
  'components/SubmissionsView.jsx',
  'components/AnalyticsDashboard.jsx',
  'components/SettingsView.jsx',
  'components/FormPilotXAuth.jsx'
];

const srcDir = path.join(__dirname, '..', 'frontend', 'src');
const outDir = path.join(__dirname, '..', 'frontend', 'public', 'dist');

console.log('Compiling components with isolated module scopes...');

files.forEach((fileRel) => {
  const srcPath = path.join(srcDir, fileRel);
  const baseName = path.basename(fileRel).replace('.jsx', '.js');
  const destPath = path.join(outDir, baseName);

  if (fs.existsSync(srcPath)) {
    let code = fs.readFileSync(srcPath, 'utf8');

    // Collect top-level declared names to export to window
    const exportNames = new Set();

    // Check export default
    const defaultMatch = code.match(/export\s+default\s+([A-Za-z0-9_$]+)/);
    if (defaultMatch) {
      exportNames.add(defaultMatch[1]);
    }

    // Check named exports: export { A, B }
    const namedMatches = code.matchAll(/export\s*\{\s*([^}]+)\s*\}/g);
    for (const match of namedMatches) {
      match[1].split(',').forEach(item => {
        const clean = item.trim().split(/\s+as\s+/)[0].trim();
        if (clean) exportNames.add(clean);
      });
    }

    // Check inline exports: export const X / export function X
    const inlineMatches = code.matchAll(/export\s+(const|let|var|function|class)\s+([A-Za-z0-9_$]+)/g);
    for (const match of inlineMatches) {
      exportNames.add(match[2]);
    }

    // Check top-level declared variables and functions
    const topLevelMatches = code.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z0-9_$]+)/gm);
    for (const match of topLevelMatches) {
      exportNames.add(match[1]);
    }

    // Strip export keywords
    code = code.replace(/export\s+default\s+([A-Za-z0-9_$]+)\s*;?/g, '');
    code = code.replace(/export\s*\{\s*[^}]+\s*\}\s*;?/g, '');
    code = code.replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ');
    code = code.replace(/^import\s+.*?;?\s*$/gm, '');

    // Transpile JSX via Babel
    const transformFn = babel.transformSync || babel.transform;
    const reactPreset = babel.transformSync
      ? ['@babel/preset-react', { runtime: 'classic' }]
      : ['react', { runtime: 'classic' }];
    const transformed = transformFn(code, {
      presets: [reactPreset],
      filename: srcPath
    });

    // Build window attachment statements
    const exportsCode = Array.from(exportNames)
      .map(name => `  if (typeof ${name} !== 'undefined') window.${name} = ${name};`)
      .join('\n');

    // Wrap in an IIFE to eliminate lexical collision across scripts
    const finalCode = `(function() {\n${transformed.code}\n${exportsCode}\n})();\n`;

    fs.writeFileSync(destPath, finalCode, 'utf8');
    console.log(`✓ Compiled safely: ${baseName}`);
  }
});

console.log('Build completed. All scope collisions eliminated.');
