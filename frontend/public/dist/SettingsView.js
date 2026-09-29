(function() {
// SettingsView.jsx - Atelier Obsidian 2-Tab Settings Engine with Full Localization
const SettingsView = () => {
  const {
    lang
  } = typeof useLanguage === 'function' ? useLanguage() : {
    lang: 'en'
  };
  const t = path => window.t ? window.t(path) : path;
  const [activeTab, setActiveTab] = React.useState('profile');
  const [settings, setSettings] = React.useState(() => {
    const saved = localStorage.getItem('formpilotx_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse formpilotx_settings', e);
      }
    }
    let userObj = {};
    try {
      userObj = JSON.parse(localStorage.getItem('user_info') || '{}');
    } catch (e) {}
    return {
      fullName: localStorage.getItem('user_name') || userObj?.full_name || "Admin Tester",
      email: localStorage.getItem('user_email') || userObj?.email || "admin@formpilotx.internal",
      language: localStorage.getItem('formpilotx_lang') || "en",
      timezone: "Asia/Kolkata",
      retentionDays: "indefinite"
    };
  });
  const [passwords, setPasswords] = React.useState({
    current: '',
    next: '',
    confirm: ''
  });
  const [savedToast, setSavedToast] = React.useState(false);
  const [passwordMsg, setPasswordMsg] = React.useState({
    type: '',
    text: ''
  });

  // Keep internal state language in sync if updated elsewhere
  React.useEffect(() => {
    const handleLangChange = e => {
      const newLang = e.detail || localStorage.getItem('formpilotx_lang') || 'en';
      setSettings(prev => ({
        ...prev,
        language: newLang
      }));
    };
    window.addEventListener('formpilotx_lang_change', handleLangChange);
    window.addEventListener('languagechange', handleLangChange);
    return () => {
      window.removeEventListener('formpilotx_lang_change', handleLangChange);
      window.removeEventListener('languagechange', handleLangChange);
    };
  }, []);
  const handleSaveSettings = () => {
    localStorage.setItem('formpilotx_settings', JSON.stringify(settings));
    if (settings.language) {
      localStorage.setItem('formpilotx_lang', settings.language);
      if (typeof window.setAppLanguage === 'function') {
        window.setAppLanguage(settings.language);
      } else {
        window.dispatchEvent(new CustomEvent('formpilotx_lang_change', {
          detail: settings.language
        }));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('languagechange', {
          detail: settings.language
        }));
      }
    }
    if (settings.fullName) {
      localStorage.setItem('user_name', settings.fullName);
      try {
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        userInfo.full_name = settings.fullName;
        userInfo.email = settings.email;
        localStorage.setItem('user_info', JSON.stringify(userInfo));
      } catch (e) {}
    }
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
    }, 2000);
  };
  const handleUpdatePassword = e => {
    if (e && e.preventDefault) e.preventDefault();
    setPasswordMsg({
      type: '',
      text: ''
    });
    if (!passwords.current) {
      setPasswordMsg({
        type: 'error',
        text: 'Please enter your current password.'
      });
      return;
    }
    if (!passwords.next) {
      setPasswordMsg({
        type: 'error',
        text: 'Please enter a new password.'
      });
      return;
    }
    if (passwords.next.length < 8) {
      setPasswordMsg({
        type: 'error',
        text: 'New password must be at least 8 characters long.'
      });
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordMsg({
        type: 'error',
        text: t('settings.passwordMismatch')
      });
      return;
    }
    setPasswordMsg({
      type: 'success',
      text: t('settings.passwordUpdated')
    });
    setPasswords({
      current: '',
      next: '',
      confirm: ''
    });
    setTimeout(() => {
      setPasswordMsg({
        type: '',
        text: ''
      });
    }, 3000);
  };
  const handleLogoutAllDevices = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('pending_user_email');
    localStorage.removeItem('pending_forgot_email');
    localStorage.clear();
    if (typeof navigate === 'function') {
      navigate('/login');
    } else {
      window.location.hash = '#/login';
    }
  };
  const languageOptions = [{
    code: 'en',
    label: 'English',
    native: 'English'
  }, {
    code: 'hi',
    label: 'Hindi',
    native: 'हिन्दी'
  }, {
    code: 'bn',
    label: 'Bengali',
    native: 'বাংলা'
  }, {
    code: 'ta',
    label: 'Tamil',
    native: 'தமிழ்'
  }, {
    code: 'te',
    label: 'Telugu',
    native: 'తెలుగు'
  }];
  return /*#__PURE__*/React.createElement(SaaSAppShell, {
    activeTab: "settings"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6 w-full pb-12"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2D35] pb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-[#E2B858] inline-block shadow-[0_0_8px_#E2B858]"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold uppercase tracking-wider text-[#E2B858]"
  }, t('settings.eyebrow'))), /*#__PURE__*/React.createElement("h1", {
    className: "text-2xl font-bold tracking-tight text-[#F5F3EF]"
  }, t('settings.title')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089]"
  }, t('settings.subtitle'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveSettings,
    className: "bg-[#E2B858] hover:bg-[#d4ab4d] text-[#121316] font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer text-xs"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-sm"
  }, savedToast ? 'check_circle' : 'save'), /*#__PURE__*/React.createElement("span", null, savedToast ? t('settings.savedBtn') : t('settings.saveBtn'))))), /*#__PURE__*/React.createElement("div", {
    className: "p-1 bg-[#1F2228] rounded-xl flex gap-1 mb-4 text-xs sm:text-sm"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveTab('profile'),
    className: `flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'profile' ? 'bg-[#E2B858]/15 border border-[#E2B858]/40 text-[#E2B858] shadow-sm' : 'text-[#949089] hover:text-[#F5F3EF]'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-base"
  }, "person"), /*#__PURE__*/React.createElement("span", null, t('settings.tabProfile'))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveTab('preferences'),
    className: `flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'preferences' ? 'bg-[#E2B858]/15 border border-[#E2B858]/40 text-[#E2B858] shadow-sm' : 'text-[#949089] hover:text-[#F5F3EF]'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-base"
  }, "tune"), /*#__PURE__*/React.createElement("span", null, t('settings.tabPreferences')))), activeTab === 'profile' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3.5 sm:p-6 rounded-xl bg-[#1A1D24] border border-[#2A2D35] mb-4 space-y-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 border-b border-[#2A2D35] pb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-xl bg-[#20232B] border border-[#2A2D35] flex items-center justify-center text-[#E2B858]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-lg"
  }, "badge")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-sm font-bold text-[#F5F3EF]"
  }, t('settings.personalInfoTitle')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089]"
  }, t('settings.personalInfoDesc')))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4 pt-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-[#949089]"
  }, t('settings.labelFullName')), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: settings.fullName,
    onChange: e => setSettings({
      ...settings,
      fullName: e.target.value
    }),
    placeholder: "e.g. Admin Tester",
    className: "w-full h-10 sm:h-11 px-3 bg-[#121316] border border-[#2A2D35] focus:border-[#E2B858] rounded-xl text-xs sm:text-sm text-[#F5F3EF] placeholder-[#949089]/40 outline-none transition-colors"
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-[#949089]"
  }, t('settings.labelEmail')), /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: settings.email,
    onChange: e => setSettings({
      ...settings,
      email: e.target.value
    }),
    placeholder: "e.g. admin@formpilotx.internal",
    className: "w-full h-10 sm:h-11 px-3 bg-[#121316] border border-[#2A2D35] focus:border-[#E2B858] rounded-xl text-xs sm:text-sm text-[#F5F3EF] placeholder-[#949089]/40 outline-none transition-colors"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "p-3.5 sm:p-6 rounded-xl bg-[#1A1D24] border border-[#2A2D35] mb-4 space-y-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 border-b border-[#2A2D35] pb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-xl bg-[#20232B] border border-[#2A2D35] flex items-center justify-center text-[#E2B858]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-lg"
  }, "lock")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-sm font-bold text-[#F5F3EF]"
  }, t('settings.securityTitle')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089]"
  }, t('settings.securityDesc')))), passwordMsg.text && /*#__PURE__*/React.createElement("div", {
    className: `p-3 rounded-xl text-xs flex items-center gap-2 ${passwordMsg.type === 'error' ? 'bg-red-500/10 border border-red-500/25 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-sm"
  }, passwordMsg.type === 'error' ? 'error' : 'check_circle'), /*#__PURE__*/React.createElement("span", null, passwordMsg.text)), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-4 pt-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-[#949089]"
  }, t('settings.labelCurrentPassword')), /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: passwords.current,
    onChange: e => setPasswords({
      ...passwords,
      current: e.target.value
    }),
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    className: "w-full h-10 sm:h-11 px-3 bg-[#121316] border border-[#2A2D35] focus:border-[#E2B858] rounded-xl text-xs sm:text-sm text-[#F5F3EF] placeholder-[#949089]/40 outline-none transition-colors"
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-[#949089]"
  }, t('settings.labelNewPassword')), /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: passwords.next,
    onChange: e => setPasswords({
      ...passwords,
      next: e.target.value
    }),
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    className: "w-full h-10 sm:h-11 px-3 bg-[#121316] border border-[#2A2D35] focus:border-[#E2B858] rounded-xl text-xs sm:text-sm text-[#F5F3EF] placeholder-[#949089]/40 outline-none transition-colors"
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-[#949089]"
  }, t('settings.labelConfirmPassword')), /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: passwords.confirm,
    onChange: e => setPasswords({
      ...passwords,
      confirm: e.target.value
    }),
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    className: "w-full h-10 sm:h-11 px-3 bg-[#121316] border border-[#2A2D35] focus:border-[#E2B858] rounded-xl text-xs sm:text-sm text-[#F5F3EF] placeholder-[#949089]/40 outline-none transition-colors"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleUpdatePassword,
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] hover:border-[#E2B858]/40 font-semibold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-sm"
  }, "vpn_key"), /*#__PURE__*/React.createElement("span", null, t('settings.updatePasswordBtn'))))), /*#__PURE__*/React.createElement("div", {
    className: "p-3.5 sm:p-6 rounded-xl bg-[#1A1D24] border border-[#2A2D35] mb-4 space-y-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 border-b border-[#2A2D35] pb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-xl bg-[#20232B] border border-[#2A2D35] flex items-center justify-center text-[#E2B858]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-lg"
  }, "devices")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-sm font-bold text-[#F5F3EF]"
  }, t('settings.sessionTitle')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089]"
  }, t('settings.sessionDesc')))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121316] border border-[#2A2D35] p-4 rounded-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "relative flex h-2.5 w-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
  }), /*#__PURE__*/React.createElement("span", {
    className: "relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-emerald-400"
  }, t('settings.sessionActiveBadge'))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-[#949089]"
  }, "Connected securely with persistent token authentication.")), /*#__PURE__*/React.createElement("button", {
    onClick: handleLogoutAllDevices,
    className: "px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-sm"
  }, "logout"), /*#__PURE__*/React.createElement("span", null, t('settings.logoutAllBtn')))))), activeTab === 'preferences' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3.5 sm:p-6 rounded-xl bg-[#1A1D24] border border-[#2A2D35] mb-4 space-y-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 border-b border-[#2A2D35] pb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-xl bg-[#20232B] border border-[#2A2D35] flex items-center justify-center text-[#E2B858]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-lg"
  }, "language")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-sm font-bold text-[#F5F3EF]"
  }, t('settings.langTitle')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089]"
  }, t('settings.langDesc')))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-md space-y-1.5 pt-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-[#949089]"
  }, t('settings.langSelectLabel')), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("select", {
    value: settings.language,
    onChange: e => {
      const newLang = e.target.value;
      setSettings(prev => ({
        ...prev,
        language: newLang
      }));
      localStorage.setItem('formpilotx_lang', newLang);
      if (typeof window.setAppLanguage === 'function') {
        window.setAppLanguage(newLang);
      } else {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('languagechange', {
          detail: newLang
        }));
        window.dispatchEvent(new CustomEvent('formpilotx_lang_change', {
          detail: newLang
        }));
      }
    },
    className: "w-full h-10 sm:h-11 px-3 bg-[#121316] border border-[#2A2D35] focus:border-[#E2B858] rounded-xl text-xs sm:text-sm text-[#F5F3EF] outline-none transition-colors appearance-none cursor-pointer pr-10"
  }, languageOptions.map(langOpt => /*#__PURE__*/React.createElement("option", {
    key: langOpt.code,
    value: langOpt.code,
    className: "bg-[#16181D] text-[#F5F3EF]"
  }, langOpt.native, " (", langOpt.label, ")"))), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#949089] pointer-events-none text-sm"
  }, "arrow_drop_down")), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-[#949089]/80 pt-1"
  }, t('settings.langNotice')))), /*#__PURE__*/React.createElement("div", {
    className: "p-3.5 sm:p-6 rounded-xl bg-[#1A1D24] border border-[#2A2D35] mb-4 space-y-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 border-b border-[#2A2D35] pb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-xl bg-[#20232B] border border-[#2A2D35] flex items-center justify-center text-[#E2B858]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-lg"
  }, "schedule")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-sm font-bold text-[#F5F3EF]"
  }, t('settings.timezoneTitle')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089]"
  }, t('settings.timezoneDesc')))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-md space-y-1.5 pt-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-[#949089]"
  }, t('settings.timezoneSelectLabel')), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("select", {
    value: settings.timezone,
    onChange: e => setSettings({
      ...settings,
      timezone: e.target.value
    }),
    className: "w-full h-10 sm:h-11 px-3 bg-[#121316] border border-[#2A2D35] focus:border-[#E2B858] rounded-xl text-xs sm:text-sm text-[#F5F3EF] outline-none transition-colors appearance-none cursor-pointer pr-10"
  }, /*#__PURE__*/React.createElement("option", {
    value: "Asia/Kolkata",
    className: "bg-[#16181D] text-[#F5F3EF]"
  }, "Asia/Kolkata (IST)"), /*#__PURE__*/React.createElement("option", {
    value: "UTC",
    className: "bg-[#16181D] text-[#F5F3EF]"
  }, "UTC")), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#949089] pointer-events-none text-sm"
  }, "arrow_drop_down")))), /*#__PURE__*/React.createElement("div", {
    className: "p-3.5 sm:p-6 rounded-xl bg-[#1A1D24] border border-[#2A2D35] mb-4 space-y-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 border-b border-[#2A2D35] pb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-xl bg-[#20232B] border border-[#2A2D35] flex items-center justify-center text-[#E2B858]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-lg"
  }, "history")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-sm font-bold text-[#F5F3EF]"
  }, t('settings.retentionTitle')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089]"
  }, t('settings.retentionDesc')))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-md space-y-1.5 pt-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-[#949089]"
  }, t('settings.retentionSelectLabel')), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("select", {
    value: settings.retentionDays,
    onChange: e => setSettings({
      ...settings,
      retentionDays: e.target.value
    }),
    className: "w-full h-10 sm:h-11 px-3 bg-[#121316] border border-[#2A2D35] focus:border-[#E2B858] rounded-xl text-xs sm:text-sm text-[#F5F3EF] outline-none transition-colors appearance-none cursor-pointer pr-10"
  }, /*#__PURE__*/React.createElement("option", {
    value: "indefinite",
    className: "bg-[#16181D] text-[#F5F3EF]"
  }, t('settings.retentionIndefinite')), /*#__PURE__*/React.createElement("option", {
    value: "30",
    className: "bg-[#16181D] text-[#F5F3EF]"
  }, t('settings.retention30')), /*#__PURE__*/React.createElement("option", {
    value: "90",
    className: "bg-[#16181D] text-[#F5F3EF]"
  }, t('settings.retention90')), /*#__PURE__*/React.createElement("option", {
    value: "180",
    className: "bg-[#16181D] text-[#F5F3EF]"
  }, t('settings.retention180')), /*#__PURE__*/React.createElement("option", {
    value: "365",
    className: "bg-[#16181D] text-[#F5F3EF]"
  }, t('settings.retention365'))), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#949089] pointer-events-none text-sm"
  }, "arrow_drop_down")))))));
};
window.SettingsView = SettingsView;
  if (typeof SettingsView !== 'undefined') window.SettingsView = SettingsView;
})();
