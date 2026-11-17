const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Task 1: Login history replacement options...');

const loginFilePath = path.join(__dirname, '../../client/src/pages/Login.jsx');
assert(fs.existsSync(loginFilePath), 'Login.jsx must exist');

const content = fs.readFileSync(loginFilePath, 'utf8');

// Match handleSubmit down to setError
const submitMatch = content.match(/const handleSubmit = async[\s\S]*?const res = await login[\s\S]*?setError/);
assert(submitMatch, 'Must find handleSubmit block');

const submitBlock = submitMatch[0];

const navLines = submitBlock.split('\n').filter(line => line.includes('navigate('));
assert(navLines.length === 3, `Must have exactly 3 navigate calls in role routing, found: ${navLines.length}`);

navLines.forEach((line, i) => {
  assert(
    line.includes('{ replace: true }'),
    `navigate call ${i + 1} (${line.trim()}) must include { replace: true }`
  );
});

console.log('Task 1 Login History Replacement Test Passed!');
