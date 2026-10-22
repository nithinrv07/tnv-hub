const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');

console.log('\x1b[32m%s\x1b[0m', '=== Starting TNV Hub Parallel Monorepo ===');
console.log('1. Starting REST API Server on http://localhost:3000...');
console.log('2. Starting Vite React Client on http://localhost:5173...');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const serverProc = spawn(npmCmd, ['run', 'dev'], {
  cwd: serverDir,
  stdio: 'inherit',
  shell: isWin
});

const clientProc = spawn(npmCmd, ['run', 'dev'], {
  cwd: clientDir,
  stdio: 'inherit',
  shell: isWin
});

function cleanup() {
  console.log('\nShutting down servers...');
  serverProc.kill();
  clientProc.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
