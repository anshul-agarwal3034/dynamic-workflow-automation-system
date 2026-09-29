const fs = require('fs');
const Babel = require('./babel.min.js');

const i18nCode = fs.readFileSync('frontend/src/utils/i18n.js', 'utf8');

const transformed = Babel.transform(i18nCode, {
  presets: ['react', 'es2015']
});

const m = { exports: {} };
const fn = new Function('module', 'exports', 'window', transformed.code);
const fakeWindow = {};
fn(m, m.exports, fakeWindow);

const { LANGUAGES, translations, getTranslation } = fakeWindow;

console.log('Languages count:', LANGUAGES.length);
if (LANGUAGES.length !== 5) {
  throw new Error(`Expected 5 languages, got ${LANGUAGES.length}`);
}

const expectedCodes = ['en', 'hi', 'bn', 'ta', 'te'];
const codes = LANGUAGES.map(l => l.code);
for (const code of expectedCodes) {
  if (!codes.includes(code)) {
    throw new Error(`Missing language code: ${code}`);
  }
}

const requiredKeys = [
  'nav.dashboard', 'nav.forms', 'nav.submissions', 'nav.analytics', 'nav.settings',
  'nav.newForm', 'nav.logout', 'nav.workspaces', 'nav.refresh', 'nav.searchPlaceholder',
  'dashboard.title', 'dashboard.subtitle', 'dashboard.activeForms', 'dashboard.publishedCount',
  'dashboard.liveBadge', 'dashboard.submissionsToday', 'dashboard.sinceMidnight', 'dashboard.todayBadge',
  'dashboard.avgCompletion', 'dashboard.totalResponses', 'dashboard.allTimeCollected', 'dashboard.recordedBadge',
  'dashboard.submissionsPerForm', 'dashboard.realTimeMetrics', 'dashboard.topForms', 'dashboard.viewAll',
  'dashboard.totalResponsesSub', 'dashboard.recentSubmissions', 'dashboard.recentSubmissionsSub',
  'dashboard.filterAll', 'dashboard.filterCompleted', 'dashboard.colCode', 'dashboard.colFormName',
  'dashboard.colRespondent', 'dashboard.colDuration', 'dashboard.colSubmitted', 'dashboard.colStatus',
  'dashboard.colActions', 'dashboard.statusInProgress', 'dashboard.statusCompleted', 'dashboard.anonRespondent',
  'dashboard.welcomeTitle', 'dashboard.welcomeSubtitle', 'dashboard.buildFirstForm',
  'forms.title', 'forms.subtitle', 'forms.createButton', 'forms.gridCards', 'forms.compactTable',
  'forms.allForms', 'forms.published', 'forms.drafts', 'forms.archived', 'forms.fieldsCount',
  'forms.fieldSingle', 'forms.createdOn', 'forms.formActions', 'forms.noDesc', 'forms.searchPlaceholder',
  'forms.colTitle', 'forms.colStatus', 'forms.colResponses', 'forms.colCompletion', 'forms.colCreated',
  'forms.colActions', 'forms.emptyTitle', 'forms.emptySubtitle',
  'submissions.title', 'submissions.eyebrow', 'submissions.subtitle', 'submissions.exportCsv',
  'submissions.exportJson', 'submissions.retentionPolicy', 'submissions.analyticsButton',
  'submissions.viewTable', 'submissions.viewCards', 'submissions.selectFormLabel', 'submissions.refresh',
  'submissions.searchPlaceholder', 'submissions.statusLabel', 'submissions.allStatuses',
  'submissions.completedStatus', 'submissions.inProgressStatus', 'submissions.fromLabel',
  'submissions.toLabel', 'submissions.perPage', 'submissions.noMatchingTitle', 'submissions.noMatchingSubtitle',
  'submissions.deleteSelected', 'submissions.colId', 'submissions.colRespondent', 'submissions.colSubmitted',
  'submissions.colDuration', 'submissions.colStatus', 'submissions.colActions',
  'analytics.title', 'analytics.eyebrow', 'analytics.subEyebrow', 'analytics.subtitle',
  'analytics.activeFormLabel', 'analytics.refresh', 'analytics.submissionsButton',
  'analytics.versionFilterLabel', 'analytics.allVersions', 'analytics.filterAllTime',
  'analytics.filter7Days', 'analytics.filter30Days', 'analytics.kpiTotalCompleted', 'analytics.outOf',
  'analytics.sessionStarts', 'analytics.recordedInDb', 'analytics.kpiCompletionRate',
  'analytics.noStartsYet', 'analytics.handshakeFinish', 'analytics.kpiAvgDuration',
  'analytics.secondsUnit', 'analytics.awaitingCompleted', 'analytics.measuredFromHandshake',
  'analytics.kpiDropOffSessions', 'analytics.zeroDropOffs', 'analytics.sessionsWithoutSub',
  'analytics.awaitingTitle', 'analytics.awaitingSubtitle',
  'settings.eyebrow', 'settings.title', 'settings.subtitle', 'settings.saveBtn', 'settings.savedBtn',
  'settings.tabProfile', 'settings.tabPreferences', 'settings.personalInfoTitle', 'settings.personalInfoDesc',
  'settings.labelFullName', 'settings.labelEmail', 'settings.securityTitle', 'settings.securityDesc',
  'settings.labelCurrentPassword', 'settings.labelNewPassword', 'settings.labelConfirmPassword',
  'settings.updatePasswordBtn', 'settings.passwordMismatch', 'settings.passwordUpdated',
  'settings.sessionTitle', 'settings.sessionDesc', 'settings.sessionActiveBadge', 'settings.logoutAllBtn',
  'settings.langTitle', 'settings.langDesc', 'settings.langSelectLabel', 'settings.langNotice',
  'settings.timezoneTitle', 'settings.timezoneDesc', 'settings.timezoneSelectLabel',
  'settings.retentionTitle', 'settings.retentionDesc', 'settings.retentionSelectLabel',
  'settings.retentionIndefinite', 'settings.retention30', 'settings.retention90', 'settings.retention180',
  'settings.retention365',
  'common.offlineNotice', 'common.save', 'common.cancel', 'common.delete', 'common.confirm',
  'common.loading', 'common.back', 'common.close'
];

for (const code of expectedCodes) {
  for (const key of requiredKeys) {
    const val = getTranslation(code, key);
    if (!val || val === key) {
      throw new Error(`Missing translation for key "${key}" in language "${code}"`);
    }
  }
}

console.log(`✓ All 5 languages (en, hi, bn, ta, te) have full translations for all ${requiredKeys.length} required keys!`);
