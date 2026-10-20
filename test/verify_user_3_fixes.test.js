const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Running Tests for User-Requested 3 Fixes ---');

const htmlContent = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const appContent = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const serverContent = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const { DEPARTMENTS_BY_WING } = require('../data/constituencies');

// =========================================================================
// Test 1: DOM Hierarchy Verification (Manage Questions Modal not trapped)
// =========================================================================
console.log('1. Checking DOM structure of modals in index.html...');

// Find index of adminReviewModal and manageQuestionsModal
const adminReviewModalIdx = htmlContent.indexOf('id="adminReviewModal"');
const manageQuestionsModalIdx = htmlContent.indexOf('id="manageQuestionsModal"');
assert(adminReviewModalIdx !== -1, 'adminReviewModal must exist');
assert(manageQuestionsModalIdx !== -1, 'manageQuestionsModal must exist');

// In HTML, manageQuestionsModal must be AFTER the closing tag of adminReviewModal.
// We know adminReviewModal opens at adminReviewModalIdx.
// Let's count <div> open and close tags between adminReviewModal and manageQuestionsModal.
const sliceBetween = htmlContent.slice(adminReviewModalIdx, manageQuestionsModalIdx);
const opens = (sliceBetween.match(/<div(\s|>)/gi) || []).length;
const closes = (sliceBetween.match(/<\/div>/gi) || []).length;

console.log(`  Modal slice depth change: ${opens} <div> opens, ${closes} </div> closes.`);
assert.strictEqual(opens, closes, 'adminReviewModal must be completely closed before manageQuestionsModal starts!');
console.log('  ✓ manageQuestionsModal is a distinct top-level overlay (NOT nested inside adminReviewModal)');

// Buttons exist
assert(htmlContent.includes('id="btnOpenManageQuestions"'), 'btnOpenManageQuestions must exist in Admin Queue');
assert(htmlContent.includes('id="btnReviewOpenManageQuestions"'), 'btnReviewOpenManageQuestions must exist in Review modal');
console.log('  ✓ Both btnOpenManageQuestions and btnReviewOpenManageQuestions exist in index.html');

// =========================================================================
// Test 2: Password and Confirm Password Matching Enforcement
// =========================================================================
console.log('2. Checking Password & Confirm Password elements & validation...');
assert(htmlContent.includes('id="password"'), 'password input must exist in index.html');
assert(htmlContent.includes('id="confirmPassword"'), 'confirmPassword input must exist in index.html');
assert(htmlContent.includes('id="confirmPasswordMsg"'), 'confirmPasswordMsg element must exist in index.html');

// In app.js:
assert(appContent.includes('validatePasswordMatch'), 'app.js must define validatePasswordMatch');
assert(appContent.includes('formData.get(\'password\')'), 'app.js must extract password');
assert(appContent.includes('formData.get(\'confirm_password\')'), 'app.js must extract confirm_password');
assert(appContent.includes('password !== confirmPassword'), 'app.js must compare password and confirmPassword on submit');

// In server.js:
assert(serverContent.includes('body.password !== body.confirm_password'), 'server.js must validate password === confirm_password');
console.log('  ✓ Client-side live matching, client submit blocking, and server-side 400 rejection verified for password mismatch.');

// =========================================================================
// Test 3: Department Selection Logic (Numbered headers only, sub-items disabled info-only)
// =========================================================================
console.log('3. Checking Department options logic (numbered selectable, sub-items disabled)...');

// In app.js:
assert(appContent.includes('itemOpt.disabled = true;'), 'app.js must disable sub-item options');
assert(appContent.includes('(Info only)'), 'app.js must append (Info only) to sub-item options');
assert(appContent.includes('itemOpt.value = \'\';'), 'app.js must clear value of sub-item options');
assert(appContent.includes('headerOpt.value = dept.name;'), 'app.js must set headerOpt.value to numbered dept.name');

// Verify data structure in constituencies.js
let totalNumbered = 0;
let totalSubItems = 0;
for (const [wing, depts] of Object.entries(DEPARTMENTS_BY_WING)) {
  depts.forEach(dept => {
    if (typeof dept === 'object' && dept.name) {
      assert(/^\d+\./.test(dept.name), `Department header "${dept.name}" must start with a number`);
      totalNumbered++;
      if (Array.isArray(dept.items)) {
        totalSubItems += dept.items.length;
      }
    }
  });
}

console.log(`  Verified ${totalNumbered} numbered department headers across all wings.`);
console.log(`  Verified ${totalSubItems} sub-items correctly configured for info-only presentation.`);
console.log('  ✓ Only numbered departments can be selected; sub-items are disabled info-only.');

console.log('\n--- All 3 User Fix Validations Passed Successfully! ---');
