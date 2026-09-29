// --- Global i18n hooks & fallback bindings ---
const t = (typeof window !== 'undefined' && window.t) || function(k) { return k; };
const LANGUAGES = (typeof window !== 'undefined' && window.LANGUAGES) || [];

// --- Shared SVGs & Brand Logos ---
const FormPilotXLogo = ({ className = "w-8 h-8", size }) => {
  const sizeMap = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-12 h-12"
  };
  const sizeClass = size && sizeMap[size] ? sizeMap[size] : className;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={`${sizeClass} shrink-0`}
      fill="none"
    >
      {/* Golden Document Shape with Chamfered Bottom-Right Fold */}
      <path
        d="M 28 14 H 72 C 79.7 14 86 20.3 86 28 V 68 L 72 82 H 28 C 20.3 82 14 75.7 14 68 V 28 C 14 20.3 20.3 14 28 14 Z"
        fill="#DFB257"
      />
      {/* Diagonal Page Fold Cutout */}
      <path
        d="M 68 86 L 86 68 L 86 72 L 72 86 Z"
        fill="#14161B"
      />
      {/* Fold Highlight Edge (Angled Tab) */}
      <path
        d="M 66 84 L 84 66"
        stroke="#14161B"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Horizontal Content Lines (Rounded Endcaps) */}
      <rect x="30" y="32" width="38" height="8" rx="4" fill="#14161B" />
      <rect x="30" y="46" width="28" height="8" rx="4" fill="#14161B" />
      <rect x="30" y="60" width="34" height="8" rx="4" fill="#14161B" />
    </svg>
  );
};

const Logo = ({ size = "md" }) => (
  <div className="flex items-center justify-center gap-md shrink-0">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C59B27]/20 to-[#E2B858]/10 border border-[#E2B858]/30 flex items-center justify-center p-1.5 shadow-[0_0_12px_rgba(226,184,88,0.2)]">
      <FormPilotXLogo className="w-full h-full" />
    </div>
    <div>
      <h1 className="font-display-lg text-body-lg font-black text-[#F5F3EF] tracking-tight">FormPilot<span className="text-[#DFB257]">X</span></h1>
    </div>
  </div>
);

export function OfflineStatusBanner() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-[#E6A23C]/15 border-b border-[#E6A23C]/40 px-4 py-2 text-center text-xs text-[#E6A23C] flex items-center justify-center gap-2">
      <span className="material-symbols-outlined text-sm">wifi_off</span>
      <span className="font-medium">Offline Mode: Live connection lost. Running on cached assets.</span>
    </div>
  );
}

export function LanguageSwitcher({ currentLang, onLanguageChange }) {
  const langList = typeof LANGUAGES !== 'undefined' && LANGUAGES.length > 0 ? LANGUAGES : (window.LANGUAGES || []);
  return (
    <div className="flex items-center gap-1.5 bg-[#16181D] border border-[#2A2D35] px-2.5 py-1.5 rounded-xl shadow-inner text-xs">
      <span className="material-symbols-outlined text-sm text-[#E2B858]">translate</span>
      <select
        value={currentLang || (typeof window !== 'undefined' && window.currentLanguage) || 'en'}
        onChange={(e) => {
          const newCode = e.target.value;
          if (typeof window !== 'undefined') {
            window.currentLanguage = newCode;
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('formpilotx_lang', newCode);
              localStorage.setItem('formpilot_lang', newCode);
            }
            window.dispatchEvent(new CustomEvent('formpilotx_lang_change', { detail: newCode }));
          }
          if (onLanguageChange) onLanguageChange(newCode);
        }}
        className="bg-transparent text-[#F5F3EF] font-medium focus:outline-none cursor-pointer text-xs"
      >
        {langList.map((l) => (
          <option key={l.code} value={l.code} className="bg-[#16181D] text-[#F5F3EF]">
            {l.name || l.label} ({l.code.toUpperCase()})
          </option>
        ))}
      </select>
    </div>
  );
}

