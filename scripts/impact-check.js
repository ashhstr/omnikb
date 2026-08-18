#!/usr/bin/env node

/**
 * OmniKB Automated Blast Radius CI/CD Scanner Helper
 * Runs 'omnikb audit-impact' across changed Git files or explicit target symbols/files.
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const cliPath = path.join(rootDir, 'dist', 'cli.js');

// Parse CLI arguments
const rawArgs = process.argv.slice(2);
let maxRisk = 'HIGH';
let depth = 5;
let isJson = false;
const explicitTargets = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--json') {
    isJson = true;
  } else if (arg === '--max-risk' && rawArgs[i + 1]) {
    const val = rawArgs[i + 1].toUpperCase();
    if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(val)) {
      maxRisk = val;
    }
    i++;
  } else if (arg.startsWith('--max-risk=')) {
    const val = arg.split('=')[1].toUpperCase();
    if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(val)) {
      maxRisk = val;
    }
  } else if (arg === '--depth' && rawArgs[i + 1]) {
    const parsed = parseInt(rawArgs[i + 1], 10);
    if (!isNaN(parsed) && parsed > 0) depth = parsed;
    i++;
  } else if (arg.startsWith('--depth=')) {
    const parsed = parseInt(arg.split('=')[1], 10);
    if (!isNaN(parsed) && parsed > 0) depth = parsed;
  } else if (!arg.startsWith('-')) {
    explicitTargets.push(arg);
  }
}

// Ensure dist/cli.js exists
if (!fs.existsSync(cliPath)) {
  try {
    execSync('npm run build', { cwd: rootDir, stdio: isJson ? 'pipe' : 'inherit' });
  } catch (err) {
    if (isJson) {
      console.log(JSON.stringify({ passed: false, error: 'Failed to build OmniKB before running impact-check' }));
    } else {
      console.error('❌ Failed to compile OmniKB before running impact-check.');
    }
    process.exit(1);
  }
}

// Determine target files/symbols to audit
let targetsToAudit = [];

if (explicitTargets.length > 0) {
  targetsToAudit = explicitTargets;
} else {
  // Auto-detect changed source code files from git
  const candidateExtensions = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs',
    '.dart', '.vue', '.svelte', '.java', '.kt', '.php', '.sql', '.prisma'
  ]);

  try {
    const stagedFiles = execSync('git diff --name-only --cached', { cwd: rootDir, encoding: 'utf8' })
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const unstagedFiles = execSync('git diff --name-only', { cwd: rootDir, encoding: 'utf8' })
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const untrackedFiles = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf8' })
      .split('\n')
      .map((f) => f.trim())
      .filter((line) => line.startsWith('??') || line.startsWith('A') || line.startsWith('M'))
      .map((line) => line.slice(3).trim())
      .filter(Boolean);

    const allChanged = Array.from(new Set([...stagedFiles, ...unstagedFiles, ...untrackedFiles]));

    targetsToAudit = allChanged.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      if (!candidateExtensions.has(ext)) return false;
      if (file.startsWith('.omnikb') || file.startsWith('dist') || file.startsWith('node_modules')) return false;
      const absPath = path.resolve(rootDir, file);
      return fs.existsSync(absPath);
    });
  } catch (err) {
    // If not a git repository or git error, fallback to empty
    targetsToAudit = [];
  }
}

if (targetsToAudit.length === 0) {
  if (isJson) {
    console.log(JSON.stringify({
      passed: true,
      maxAllowedRisk: maxRisk,
      totalAudited: 0,
      results: [],
      message: 'No modified source files detected to audit.',
    }, null, 2));
  } else {
    console.log('🔍 [OmniKB Impact Check] No modified source files detected in Git working tree. Nothing to audit.\n');
  }
  process.exit(0);
}

if (!isJson) {
  console.log(`\n🔍 [OmniKB Impact Check] Auditing blast radius for ${targetsToAudit.length} target(s)...`);
  console.log(`   Policy: Max Allowed Risk = ${maxRisk} | Max Depth = ${depth}\n`);
}

const RISK_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

const results = [];
let hasFailure = false;

for (const target of targetsToAudit) {
  const runRes = spawnSync(
    process.execPath,
    [cliPath, 'audit-impact', target, '--max-risk', maxRisk, '--depth', String(depth), '--json'],
    { cwd: rootDir, encoding: 'utf8' }
  );

  let parsedOutput = null;
  if (runRes.stdout) {
    try {
      parsedOutput = JSON.parse(runRes.stdout.trim());
    } catch {
      // Find JSON block if extra text present
      const jsonStart = runRes.stdout.indexOf('{');
      const jsonEnd = runRes.stdout.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        try {
          parsedOutput = JSON.parse(runRes.stdout.slice(jsonStart, jsonEnd + 1));
        } catch {}
      }
    }
  }

  const passed = runRes.status === 0 && parsedOutput && parsedOutput.passed;
  if (!passed) {
    hasFailure = true;
  }

  const riskScore = parsedOutput ? parsedOutput.riskScore : 'UNKNOWN';
  const directCount = parsedOutput && parsedOutput.directCallers ? parsedOutput.directCallers.length : 0;
  const transCount = parsedOutput && parsedOutput.transitiveCallers ? parsedOutput.transitiveCallers.length : 0;
  const fileCount = parsedOutput && parsedOutput.affectedFiles ? parsedOutput.affectedFiles.length : 0;
  const routeCount = parsedOutput && parsedOutput.affectedRoutes ? parsedOutput.affectedRoutes.length : 0;
  const summary = parsedOutput ? parsedOutput.summary : (runRes.stderr || 'Audit execution completed');

  results.push({
    target,
    passed: Boolean(passed),
    riskScore,
    maxAllowedRisk: maxRisk,
    directCallersCount: directCount,
    transitiveCallersCount: transCount,
    affectedFilesCount: fileCount,
    affectedRoutesCount: routeCount,
    summary,
    details: parsedOutput || null,
  });

  if (!isJson) {
    const statusIcon = passed ? '✅ PASS' : '🚨 FAIL';
    console.log(`------------------------------------------------------------------------`);
    console.log(`${statusIcon} Target: ${target}`);
    console.log(`   Risk Score: ${riskScore} (Allowed: <= ${maxRisk})`);
    console.log(`   Callers: ${directCount} direct, ${transCount} transitive | Affected Files: ${fileCount} | Routes: ${routeCount}`);
    if (parsedOutput && parsedOutput.affectedFiles && parsedOutput.affectedFiles.length > 0) {
      console.log(`   Affected Files: ${parsedOutput.affectedFiles.slice(0, 5).join(', ')}${parsedOutput.affectedFiles.length > 5 ? ` (+${parsedOutput.affectedFiles.length - 5} more)` : ''}`);
    }
    if (!passed) {
      console.log(`   ⚠️  Violation: Risk level '${riskScore}' exceeds threshold '${maxRisk}'.`);
    }
  }
}

if (!isJson) {
  console.log(`------------------------------------------------------------------------\n`);
  if (hasFailure) {
    console.error(`🚨 CI/CD Blast Radius Gate FAILED: One or more targets exceeded the maximum risk threshold (${maxRisk}).\n`);
  } else {
    console.log(`🎉 CI/CD Blast Radius Gate PASSED: All ${targetsToAudit.length} target(s) within allowed risk threshold (${maxRisk}).\n`);
  }
} else {
  console.log(JSON.stringify({
    passed: !hasFailure,
    maxAllowedRisk: maxRisk,
    totalAudited: targetsToAudit.length,
    failedCount: results.filter((r) => !r.passed).length,
    results,
  }, null, 2));
}

process.exit(hasFailure ? 1 : 0);
