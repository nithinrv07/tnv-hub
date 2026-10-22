const assert = require('assert');

// Logic under test: Question repository and active set manager
class QuestionManager {
  constructor(initialQuestions = []) {
    this.questions = JSON.parse(JSON.stringify(initialQuestions));
  }

  getAll() {
    return [...this.questions];
  }

  getActive() {
    return this.questions.filter(q => q.active);
  }

  addQuestion({ question_en, question_ta, hint }) {
    if (!question_en || !question_en.trim()) {
      throw new Error('English question text is required');
    }
    const maxId = this.questions.reduce((max, q) => Math.max(max, q.id || 0), 0);
    const newQ = {
      id: maxId + 1,
      position: this.questions.length + 1,
      question_en: question_en.trim(),
      question_ta: (question_ta || '').trim(),
      hint: (hint || '').trim(),
      active: false
    };
    this.questions.push(newQ);
    return newQ;
  }

  updateQuestion(id, updates) {
    const q = this.questions.find(item => item.id === id);
    if (!q) throw new Error(`Question ${id} not found`);
    if (updates.question_en !== undefined) {
      if (!updates.question_en.trim()) throw new Error('English question text cannot be empty');
      q.question_en = updates.question_en.trim();
    }
    if (updates.question_ta !== undefined) q.question_ta = updates.question_ta.trim();
    if (updates.hint !== undefined) q.hint = updates.hint.trim();
    return q;
  }

  setActiveQuestionIds(activeIds) {
    if (!Array.isArray(activeIds)) {
      throw new Error('activeIds must be an array');
    }
    if (activeIds.length !== 10) {
      throw new Error(`Exactly 10 questions must be active for the interview (received ${activeIds.length})`);
    }

    // Verify all IDs exist
    for (const id of activeIds) {
      if (!this.questions.some(q => q.id === id)) {
        throw new Error(`Question ID ${id} does not exist`);
      }
    }

    this.questions.forEach(q => {
      q.active = activeIds.includes(q.id);
    });

    return this.getActive();
  }
}

// Tests
console.log('Running Questions Management Module Tests...');

const { SEEDED_QUESTIONS } = require('../data/questions_seed');

const manager = new QuestionManager(SEEDED_QUESTIONS);

// Test 1: Exactly 16 questions seeded initially
const all = manager.getAll();
assert.strictEqual(all.length, 16, `Expected 16 seeded questions, got ${all.length}`);
assert(all[0].question_en && all[0].question_ta && all[0].hint, 'Seeded questions must have bilingual text and hint');
console.log('✓ 16 bilingual questions with hints seeded successfully');

// Test 2: Exactly 10 active by default
const active = manager.getActive();
assert.strictEqual(active.length, 10, `Expected exactly 10 active questions, got ${active.length}`);
console.log('✓ Exactly 10 questions active by default');

// Test 3: Add new question
const newQ = manager.addQuestion({
  question_en: 'How do you handle public communication during an emergency?',
  question_ta: 'அவசரகால சூழ்நிலையில் பொதுமக்களுடனான தகவல்தொடர்பை எவ்வாறு கையாளுவீர்கள்?',
  hint: 'Look for clarity, empathy, speed, and misinformation prevention.'
});
assert.strictEqual(newQ.id, 17);
assert.strictEqual(manager.getAll().length, 17);
console.log('✓ New bilingual question added successfully');

// Test 4: Update question
manager.updateQuestion(17, { question_en: 'How do you handle civic communication during an emergency?' });
assert.strictEqual(manager.getAll().find(q => q.id === 17).question_en, 'How do you handle civic communication during an emergency?');
console.log('✓ Existing question edited successfully');

// Test 5: Reject invalid active question count (e.g. 9 or 11)
assert.throws(() => {
  manager.setActiveQuestionIds([1, 2, 3, 4, 5, 6, 7, 8, 9]); // 9 items
}, /Exactly 10 questions must be active/);

assert.throws(() => {
  manager.setActiveQuestionIds([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]); // 11 items
}, /Exactly 10 questions must be active/);
console.log('✓ Rejects selection if not exactly 10 questions');

// Test 6: Set custom 10 active questions including the new question
const custom10 = [2, 3, 4, 5, 6, 7, 8, 9, 10, 17];
manager.setActiveQuestionIds(custom10);
const newActive = manager.getActive();
assert.strictEqual(newActive.length, 10);
assert(newActive.some(q => q.id === 17), 'New question #17 must be in active set');
console.log('✓ Successfully activated custom 10 questions');

console.log('All Questions Management Unit Tests Passed!');
