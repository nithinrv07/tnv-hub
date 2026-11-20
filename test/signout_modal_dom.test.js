const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTest() {
  console.log('Testing Task 1: SignOutModal component...');
  const modalPath = path.join(__dirname, '../../client/src/components/SignOutModal.jsx');
  assert(fs.existsSync(modalPath), 'SignOutModal.jsx file exists');

  const content = fs.readFileSync(modalPath, 'utf8');
  assert(content.includes('export default function SignOutModal'), 'Exports SignOutModal component');
  assert(content.includes('isOpen'), 'Accepts isOpen prop');
  assert(content.includes('onConfirm'), 'Accepts onConfirm prop');
  assert(content.includes('onCancel'), 'Accepts onCancel prop');
  assert(content.includes('Sign out of TNV Portal?'), 'Contains clear signout title');
  assert(content.includes('Stay Signed In') || content.includes('Cancel'), 'Contains cancel/stay action');
  assert(content.includes('Sign Out'), 'Contains signout action');

  console.log('SignOutModal DOM & Component Check Passed!');
}

try {
  runTest();
} catch (err) {
  console.error('Task 1 Test Failed:', err.message);
  process.exit(1);
}
