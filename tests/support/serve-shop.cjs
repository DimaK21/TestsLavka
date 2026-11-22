const { spawn } = require('node:child_process');
const { existsSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const shopDir = resolve(process.env.QA_SHOP_DIR || 'qa-shop');
const entry = join(shopDir, 'server.js');
if (!existsSync(entry)) {
  console.error('Распакуйте магазин в qa-shop/ или задайте QA_SHOP_DIR.');
  process.exit(1);
}

const dataDir = mkdtempSync(join(tmpdir(), 'qa-shop-e2e-'));
const server = spawn(process.execPath, [entry], {
  cwd: shopDir,
  env: { ...process.env, DATA_DIR: dataDir, ALLOW_TEST_RESET: '0' },
  stdio: 'inherit',
});

process.on('SIGTERM', () => server.kill('SIGTERM'));
process.on('SIGINT', () => server.kill('SIGINT'));
server.on('error', (error) => console.error(error));
server.on('close', (code) => {
  rmSync(dataDir, { recursive: true, force: true });
  process.exitCode = code ?? 0;
});
