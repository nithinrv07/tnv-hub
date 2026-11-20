const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Task 3: Dashboard Navigation Guard Contract...');

const dashFilePath = path.join(__dirname, '../../client/src/pages/Dashboard.jsx');
assert(fs.existsSync(dashFilePath), 'Dashboard.jsx must exist');

const content = fs.readFileSync(dashFilePath, 'utf8');

// 1. Must import and use SignOutModal
assert(content.includes('SignOutModal'), 'Dashboard.jsx must use SignOutModal');
assert(content.includes('<SignOutModal'), 'Dashboard.jsx must render <SignOutModal');

// 2. Must have sentinel guard with tnvVolunteerGuard or sentinel state
assert(
  content.includes('tnvVolunteerGuard') || content.includes('isSentinel'),
  'Dashboard.jsx must set up a sentinel history guard state'
);

// 3. Must check activeTab in popstate listener to only intercept root overview pops
assert(
  content.includes('activeTab === \'overview\'') || content.includes('activeTabRef.current === \'overview\''),
  'Dashboard.jsx must check if activeTab is overview before opening SignOutModal'
);

// 4. Must re-push sentinel state in popstate when on overview to prevent unmounting
assert(
  content.includes('window.history.pushState') && content.includes('setShowSignOutModal(true)'),
  'Dashboard.jsx must pushState and open SignOutModal on overview popstate'
);

// 5. Must call logout and navigate to /login with { replace: true } on confirmLogout
const confirmLogoutMatch = content.match(/const confirmLogout = \(\) => \{([\s\S]*?)\};/);
assert(confirmLogoutMatch, 'Must define confirmLogout function');
assert(
  confirmLogoutMatch[1].includes('logout()') && confirmLogoutMatch[1].includes('replace: true'),
  'confirmLogout must call logout() and navigate with { replace: true }'
);

console.log('Task 3 Dashboard Navigation Guard Contract Test Passed!');
