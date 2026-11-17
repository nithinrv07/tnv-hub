const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Task 2: Admin Navigation Guard Contract...');

const adminFilePath = path.join(__dirname, '../../client/src/pages/Admin.jsx');
assert(fs.existsSync(adminFilePath), 'Admin.jsx must exist');

const content = fs.readFileSync(adminFilePath, 'utf8');

// 1. Must import and use SignOutModal
assert(content.includes('SignOutModal'), 'Admin.jsx must use SignOutModal');
assert(content.includes('<SignOutModal'), 'Admin.jsx must render <SignOutModal');

// 2. Must have sentinel guard with tnvAdminGuard or sentinel state
assert(
  content.includes('tnvAdminGuard') || content.includes('isSentinel'),
  'Admin.jsx must set up a sentinel history guard state'
);

// 3. Must check activeNav in popstate listener to only intercept root overview pops
assert(
  content.includes('activeNav === \'dashboard\'') || content.includes('activeNavRef.current === \'dashboard\''),
  'Admin.jsx must check if activeNav is dashboard before opening SignOutModal'
);

// 4. Must re-push sentinel state in popstate when on overview to prevent unmounting
assert(
  content.includes('window.history.pushState') && content.includes('setShowSignOutModal(true)'),
  'Admin.jsx must pushState and open SignOutModal on overview popstate'
);

// 5. Must call logout and navigate to /login with { replace: true } on confirmLogout
const confirmLogoutMatch = content.match(/const confirmLogout = \(\) => \{([\s\S]*?)\};/);
assert(confirmLogoutMatch, 'Must define confirmLogout function');
assert(
  confirmLogoutMatch[1].includes('logout()') && confirmLogoutMatch[1].includes('replace: true'),
  'confirmLogout must call logout() and navigate with { replace: true }'
);

console.log('Task 2 Admin Navigation Guard Contract Test Passed!');
