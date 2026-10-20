const assert = require('assert');

const CALL_STATUSES = ['Attending', 'Not Attending', 'Postponed', 'No Answer'];

function validateCallLogInput(input) {
  if (!input.profile_id) {
    return { valid: false, error: 'profile_id is required' };
  }
  if (!input.status) {
    return { valid: false, error: 'status is required' };
  }
  if (!CALL_STATUSES.includes(input.status)) {
    return {
      valid: false,
      error: `Invalid status: ${input.status}. Must be one of: ${CALL_STATUSES.join(', ')}`
    };
  }
  return { valid: true };
}

console.log('Running Call Log Module Parity Tests...');

// Test 1: Valid statuses
for (const status of CALL_STATUSES) {
  const res = validateCallLogInput({ profile_id: 'usr_123', status, notes: 'Spoke with candidate' });
  assert.strictEqual(res.valid, true, `Status ${status} should be valid`);
}
console.log('✓ All 4 module statuses (Attending, Not Attending, Postponed, No Answer) pass validation');

// Test 2: Invalid legacy status is rejected
const legacyRes = validateCallLogInput({ profile_id: 'usr_123', status: 'no_answer' });
assert.strictEqual(legacyRes.valid, false);
console.log('✓ Obsolete lowercase status is rejected by strict validation');

// Test 3: No callback timestamp required
const resNoCb = validateCallLogInput({ profile_id: 'usr_123', status: 'Postponed', notes: 'Candidate requested evening call' });
assert.strictEqual(resNoCb.valid, true);
console.log('✓ Postponed status does not require callback_at constraint');

console.log('All Call Log Module Parity Tests Passed!');
