// --- Main App Entry Component ---
function FormPilotXAuthApp() {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    forgotEmail: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [showPassword, setShowPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);

  const [passwordFocused, setPasswordFocused] = React.useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = React.useState(false);

  // OTP State & Validation
  const [otp, setOtp] = React.useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = React.useState('');
  const [timer, setTimer] = React.useState(45);

  // Profile Dropdown & Modal States
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [theme, setTheme] = React.useState('Light');
  const [language, setLanguage] = React.useState('English');

  const handleResendOtp = () => {
    setTimer(45);
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Strict OTP Verification (Must match 123456)
  const handleVerifyOtp = (targetRoute) => {
    const enteredOtp = otp.join('');
    if (enteredOtp === '123456') {
      setOtpError('');
      setOtp(['', '', '', '', '', '']);
      navigate(targetRoute);
    } else {
      setOtpError('Invalid OTP code.');
    }
  };

  const getUserDisplayName = () => {
    return formData.name.trim() || 'Alex Morgan';
  };

  const getUserDisplayEmail = () => {
    return formData.email.trim() || 'alex@example.com';
  };

  const getForgotDisplayEmail = () => {
    return formData.forgotEmail.trim() || 'alex@example.com';
  };

  const getInitialChar = () => {
    return getUserDisplayName().charAt(0).toUpperCase() || 'A';
  };

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    localStorage.removeItem('auth_token');
    navigate('/signin');
  };

  const handleDeleteAccount = () => {
    setIsDeleteModalOpen(false);
    setIsProfileMenuOpen(false);
    localStorage.removeItem('auth_token');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      forgotEmail: '',
      newPassword: '',
      confirmNewPassword: '',
    });
    navigate('/signin');
  };

  // Routes declaration array mapping paths to components
  const routes = [
    {
      path: '/signup',
      component: (props) => (
        <SignupView
          {...props}
          formData={formData}
          handleInputChange={handleInputChange}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          passwordFocused={passwordFocused}
          setPasswordFocused={setPasswordFocused}
        />
      ),
    },
    {
      path: '/signup/verify',
      component: (props) => (
        <SignupVerifyView
          {...props}
          getUserDisplayEmail={getUserDisplayEmail}
          otp={otp}
          setOtp={setOtp}
          otpError={otpError}
          setOtpError={setOtpError}
          timer={timer}
          handleResendOtp={handleResendOtp}
          handleVerifyOtp={handleVerifyOtp}
        />
      ),
    },
    {
      path: '/signin',
      component: (props) => (
        <SigninView
          {...props}
          formData={formData}
          handleInputChange={handleInputChange}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
        />
      ),
    },
    {
      path: '/signin/forgot-password',
      component: (props) => (
        <ForgotPasswordView
          {...props}
          formData={formData}
          handleInputChange={handleInputChange}
        />
      ),
    },
    {
      path: '/signin/forgot-password/verify',
      component: (props) => (
        <ForgotVerifyView
          {...props}
          getForgotDisplayEmail={getForgotDisplayEmail}
          otp={otp}
          setOtp={setOtp}
          otpError={otpError}
          handleVerifyOtp={handleVerifyOtp}
        />
      ),
    },
    {
      path: '/signin/forgot-password/reset',
      component: (props) => (
        <ForgotResetView
          {...props}
          formData={formData}
          handleInputChange={handleInputChange}
          showNewPassword={showNewPassword}
          setShowNewPassword={setShowNewPassword}
          newPasswordFocused={newPasswordFocused}
          setNewPasswordFocused={setNewPasswordFocused}
        />
      ),
    },
    {
      path: '/home',
      component: (props) => (
        <HomeView
          {...props}
          getUserDisplayName={getUserDisplayName}
          getUserDisplayEmail={getUserDisplayEmail}
          getInitialChar={getInitialChar}
          isProfileMenuOpen={isProfileMenuOpen}
          setIsProfileMenuOpen={setIsProfileMenuOpen}
          isDeleteModalOpen={isDeleteModalOpen}
          setIsDeleteModalOpen={setIsDeleteModalOpen}
          theme={theme}
          setTheme={setTheme}
          language={language}
          setLanguage={setLanguage}
          handleLogout={handleLogout}
          handleDeleteAccount={handleDeleteAccount}
        />
      ),
    },
    { path: '/forms', component: FormsListView },
    { path: '/forms/create', component: FormCreateView },
    { path: '/forms/:id', component: FormDetailView },
    { path: '/forms/:id/edit', component: FormEditView },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F4F8] to-slate-200 flex items-center justify-center p-4 py-8 box-border font-sans relative">
      <Router routes={routes} />

      {/* ⚠️ Delete Account Modal Confirmation */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-left space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center font-bold text-lg">
                ⚠️
              </div>
              <h3 className="font-bold text-slate-900 text-base">Delete your account?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action cannot be undone. Your account and associated data may be permanently deleted.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
