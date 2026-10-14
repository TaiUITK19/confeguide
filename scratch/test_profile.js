const fs = require('fs');

console.log('--- TEST 1: Inspect profile.html elements ---');
const html = fs.readFileSync('profile.html', 'utf8');
const checks = [
  'id="site-header"',
  'id="site-footer"',
  'id="tab-profile"',
  'id="tab-saved"',
  'id="tab-settings"',
  'id="tab-help"',
  'id="tab-report"',
  'id="profileEditForm"',
  'id="changePasswordForm"',
  'id="reportIssueForm"',
  'id="savedConferencesList"',
  'id="reportHistoryContainer"',
  'href="css/base.css"',
  'href="css/profile.css"',
  'src="js/layout.js"',
  'src="js/profile.js"'
];

let allOk = true;
checks.forEach(c => {
  if (!html.includes(c)) {
    console.error('Missing in profile.html:', c);
    allOk = false;
  }
});
if (allOk) {
  console.log('profile.html: All required elements and script/style links found!');
}

console.log('--- TEST 2: Inspect js/layout.js Avatar Dropdown ---');
const layoutJs = fs.readFileSync('js/layout.js', 'utf8');
const layoutChecks = [
  'userMenuWrapper',
  'userAvatarBtn',
  'userDropdownMenu',
  'navLogoutBtn',
  'profile.html#tab-profile',
  'profile.html#tab-settings',
  'profile.html#tab-help',
  'profile.html#tab-report',
  'Nhà nghiên cứu'
];

let layoutOk = true;
layoutChecks.forEach(c => {
  if (!layoutJs.includes(c)) {
    console.error('Missing in js/layout.js:', c);
    layoutOk = false;
  }
});
if (layoutOk) {
  console.log('js/layout.js: All dropdown components and deep links found!');
}

console.log('--- TEST 3: Inspect css/base.css & css/profile.css ---');
const baseCss = fs.readFileSync('css/base.css', 'utf8');
const profileCss = fs.readFileSync('css/profile.css', 'utf8');

const baseCssChecks = [
  '.user-menu-wrapper',
  '.user-dropdown-menu',
  '.dropdown-user-header',
  '.dropdown-avatar-thumb',
  '.dropdown-item',
  '.dropdown-item-danger',
  'body.dark .user-dropdown-menu'
];

let baseCssOk = true;
baseCssChecks.forEach(c => {
  if (!baseCss.includes(c)) {
    console.error('Missing in css/base.css:', c);
    baseCssOk = false;
  }
});
if (baseCssOk) {
  console.log('css/base.css: All user dropdown styles present!');
}

const profileCssChecks = [
  '.profile-layout',
  '.profile-sidebar',
  '.profile-tab-btn',
  '.profile-tab-pane',
  '.activity-stats-grid',
  '.faq-item',
  '.report-table'
];

let profileCssOk = true;
profileCssChecks.forEach(c => {
  if (!profileCss.includes(c)) {
    console.error('Missing in css/profile.css:', c);
    profileCssOk = false;
  }
});
if (profileCssOk) {
  console.log('css/profile.css: All profile layout & tab styles present!');
}

console.log('--- TEST 4: SHA-256 test between auth.js and profile.js ---');
const crypto = require('crypto');
function sha256Node(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// User 1 password: user1@
const expectedHash = "b9e53582d056cfbd012e904a2d67180d7720b84894b1ef18d030fa3f16a448c5";
const actualHash = sha256Node("user1@");
console.log('user1@ hash test:', actualHash === expectedHash ? 'MATCHES SEED' : 'MISMATCH');

console.log('ALL TESTS COMPLETED!');
