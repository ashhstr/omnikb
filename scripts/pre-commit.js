#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('🛡️  Running OmniKB Security & Quality Checks...\n');

// 0. Strict Secret & Private File Leak Check
console.log('0. Scanning for Private Files, Credentials & Leaked Secrets...');
const sensitivePatterns = [
  /\.env(\..+)?$/i,
  /\.(key|pem|p12|pfx|pkcs12|cer|crt)$/i,
  /id_rsa/i,
  /id_ed25519/i,
  /credentials\.json/i,
  /service-account.*\.json/i,
  /\.npmrc$/i,
  /\.pypirc$/i,
];

try {
  const stagedFiles = execSync('git diff --name-only --cached', { cwd: rootDir, encoding: 'utf8' })
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);

  const untrackedFiles = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf8' })
    .split('\n')
    .map(f => f.trim().slice(3))
    .filter(Boolean);

  const allCandidateFiles = Array.from(new Set([...stagedFiles, ...untrackedFiles]));

  for (const file of allCandidateFiles) {
    for (const pattern of sensitivePatterns) {
      if (pattern.test(file)) {
        console.error(`\n🚨 CRITICAL SECURITY ERROR: Private/Sensitive file detected: "${file}"`);
        console.error(`❌ Aborting! Never commit or push private credentials, keys, or .env files.`);
        process.exit(1);
      }
    }
  }
  console.log('   ✅ Zero sensitive files detected.');
} catch (err) {
  if (err.status === 1 && !err.stderr) {
    // Process exit handled
    process.exit(1);
  }
  // If not a git repo or no files, continue
}

try {
  console.log('1. Typechecking & Building...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

  console.log('2. Running Test Suite...');
  execSync('npm test', { cwd: rootDir, stdio: 'inherit' });

  console.log('3. Checking Graph Integrity...');
  execSync('node scripts/index-workspace.js', { cwd: rootDir, stdio: 'inherit' });
  execSync('node scripts/diagnose.js', { cwd: rootDir, stdio: 'inherit' });

  console.log('\n✅ All security and pre-commit checks PASSED! 100% clean.');
} catch (err) {
  console.error('\n❌ Quality checks failed! Please resolve issues before committing.');
  process.exit(1);
}
