#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building application...');

try {
  // Nettoyer le dossier dist
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true });
  }

  // Compiler TypeScript
  console.log('📦 Compiling TypeScript...');
  execSync('npx tsc --project tsconfig.build.json', { stdio: 'inherit' });

  // Copier les fichiers renderer (HTML, CSS, JS compilé)
  console.log('📋 Copying renderer files...');
  const rendererSrc = 'src/renderer';
  const rendererDist = 'dist/renderer';
  
  if (!fs.existsSync(rendererDist)) {
    fs.mkdirSync(rendererDist, { recursive: true });
  }

  // Copier les fichiers statiques
  const staticFiles = ['index.html', 'tw.css', 'tailwind.css', 'renderer-complete.js'];
  staticFiles.forEach(file => {
    const srcPath = path.join(rendererSrc, file);
    const distPath = path.join(rendererDist, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, distPath);
    }
  });

  // Créer le fichier renderer.js principal
  const rendererMain = `
// Renderer principal compilé
import './classes/AppRenderer';
`;
  fs.writeFileSync('dist/renderer/renderer.js', rendererMain);

  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
