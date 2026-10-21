// Unit test for username validation rules (Step 2)
const USERNAME_REGEX = /^[A-Za-z0-9_]{4,20}$/;

function isValidUsernameFormat(username) {
  if (!username || typeof username !== 'string') {
    return false;
  }
  return USERNAME_REGEX.test(username);
}

const testCases = [
  // Valid cases
  { input: 'john', expected: true, desc: 'Minimum length 4' },
  { input: 'john_doe', expected: true, desc: 'Letters and underscore' },
  { input: 'user123', expected: true, desc: 'Letters and numbers' },
  { input: '1234', expected: true, desc: '4 digits' },
  { input: 'TNV_Volunteer_2026', expected: true, desc: '18 chars with underscores' },
  { input: '12345678901234567890', expected: true, desc: 'Maximum length 20' },

  // Invalid cases
  { input: 'abc', expected: false, desc: 'Too short (3 chars)' },
  { input: '', expected: false, desc: 'Empty string' },
  { input: null, expected: false, desc: 'Null value' },
  { input: undefined, expected: false, desc: 'Undefined value' },
  { input: 'user name', expected: false, desc: 'Contains space' },
  { input: 'user-name', expected: false, desc: 'Contains hyphen (only underscore allowed)' },
  { input: 'user@123', expected: false, desc: 'Contains @' },
  { input: 'user.name', expected: false, desc: 'Contains dot' },
  { input: '123456789012345678901', expected: false, desc: 'Too long (21 chars)' },
];

let passed = 0;
let failed = 0;

console.log('--- Running Username Validation Tests ---');
for (const tc of testCases) {
  const result = isValidUsernameFormat(tc.input);
  if (result === tc.expected) {
    passed++;
    console.log(`[PASS] ${tc.desc}: "${tc.input}" -> ${result}`);
  } else {
    failed++;
    console.error(`[FAIL] ${tc.desc}: "${tc.input}" expected ${tc.expected}, got ${result}`);
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