export function useLanguage() {
  const [lang, setLang] = React.useState(
    (typeof localStorage !== 'undefined' && (localStorage.getItem('formpilotx_lang') || localStorage.getItem('formpilot_lang'))) || (typeof window !== 'undefined' && window.currentLanguage) || 'en'
  );
  React.useEffect(() => {
    const handleLangChange = (e) => {
      setLang(e.detail || (typeof localStorage !== 'undefined' && (localStorage.getItem('formpilotx_lang') || localStorage.getItem('formpilot_lang'))) || (typeof window !== 'undefined' && window.currentLanguage) || 'en');
    };
    window.addEventListener('formpilotx_lang_change', handleLangChange);
    return () => window.removeEventListener('formpilotx_lang_change', handleLangChange);
  }, []);

  const tFunc = React.useCallback(
    (path) => {
      if (typeof window !== 'undefined' && window.t) {
        return window.t(path, lang);
      }
      return path;
    },
    [lang]
  );

  return { lang, t: tFunc };
}

// Password Requirements Checklist Component
const PasswordChecklist = ({ password, isFocused }) => {
  const rules = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "At least 1 uppercase letter (A-Z)", valid: /[A-Z]/.test(password) },
    { label: "At least 1 lowercase letter (a-z)", valid: /[a-z]/.test(password) },
    { label: "At least 1 number (0-9)", valid: /[0-9]/.test(password) },
    { label: "At least 1 special character (!@#$%^&*)", valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  const allValid = password.length > 0 && rules.every(r => r.valid);

  if (allValid || (!isFocused && password.length === 0)) {
    return null;
  }

  return (
    <div className="mt-2 p-2.5 bg-silver-container border border-ash-border rounded-lg text-[11px] space-y-1.5 transition-all">
      <p className="font-semibold text-primary text-[11px]">Password must contain:</p>
      <div className="grid grid-cols-1 gap-1">
        {rules.map((rule, idx) => (
          <div key={idx} className={`flex items-center gap-1.5 transition-colors ${rule.valid ? "text-mint-emerald font-medium" : "text-secondary"}`}>
            <span className="material-symbols-outlined text-[14px]">{rule.valid ? 'check_circle' : 'cancel'}</span>
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// OTP Input Component
const OtpInputs = ({ otp, setOtp }) => {
  const inputsRef = React.useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex justify-between gap-2 my-4">
      {otp.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => (inputsRef.current[idx] = el)}
          type="text"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          className="w-11 h-12 text-center text-lg font-bold text-primary bg-surface border border-ash-border rounded-lg focus:outline-none focus:border-charcoal-dark focus:ring-4 focus:ring-silver-container transition-all"
        />
      ))}
    </div>
  );
};

// --- FormPilotX Enterprise SaaS Dashboard App Shell ---
const SaaSAppShell = ({ children, activeTab = 'overview', searchVal = '', onSearchChange = () => {} }) => {
  const [userData, setUserData] = React.useState(null);
  const [currentLang, setCurrentLang] = React.useState(
    localStorage.getItem('formpilotx_lang') || 'en'
  );
  const [isFading, setIsFading] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLanguageChange = (newLang) => {
    if (newLang === currentLang) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrentLang(newLang);
      localStorage.setItem('formpilotx_lang', newLang);
      window.dispatchEvent(new CustomEvent('formpilotx_lang_change', { detail: newLang }));
      setIsFading(false);
    }, 120);
  };

  React.useEffect(() => {
    const onLangEvt = (e) => {
      if (e.detail && e.detail !== currentLang) {
        setCurrentLang(e.detail);
      }
    };
    window.addEventListener('formpilotx_lang_change', onLangEvt);
    return () => window.removeEventListener('formpilotx_lang_change', onLangEvt);
  }, [currentLang]);

  const t = (path) => ((typeof window !== 'undefined' && window.t) ? window.t(path, currentLang) : path);

  React.useEffect(() => {
    const stored = localStorage.getItem('user_info');
    if (stored) {
      try {
        setUserData(JSON.parse(stored));
      } catch (e) {}
    }
    const token = localStorage.getItem('auth_token');
    if (token) {
      const apiBase = (typeof window !== 'undefined' && window.API_BASE_URL) || '';
      fetch(`${apiBase}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setUserData(data);
      })
      .catch(() => {});
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('pending_user_email');
    localStorage.removeItem('pending_forgot_email');
    localStorage.clear();
    navigate('/signin');
  };

  const user = userData;
  const onLogout = handleLogout;
  const getUserName = () => userData?.full_name || userData?.email?.split('@')[0] || 'Alex Morgan';

  const navItems = [
    { id: 'overview', label: t('nav.dashboard'), icon: 'dashboard', path: '/home' },
    { id: 'forms', label: t('nav.forms'), icon: 'description', path: '/forms' },
    { id: 'submissions', label: t('nav.submissions'), icon: 'inbox', path: '/submissions' },
    { id: 'analytics', label: t('nav.analytics'), icon: 'bar_chart', path: '/analytics' },
    { id: 'settings', label: t('nav.settings'), icon: 'settings', path: '/settings' },
  ];

  return (
    <div className="bg-[#121316] text-[#F5F3EF] font-body-md min-h-screen flex w-full">
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-screen w-sidebar hidden md:flex flex-col overflow-y-auto bg-[#16181D] border-r border-[#2A2D35] z-50">
        <div className="p-lg flex items-center gap-md">
          <Logo size="md" />
        </div>

        <nav className="flex-1 px-md py-sm flex flex-col gap-sm">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-md text-left transition-colors duration-200 rounded-lg px-md py-sm cursor-pointer ${
                  isActive
                    ? 'bg-[#1A1D24] text-[#E2B858] font-bold border-l-4 border-[#E2B858] rounded-r-lg shadow-sm'
                    : 'text-[#949089] hover:bg-[#1A1D24] hover:text-[#F5F3EF]'
                } ${item.id === 'settings' ? 'mt-auto' : ''}`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div
          onClick={handleLogout}
          title={t('nav.logout')}
          className="p-lg border-t border-[#2A2D35] flex items-center justify-between gap-md hover:bg-[#1A1D24] cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-md">
            <img
              alt={getUserName()}
              className="w-10 h-10 rounded-full object-cover border border-[#2A2D35]"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCBhkGePvp0N3hOw4EqreapdkustuydX7UneynlvruYuW5eti0ziENzkFYkbHhUB-QD26DY3WcIEJfP7NJMgvBM8_XMu-AaX2htV74ZkgEcuYRqhsZd5E7zTx3vupJwHcCJXaE_EQERoqVkaVznVeIb1ZXGxvDpwIPH0clQhZ5N9hqEI0dIokMQgmmysf_JQAi3XZhcQaXNNsM2R1MztHIzZIpG6zEo6b9JQ0ZB6dADnkQSyJgRwEvtQ"
            />
            <span className="font-label-md text-label-md text-[#F5F3EF] font-bold">{getUserName()}</span>
          </div>
          <span className="material-symbols-outlined text-[#949089] text-sm hover:text-[#E05D44]" title={t('nav.logout')}>logout</span>
        </div>
      </aside>

      {/* Main Content with Smooth Fade Transitions */}
      <main className={`flex-1 md:ml-sidebar flex flex-col min-h-screen min-w-0 bg-[#121316] transition-opacity duration-150 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
        {/* Real-Time Offline Banner */}
        <OfflineStatusBanner />

        {/* TopNavBar */}
        <header className="sticky top-0 z-40 w-full flex items-center justify-between h-16 px-4 md:px-lg bg-[#16181D] border-b border-[#2A2D35]">
          <div className="flex items-center gap-md">
            <div className="flex items-center gap-2.5">
              <FormPilotXLogo className="w-7 h-7" />
              <span className="font-headline-md text-headline-md font-bold text-[#F5F3EF]">FormPilot<span className="text-[#DFB257]">X</span></span>
            </div>
          </div>

          {/* Desktop View (md:flex) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-[#949089] text-sm">search</span>
              <input
                type="text"
                placeholder={t('nav.searchPlaceholder')}
                value={searchVal}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-xl pr-md py-sm bg-[#1A1D24] rounded-lg border border-[#2A2D35] focus:border-[#E2B858] transition-colors outline-none text-xs w-64 text-[#F5F3EF] placeholder-[#949089]/60"
              />
            </div>

            {/* Language Switcher */}
            <LanguageSwitcher currentLang={currentLang} onLanguageChange={handleLanguageChange} />

            <button className="text-[#949089] hover:text-[#F5F3EF] transition-colors cursor-pointer">
              <span className="material-symbols-outlined">notifications</span>
            </button>

            <button
              onClick={() => navigate('/forms/create')}
              className="bg-gradient-to-r from-[#C59B27] to-[#E2B858] hover:brightness-110 text-[#2A1D00] font-bold text-sm h-8 px-3 rounded-lg flex items-center gap-1.5 shadow-[0_0_12px_rgba(226,184,88,0.2)] transition-all cursor-pointer leading-none"
            >
              <span className="material-symbols-outlined text-[18px] leading-none">add</span>
              {t('nav.newForm')}
            </button>
          </div>

          {/* Mobile View Toggle (md:hidden) */}
          <button 
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="md:hidden p-2 rounded-lg text-[#8E929C] hover:text-white hover:bg-[#1A1D24] transition-colors"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </header>

        {/* Mobile Slide-Out Drawer / Dropdown */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <div className="fixed top-0 right-0 w-72 h-full z-50 bg-[#1A1D24] border-l border-[#2A2D35] p-6 flex flex-col justify-between shadow-2xl md:hidden">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#2A2D35]/60 mb-6">
                  <span className="text-sm font-semibold tracking-wider text-[#E2B858] uppercase">Menu</span>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded text-[#8E929C] hover:text-white"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Navigation Section Links */}
                <nav className="flex flex-col gap-2">
                  {[
                    { hash: '#/home', label: 'Dashboard', icon: 'dashboard' },
                    { hash: '#/forms', label: 'Forms', icon: 'description' },
                    { hash: '#/submissions', label: 'Submissions', icon: 'inbox' },
                    { hash: '#/analytics', label: 'Analytics', icon: 'bar_chart' }
                  ].map(item => (
                    <a
                      key={item.hash}
                      href={item.hash}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#CBD0DC] hover:text-[#E2B858] hover:bg-[#252830] transition-colors text-sm font-medium"
                    >
                      <span className="material-symbols-outlined text-xl">{item.icon}</span>
                      {item.label}
                    </a>
                  ))}
                </nav>

                {/* Language & Settings Links */}
                <div className="mt-6 pt-4 border-t border-[#2A2D35]/60 flex flex-col gap-2">
                  <a
                    href="#/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#CBD0DC] hover:text-[#E2B858] hover:bg-[#252830] transition-colors text-sm font-medium"
                  >
                    <span className="material-symbols-outlined text-xl">settings</span>
                    Settings
                  </a>
                </div>
              </div>

              {/* User Profile & Logout Section at Bottom */}
              <div className="pt-4 border-t border-[#2A2D35]/60">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-[#E2B858]/10 text-[#E2B858] flex items-center justify-center font-bold text-sm border border-[#E2B858]/30">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{user?.full_name || 'User'}</p>
                    <p className="text-xs text-[#8E929C] truncate">{user?.email || ''}</p>
                  </div>
                </div>
                {onLogout && (
                  <button
                    onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    Sign Out
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Dynamic Page Canvas */}
        <div className="p-xl max-w-max-width w-full mx-auto flex-1 flex flex-col gap-xl bg-[#121316]">
          {children}
        </div>
      </main>
    </div>
  );
};

window.FormPilotXLogo = FormPilotXLogo;
window.Logo = Logo;
window.SaaSAppShell = SaaSAppShell;
window.OfflineStatusBanner = OfflineStatusBanner;
window.LanguageSwitcher = LanguageSwitcher;
window.useLanguage = useLanguage;

