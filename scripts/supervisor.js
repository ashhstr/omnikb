const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const cliPath = path.join(rootDir, 'dist', 'cli.js');

let child = null;
let isStopping = false;

function startDaemon() {
  console.log(`[OmniKB Supervisor] Launching OmniKB Auto-Sync Daemon Engine...`);
  
  child = spawn(process.execPath, [cliPath, 'serve', '--port', '7890'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (isStopping) {
      console.log(`[OmniKB Supervisor] Service stopped intentionally.`);
      return;
    }
    console.warn(`[OmniKB Supervisor] Daemon process exited unexpectedly (code: ${code}, signal: ${signal}). Restarting in 2s...`);
    setTimeout(startDaemon, 2000);
  });

  child.on('error', (err) => {
    console.error(`[OmniKB Supervisor] Process error:`, err);
  });
}

process.on('SIGINT', () => {
  isStopping = true;
  if (child) child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  isStopping = true;
  if (child) child.kill('SIGTERM');
  process.exit(0);
});

startDaemon();
