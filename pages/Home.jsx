const HomeView = ({ setIsDeleteModalOpen: setGlobalDeleteModalOpen }) => {
  const [userData, setUserData] = React.useState(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [theme, setTheme] = React.useState('Light');
  const [language, setLanguage] = React.useState('English');

  // Auth Protection & Real User Profile Fetch
  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/signin');
      return;
    }

    // Fetch real authenticated user profile from GET /auth/me endpoint
    fetch('http://127.0.0.1:8000/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) {
        throw new Error('Token invalid or expired');
      }
      return res.json();
    })
    .then(data => {
      setUserData(data);
    })
    .catch(() => {
      const stored = localStorage.getItem('user_info');
      if (stored) {
        try {
          setUserData(JSON.parse(stored));
        } catch (e) {}
      }
    });
  }, []);

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    navigate('/signin');
  };

  const handleOpenDeleteModal = () => {
    setIsProfileMenuOpen(false);
    if (setGlobalDeleteModalOpen) {
      setGlobalDeleteModalOpen(true);
    }
  };

  const getUserDisplayName = () => {
    return userData?.full_name || userData?.name || 'Alex Morgan';
  };

  const getUserDisplayEmail = () => {
    return userData?.email || 'alex@example.com';
  };

  const getInitialChar = () => {
    return getUserDisplayName().charAt(0).toUpperCase() || 'A';
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-lg overflow-visible flex flex-col min-h-[600px] relative">
      {/* Top Navbar */}
      <header className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-white relative">
        <Logo size="md" />
        
        {/* Profile Avatar Button (Initial Only) */}
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            aria-label="User Profile Menu"
            className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-md hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          >
            {getInitialChar()}
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-4 text-slate-800 space-y-4">
              {/* 👤 Profile Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm">
                  {getInitialChar()}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900 truncate">{getUserDisplayName()}</h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full shrink-0">Active</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{getUserDisplayEmail()}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Member since August 2026</p>
                </div>
              </div>

              {/* ⚙️ Settings */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <SettingsIcon />
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Settings</span>
                </div>
                
                <div className="flex items-center justify-between text-xs py-1 px-1">
                  <span className="text-slate-700 font-medium">Theme</span>
                  <button
                    onClick={() => setTheme(theme === 'Light' ? 'Dark' : 'Light')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-semibold text-[11px] transition-colors"
                  >
                    {theme} ☀️
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs py-1 px-1">
                  <span className="text-slate-700 font-medium">App Language</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="text-[11px] bg-slate-100 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold focus:outline-none"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                  </select>
                </div>
              </div>

              {/* 🚪 Logout & Danger Zone */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100/80 rounded-lg flex items-center gap-2.5 transition-colors"
                >
                  <LogoutIcon />
                  <span>Logout</span>
                </button>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={handleOpenDeleteModal}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2.5 transition-colors"
                  >
                    <TrashIcon />
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Content */}
      <main className="p-8 flex-1 bg-slate-50">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl p-6 text-white mb-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-1">Welcome to FormPilotX, {getUserDisplayName().split(' ')[0]}!</h1>
          <p className="text-sm opacity-90">Your temporary workspace is active. Form builder tools will be enabled in Task 4.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-3">📋</div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Active Forms</h3>
            <p className="text-2xl font-extrabold text-slate-900 mb-1">12</p>
            <p className="text-xs text-slate-500">3 forms pending review</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-lg mb-3">⚡</div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Total Responses</h3>
            <p className="text-2xl font-extrabold text-slate-900 mb-1">1,420</p>
            <p className="text-xs text-emerald-600 font-medium">↑ +18% from last week</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-3">🔄</div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Automation Workflows</h3>
            <p className="text-2xl font-extrabold text-slate-900 mb-1">8 Active</p>
            <p className="text-xs text-slate-500">Webhooks connected</p>
          </div>
        </div>
      </main>
    </div>
  );
};
