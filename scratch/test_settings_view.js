// scratch/test_settings_view.js
const fs = require('fs');
const assert = require('assert');

// 1. Verify file exists
const content = fs.readFileSync('frontend/src/components/SettingsView.jsx', 'utf8');

// Check Tab 1 keys
assert(content.includes("'profile'"), "Tab 1 'profile' missing");
assert(content.includes("t('settings.eyebrow')"), "t('settings.eyebrow') missing");
assert(content.includes("t('settings.title')"), "t('settings.title') missing");
assert(content.includes("t('settings.subtitle')"), "t('settings.subtitle') missing");
assert(content.includes("t('settings.saveBtn')"), "t('settings.saveBtn') missing");
assert(content.includes("t('settings.savedBtn')"), "t('settings.savedBtn') missing");
assert(content.includes("t('settings.tabProfile')"), "t('settings.tabProfile') missing");
assert(content.includes("t('settings.tabPreferences')"), "t('settings.tabPreferences') missing");

assert(content.includes("t('settings.personalInfoTitle')"), "personalInfoTitle missing");
assert(content.includes("t('settings.personalInfoDesc')"), "personalInfoDesc missing");
assert(content.includes("t('settings.labelFullName')"), "labelFullName missing");
assert(content.includes("t('settings.labelEmail')"), "labelEmail missing");

assert(content.includes("t('settings.securityTitle')"), "securityTitle missing");
assert(content.includes("t('settings.securityDesc')"), "securityDesc missing");
assert(content.includes("t('settings.labelCurrentPassword')"), "labelCurrentPassword missing");
assert(content.includes("t('settings.labelNewPassword')"), "labelNewPassword missing");
assert(content.includes("t('settings.labelConfirmPassword')"), "labelConfirmPassword missing");
assert(content.includes("t('settings.updatePasswordBtn')"), "updatePasswordBtn missing");
assert(content.includes("t('settings.passwordMismatch')"), "passwordMismatch missing");
assert(content.includes("t('settings.passwordUpdated')"), "passwordUpdated missing");

assert(content.includes("t('settings.sessionTitle')"), "sessionTitle missing");
assert(content.includes("t('settings.sessionDesc')"), "sessionDesc missing");
assert(content.includes("t('settings.sessionActiveBadge')"), "sessionActiveBadge missing");
assert(content.includes("t('settings.logoutAllBtn')"), "logoutAllBtn missing");

// Check Tab 2 keys
assert(content.includes("'preferences'"), "Tab 2 'preferences' missing");
assert(content.includes("t('settings.langTitle')"), "langTitle missing");
assert(content.includes("t('settings.langDesc')"), "langDesc missing");
assert(content.includes("t('settings.langSelectLabel')"), "langSelectLabel missing");
assert(content.includes("t('settings.langNotice')"), "langNotice missing");

assert(content.includes("t('settings.timezoneTitle')"), "timezoneTitle missing");
assert(content.includes("t('settings.timezoneDesc')"), "timezoneDesc missing");
assert(content.includes("t('settings.timezoneSelectLabel')"), "timezoneSelectLabel missing");

assert(content.includes("t('settings.retentionTitle')"), "retentionTitle missing");
assert(content.includes("t('settings.retentionDesc')"), "retentionDesc missing");
assert(content.includes("t('settings.retentionSelectLabel')"), "retentionSelectLabel missing");
assert(content.includes("t('settings.retentionIndefinite')"), "retentionIndefinite missing");
assert(content.includes("t('settings.retention30')"), "retention30 missing");
assert(content.includes("t('settings.retention90')"), "retention90 missing");
assert(content.includes("t('settings.retention180')"), "retention180 missing");
assert(content.includes("t('settings.retention365')"), "retention365 missing");

// Check 5 languages
['en', 'hi', 'bn', 'ta', 'te'].forEach(lang => {
  assert(content.includes(`'${lang}'`), `Language code ${lang} missing in SettingsView`);
});

// Check language switch live trigger
assert(content.includes("window.setAppLanguage(newLang)"), "setAppLanguage call missing in onChange");

// Check localStorage keys
assert(content.includes("'formpilotx_settings'"), "localStorage formpilotx_settings missing");
assert(content.includes("'formpilotx_lang'"), "localStorage formpilotx_lang missing");

// Check navigation & shell
assert(content.includes("SaaSAppShell activeTab=\"settings\""), "SaaSAppShell with activeTab settings missing");

// Check index.html registration and script bump
const indexHtml = fs.readFileSync('frontend/public/index.html', 'utf8');
assert(indexHtml.includes('SettingsView.jsx?v=39'), "index.html missing SettingsView.jsx?v=39");
assert(indexHtml.includes('SimpleRouter.jsx?v=39'), "index.html version v39 missing on scripts");

// Check SharedComponents.jsx settings route
const shared = fs.readFileSync('frontend/src/components/SharedComponents.jsx', 'utf8');
assert(shared.includes("path: '/settings'"), "SharedComponents.jsx nav item path for settings not '/settings'");

// Check FormPilotXAuth.jsx routes
const auth = fs.readFileSync('frontend/src/components/FormPilotXAuth.jsx', 'utf8');
assert(auth.includes("path: '/settings'"), "FormPilotXAuth.jsx missing /settings route");

console.log("✓ All SettingsView localized keys, language switching, and integrations verified successfully!");
