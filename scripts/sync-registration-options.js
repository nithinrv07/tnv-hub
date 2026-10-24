// Copies the server's district list and registration dropdown options into the
// client, so the register form fills instantly and works even when /api is down.
// Re-run after changing DISTRICTS / OPTIONS in server/server.js or server/data:
//   node scripts/sync-registration-options.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outFile = path.join(rootDir, 'client', 'src', 'data', 'registrationOptions.json');
const PORT = 3971;

const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(rootDir, 'server'),
  env: { ...process.env, PORT: String(PORT), SUPABASE_URL: '' },
  stdio: 'ignore'
});

async function fetchJson(pathname) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}${pathname}`);
      if (res.ok) return await res.json();
    } catch (_e) {
      // server not up yet
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Could not load ${pathname} from the server`);
}

(async () => {
  try {
    const { districts } = await fetchJson('/api/districts');
    const options = await fetchJson('/api/options');
    fs.writeFileSync(outFile, JSON.stringify({ districts, options }, null, 2) + '\n');
    console.log(`Wrote ${districts.length} districts and ${Object.keys(options).length} option lists to ${path.relative(rootDir, outFile)}`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    server.kill();
  }
})();
