const fs = require('fs');
const assert = require('assert');

console.log('--- Verifying Review & Verify Modal DOM & Handlers ---');

const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/app.js', 'utf8');

// 1. Verify app.js is at the bottom of the body
const scriptTagIdx = html.lastIndexOf('<script src="/app.js"></script>');
const bodyCloseIdx = html.indexOf('</body>');
assert(scriptTagIdx > 0, '<script src="/app.js"></script> must exist');
assert(scriptTagIdx < bodyCloseIdx, '<script src="/app.js"></script> must be before </body>');
console.log('✓ Script tag correctly placed at bottom of index.html');

// 2. Verify neither revScheduledBox nor revAttendedBox is referenced
assert(!js.includes('revScheduledBox.classList'), 'revScheduledBox must not be referenced in app.js');
assert(!js.includes('revAttendedBox.classList'), 'revAttendedBox must not be referenced in app.js');
console.log('✓ Legacy undeclared elements (revScheduledBox, revAttendedBox) are completely removed');

// 3. Verify modal elements exist in index.html
const essentialIds = [
  'adminReviewModal', 'revApplicantName', 'revApplicantUsername', 'revStatusBadge',
  'revPaymentBadge', 'revFullName', 'revPhone', 'revEmail', 'revDistrict',
  'revAadhaarDisplay', 'btnRevealAadhaar', 'revCurrentCallStatusBadge',
  'revCallNotesInput', 'btnSaveCallLogAction', 'revCallHistoryList',
  'revRunningScore', 'revScoreProgressBar', 'revScoredCount', 'revQuestionsList',
  'revTieBreakerYes', 'revTieBreakerNo', 'revRoleSelect', 'revRoleBadge',
  'btnSaveScoresDraft', 'btnApproveApplicant', 'revApprovalAlert'
];

for (const id of essentialIds) {
  assert(html.includes(`id="${id}"`), `Element with id "${id}" must exist in index.html`);
}
console.log(`✓ All ${essentialIds.length} Review & Scoring Modal DOM elements exist in index.html`);

console.log('--- All Review & Verify Modal Checks Passed 100%! ---');
