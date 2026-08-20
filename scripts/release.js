#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const positionalArgs = args.filter((a) => !a.startsWith('--'));
const rawBumpType = (positionalArgs[0] || 'minor').toLowerCase();

let normalizedType = '';
if (['minor', 'patch', 'kecil'].includes(rawBumpType)) {
  normalizedType = 'minor'; // Angka paling belakang (misal: v1.3.1 -> v1.3.2)
} else if (['mayor', 'tengah', 'fitur'].includes(rawBumpType)) {
  normalizedType = 'mayor'; // Angka bagian tengah (misal: v1.3.1 -> v1.4.0)
} else if (['besar', 'major', 'depan'].includes(rawBumpType)) {
  normalizedType = 'besar'; // Angka paling depan / kiri (misal: v1.3.1 -> v2.0.0)
} else {
  console.error(`Tipe update tidak valid: "${rawBumpType}".`);
  console.error(`Pilihan yang tersedia:`);
  console.error(`- "minor" / "kecil" : Update angka paling belakang (perbaikan kecil/bugfix) -> v1.3.2`);
  console.error(`- "mayor" / "tengah": Update angka bagian tengah (fitur/update penting)   -> v1.4.0`);
  console.error(`- "besar" / "depan" : Update angka paling depan (update besar-besaran)   -> v2.0.0`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = pkg.version;
const [vDepan, vTengah, vBelakang] = currentVersion.split('.').map(Number);

let newVersion = '';
let deskripsiKategori = '';

if (normalizedType === 'minor') {
  // Update angka paling belakang
  newVersion = `${vDepan}.${vTengah}.${vBelakang + 1}`;
  deskripsiKategori = 'Minor (Perbaikan kecil / angka belakang)';
} else if (normalizedType === 'mayor') {
  // Update angka bagian tengah
  newVersion = `${vDepan}.${vTengah + 1}.0`;
  deskripsiKategori = 'Mayor (Update penting & fitur / angka tengah)';
} else if (normalizedType === 'besar') {
  // Update angka paling depan (kiri)
  newVersion = `${vDepan + 1}.0.0`;
  deskripsiKategori = 'Besar-besaran (Update besar / angka depan)';
}

console.log(`\n🚀 OmniKB Release Automation`);
console.log(`-----------------------------------`);
console.log(`Versi saat ini  : v${currentVersion}`);
console.log(`Target rilis    : v${newVersion}`);
console.log(`Kategori        : ${deskripsiKategori}`);
console.log(`Mode Dry Run    : ${isDryRun ? 'YA (Hanya simulasi, tidak mengubah file)' : 'TIDAK (Akan commit & tag)'}\n`);

// 1. Run tests before release
console.log('1. Running test suite...');
try {
  execSync('npm test', { cwd: rootDir, stdio: 'inherit' });
  console.log('   ✅ Tests passed.');
} catch (err) {
  console.error('   ❌ Tests failed. Aborting release.');
  process.exit(1);
}

// 2. Gather git commits since last tag
let commitLog = '';
try {
  const lastTag = execSync('git describe --tags --abbrev=0 2>nul || echo ""', { cwd: rootDir, encoding: 'utf8' }).trim();
  const gitRange = lastTag ? `${lastTag}..HEAD` : 'HEAD~10..HEAD';
  commitLog = execSync(`git log ${gitRange} --oneline --no-merges`, { cwd: rootDir, encoding: 'utf8' }).trim();
} catch (e) {
  commitLog = 'Initial release changes.';
}

const today = new Date().toISOString().split('T')[0];
const changelogEntry = `\n## [v${newVersion}] - ${today}\n\n### Changes\n${commitLog.split('\n').map(line => `- ${line}`).join('\n')}\n`;

if (isDryRun) {
  console.log('\n[DRY RUN] Would update package.json version to:', newVersion);
  console.log('[DRY RUN] Would append to CHANGELOG.md:\n', changelogEntry);
  console.log(`[DRY RUN] Would commit: "chore(release): v${newVersion}"`);
  console.log(`[DRY RUN] Would tag: "v${newVersion}"`);
  console.log('\n✨ Dry run complete! No changes made.');
  process.exit(0);
}

// Update package.json
pkg.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('2. Updated package.json');

// Update CHANGELOG.md
let currentChangelog = '';
if (fs.existsSync(changelogPath)) {
  currentChangelog = fs.readFileSync(changelogPath, 'utf8');
} else {
  currentChangelog = '# OmniKB Changelog\n\nAll notable changes to this project will be documented in this file.\n';
}

const updatedChangelog = currentChangelog.replace('# OmniKB Changelog\n', `# OmniKB Changelog\n${changelogEntry}`);
fs.writeFileSync(changelogPath, updatedChangelog, 'utf8');
console.log('3. Updated CHANGELOG.md');

function getGhCommand() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return 'gh';
  } catch {
    const stdPath = 'C:\\Program Files\\GitHub CLI\\gh.exe';
    if (fs.existsSync(stdPath)) return `"${stdPath}"`;
    return null;
  }
}

// Git commit & tag & GitHub CLI Release
try {
  console.log('4. Staging and committing release files...');
  execSync('git add package.json CHANGELOG.md', { cwd: rootDir });
  execSync(`git commit -m "chore(release): v${newVersion}"`, { cwd: rootDir, stdio: 'inherit' });
  execSync(`git tag -a "v${newVersion}" -m "Release v${newVersion}"`, { cwd: rootDir, stdio: 'inherit' });
  console.log('   ✅ Git commit & tag created.');

  console.log('5. Pushing to GitHub (origin main --tags)...');
  execSync('git push origin main --tags', { cwd: rootDir, stdio: 'inherit' });
  console.log('   ✅ Git push completed.');

  const ghCmd = getGhCommand();
  if (ghCmd) {
    console.log('6. Packaging tarball and creating official GitHub Release...');
    const releaseTitle = `v${newVersion} — ${deskripsiKategori}`;
    const notesFile = path.join(rootDir, '.release-notes.tmp');
    fs.writeFileSync(notesFile, changelogEntry.trim(), 'utf8');

    const tgzName = `omnikb-${newVersion}.tgz`;
    try {
      execSync('npm pack', { cwd: rootDir, stdio: 'inherit' });
      execSync(`${ghCmd} release create "v${newVersion}" "${tgzName}" --title "${releaseTitle}" --notes-file "${notesFile}"`, {
        cwd: rootDir,
        stdio: 'inherit',
      });
      console.log(`   ✅ GitHub Release v${newVersion} published with ${tgzName}!`);
    } finally {
      if (fs.existsSync(notesFile)) fs.unlinkSync(notesFile);
      if (fs.existsSync(path.join(rootDir, tgzName))) fs.unlinkSync(path.join(rootDir, tgzName));
    }
  } else {
    console.log('ℹ️  GitHub CLI (gh) not found in PATH. Push completed, create release manually if desired.');
  }

  console.log(`\n🎉 Successfully released and published v${newVersion} to GitHub!`);
} catch (err) {
  console.error('Git/GitHub release execution failed:', err.message);
}
