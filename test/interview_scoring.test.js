const assert = require('assert');

function calculateAssessmentScores(scoresMap, tieBreakerApplied = false) {
  const VALID_SCORES = [0, 0.5, 1.0];
  let baseScore = 0;
  let scoredCount = 0;

  for (const [qId, scoreVal] of Object.entries(scoresMap)) {
    if (scoreVal !== null && scoreVal !== undefined) {
      const num = parseFloat(scoreVal);
      if (!VALID_SCORES.includes(num)) {
        throw new Error(`Invalid score ${scoreVal} for question ${qId}. Must be 0, 0.5, or 1.0`);
      }
      baseScore += num;
      scoredCount++;
    }
  }

  const finalScore = baseScore + (tieBreakerApplied ? 0.5 : 0);

  return {
    baseScore: Math.round(baseScore * 10) / 10,
    tieBreakerApplied: Boolean(tieBreakerApplied),
    finalScore: Math.round(finalScore * 10) / 10,
    scoredCount,
    isComplete: scoredCount === 10
  };
}

console.log('Running Interview Scoring Module Tests...');

// Test 1: Empty scores
const emptyRes = calculateAssessmentScores({});
assert.strictEqual(emptyRes.baseScore, 0);
assert.strictEqual(emptyRes.finalScore, 0);
assert.strictEqual(emptyRes.scoredCount, 0);
assert.strictEqual(emptyRes.isComplete, false);
console.log('✓ Initial zero state verified');

// Test 2: Valid 3-point scores on 10 questions
const tenScores = {
  1: 1.0,
  2: 0.5,
  3: 1.0,
  4: 0.5,
  5: 1.0,
  6: 0.5,
  7: 1.0,
  8: 0.5,
  9: 1.0,
  10: 1.0
};
const res1 = calculateAssessmentScores(tenScores, false);
assert.strictEqual(res1.baseScore, 8.0);
assert.strictEqual(res1.finalScore, 8.0);
assert.strictEqual(res1.scoredCount, 10);
assert.strictEqual(res1.isComplete, true);
console.log('✓ Base score 8.0/10.0 calculated accurately');

// Test 3: Tie-breaker bonus (+0.5)
const resTie = calculateAssessmentScores(tenScores, true);
assert.strictEqual(resTie.baseScore, 8.0);
assert.strictEqual(resTie.finalScore, 8.5);
assert.strictEqual(resTie.tieBreakerApplied, true);
console.log('✓ Tie-breaker +0.5 applied accurately (8.0 -> 8.5)');

// Test 4: Maximum achievable score
const perfectScores = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 };
const maxRes = calculateAssessmentScores(perfectScores, true);
assert.strictEqual(maxRes.baseScore, 10.0);
assert.strictEqual(maxRes.finalScore, 10.5);
console.log('✓ Max score 10.5 (10.0 + 0.5) verified');

// Test 5: Rejects invalid score points
assert.throws(() => {
  calculateAssessmentScores({ 1: 0.75 });
}, /Invalid score/);
console.log('✓ Invalid score values strictly rejected');

console.log('All Interview Scoring Unit Tests Passed!');
