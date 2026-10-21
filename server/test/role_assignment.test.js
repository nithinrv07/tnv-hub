const assert = require('assert');

const MODULE_ROLES = [
  'District Coordinator / Additional District Coordinator',
  'District Department Coordinator / Additional District Department Coordinator',
  'District Committee Member',
  'Constituency Coordinator / Additional Constituency Coordinator',
  'Taluka Coordinator / Additional Taluka Coordinator',
  'Village Coordinator / Additional Village Coordinator',
  'Volunteer / Lead Volunteer'
];

function getRoleFrom10Score(score) {
  if (score >= 8.5) {
    return {
      role: 'District Coordinator / Additional District Coordinator',
      hint: 'High evaluation score >= 8.5'
    };
  }
  if (score >= 8.0) {
    return {
      role: 'District Department Coordinator / Additional District Department Coordinator',
      hint: 'Evaluation score 8.0 – 8.4'
    };
  }
  if (score >= 7.0) {
    return {
      role: 'District Committee Member',
      hint: 'Evaluation score 7.0 – 7.9'
    };
  }
  if (score >= 5.5) {
    return {
      role: 'Constituency Coordinator / Additional Constituency Coordinator',
      hint: 'Evaluation score 5.5 – 6.9'
    };
  }
  if (score >= 4.5) {
    return {
      role: 'Taluka Coordinator / Additional Taluka Coordinator',
      hint: 'Evaluation score 4.5 – 5.4'
    };
  }
  if (score >= 3.5) {
    return {
      role: 'Village Coordinator / Additional Village Coordinator',
      hint: 'Evaluation score 3.5 – 4.4'
    };
  }
  return {
    role: 'Volunteer / Lead Volunteer',
    hint: 'Evaluation score < 3.5'
  };
}

console.log('Running Role Assignment & Auto-Suggestion Tests...');

// Test 1: Verify all 7 module roles are covered
for (const testCase of [
  { score: 10.0, expectedRole: 'District Coordinator / Additional District Coordinator' },
  { score: 8.5, expectedRole: 'District Coordinator / Additional District Coordinator' },
  { score: 8.0, expectedRole: 'District Department Coordinator / Additional District Department Coordinator' },
  { score: 7.5, expectedRole: 'District Committee Member' },
  { score: 6.0, expectedRole: 'Constituency Coordinator / Additional Constituency Coordinator' },
  { score: 5.0, expectedRole: 'Taluka Coordinator / Additional Taluka Coordinator' },
  { score: 4.0, expectedRole: 'Village Coordinator / Additional Village Coordinator' },
  { score: 2.5, expectedRole: 'Volunteer / Lead Volunteer' },
  { score: 0.0, expectedRole: 'Volunteer / Lead Volunteer' }
]) {
  const result = getRoleFrom10Score(testCase.score);
  assert.strictEqual(
    result.role,
    testCase.expectedRole,
    `Score ${testCase.score} should map to ${testCase.expectedRole}, got: ${result.role}`
  );
  assert(MODULE_ROLES.includes(result.role), `Role ${result.role} must be one of the 7 module roles`);
}
console.log('✓ All 7 module score bands map accurately');

// Test 2: Tie-breaker elevation
// A score of 8.0 maps to District Department Coordinator. With tie-breaker (+0.5) = 8.5, it elevates to District Coordinator!
const baseScore = 8.0;
const elevatedScore = baseScore + 0.5;
assert.strictEqual(getRoleFrom10Score(baseScore).role, 'District Department Coordinator / Additional District Department Coordinator');
assert.strictEqual(getRoleFrom10Score(elevatedScore).role, 'District Coordinator / Additional District Coordinator');
console.log('✓ Tie-breaker bonus successfully elevates candidate across role threshold');

console.log('All Role Assignment & Auto-Suggestion Unit Tests Passed!');
