// --- Shared SVGs & Brand Logos ---
const Logo = ({ size = "md" }) => (
  <div className="flex items-center justify-center gap-md shrink-0">
    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm">
      <span className="material-symbols-outlined">hexagon</span>
    </div>
    <div>
      <h1 className="font-display-lg text-body-lg font-black text-primary tracking-tight">FormPilotX</h1>
      <p className="font-label-sm text-label-sm text-secondary">Enterprise SaaS</p>
    </div>
  </div>
);

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

  React.useEffect(() => {
    const stored = localStorage.getItem('user_info');
    if (stored) {
      try {
        setUserData(JSON.parse(stored));
      } catch (e) {}
    }
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetch('http://127.0.0.1:8000/auth/me', {
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

  const getUserName = () => userData?.full_name || userData?.email?.split('@')[0] || 'Alex Morgan';

  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'dashboard', path: '/home' },
    { id: 'forms', label: 'Forms', icon: 'description', path: '/forms' },
    { id: 'submissions', label: 'Submissions', icon: 'inbox', path: '/submissions' },
    { id: 'analytics', label: 'Analytics', icon: 'bar_chart', path: '/home' },
    { id: 'conditions', label: 'Conditions', icon: 'rule', path: '/home' },
    { id: 'settings', label: 'Settings', icon: 'settings', path: '/home' },
  ];

  return (
    <div className="bg-platinum-bg text-on-background font-body-md min-h-screen flex w-full">
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-screen w-sidebar flex flex-col overflow-y-auto bg-surface border-r border-ash-border z-50">
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
                className={`flex items-center gap-md text-left transition-colors duration-200 rounded-lg px-md py-sm ${
                  isActive
                    ? 'bg-silver-container text-on-surface font-bold border-l-4 border-primary rounded-r-lg'
                    : 'text-secondary hover:bg-silver-container'
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
          title="Click to Logout"
          className="p-lg border-t border-ash-border flex items-center justify-between gap-md hover:bg-silver-container cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-md">
            <img
              alt={getUserName()}
              className="w-10 h-10 rounded-full object-cover border border-ash-border"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCBhkGePvp0N3hOw4EqreapdkustuydX7UneynlvruYuW5eti0ziENzkFYkbHhUB-QD26DY3WcIEJfP7NJMgvBM8_XMu-AaX2htV74ZkgEcuYRqhsZd5E7zTx3vupJwHcCJXaE_EQERoqVkaVznVeIb1ZXGxvDpwIPH0clQhZ5N9hqEI0dIokMQgmmysf_JQAi3XZhcQaXNNsM2R1MztHIzZIpG6zEo6b9JQ0ZB6dADnkQSyJgRwEvtQ"
            />
            <span className="font-label-md text-label-md text-primary font-bold">{getUserName()}</span>
          </div>
          <span className="material-symbols-outlined text-secondary text-sm hover:text-error">logout</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-sidebar flex flex-col min-h-screen min-w-0">
        {/* TopNavBar */}
        <header className="sticky top-0 z-40 w-full flex items-center justify-between h-16 px-lg bg-surface border-b border-ash-border">
          <div className="flex items-center gap-md">
            <span className="font-headline-md text-headline-md font-bold text-primary">FormPilotX</span>
            <div className="h-6 w-px bg-ash-border mx-sm"></div>
            <nav className="hidden md:flex gap-md">
              <a className="text-secondary font-label-md text-label-md hover:text-primary transition-colors" href="#/home">Workspaces</a>
            </nav>
          </div>

          <div className="flex items-center gap-lg">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-secondary text-sm">search</span>
              <input
                type="text"
                placeholder="Search forms, data..."
                value={searchVal}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-xl pr-md py-sm bg-surface rounded-lg border border-ash-border focus:border-charcoal-dark focus:ring-4 focus:ring-silver-container transition-shadow outline-none text-body-sm w-64 text-primary"
              />
            </div>

            <button className="text-secondary hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>

            <button
              onClick={() => navigate('/forms/create')}
              className="bg-charcoal-dark text-on-primary font-label-md text-label-md px-md py-sm rounded-lg hover:opacity-90 transition-opacity flex items-center gap-sm shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Create Form
            </button>
          </div>
        </header>

        {/* Dynamic Page Canvas */}
        <div className="p-xl max-w-max-width w-full mx-auto flex-1 flex flex-col gap-xl">
          {children}
        </div>
      </main>
    </div>
  );
};
