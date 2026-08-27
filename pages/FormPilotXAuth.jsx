// --- Main App & Router Component ---
function FormPilotXAuthApp() {
  const { HashRouter, Routes, Route, Navigate, useNavigate } = ReactRouterDOM;

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
  const handleVerifyOtp = (targetRoute, navigate) => {
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

  const handleLogout = (navigate) => {
    setIsProfileMenuOpen(false);
    navigate('/signin');
  };

  const handleDeleteAccount = (navigate) => {
    setIsDeleteModalOpen(false);
    setIsProfileMenuOpen(false);
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

  return (
    <HashRouter>
      <div className="min-h-screen bg-gradient-to-b from-[#F0F4F8] to-slate-200 flex items-center justify-center p-4 py-8 box-border font-sans relative">
        <Routes>
          <Route
            path="/signup"
            element={
              <SignupView
                formData={formData}
                handleInputChange={handleInputChange}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                passwordFocused={passwordFocused}
                setPasswordFocused={setPasswordFocused}
              />
            }
          />
          <Route
            path="/signup/verify"
            element={
              <SignupVerifyViewWrapper
                getUserDisplayEmail={getUserDisplayEmail}
                otp={otp}
                setOtp={setOtp}
                otpError={otpError}
                setOtpError={setOtpError}
                timer={timer}
                handleResendOtp={handleResendOtp}
                handleVerifyOtp={handleVerifyOtp}
              />
            }
          />
          <Route
            path="/signin"
            element={
              <SigninView
                formData={formData}
                handleInputChange={handleInputChange}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />
            }
          />
          <Route
            path="/signin/forgot-password"
            element={
              <ForgotPasswordView
                formData={formData}
                handleInputChange={handleInputChange}
              />
            }
          />
          <Route
            path="/signin/forgot-password/verify"
            element={
              <ForgotVerifyViewWrapper
                getForgotDisplayEmail={getForgotDisplayEmail}
                otp={otp}
                setOtp={setOtp}
                otpError={otpError}
                handleVerifyOtp={handleVerifyOtp}
              />
            }
          />
          <Route
            path="/signin/forgot-password/reset"
            element={
              <ForgotResetView
                formData={formData}
                handleInputChange={handleInputChange}
                showNewPassword={showNewPassword}
                setShowNewPassword={setShowNewPassword}
                newPasswordFocused={newPasswordFocused}
                setNewPasswordFocused={setNewPasswordFocused}
              />
            }
          />
          <Route
            path="/home"
            element={
              <HomeViewWrapper
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
            }
          />
          <Route path="/forms" element={<FormsListView />} />
          <Route path="/forms/create" element={<FormCreateView />} />
          <Route path="/forms/:id" element={<FormDetailView />} />
          <Route path="/forms/:id/edit" element={<FormEditView />} />

          {/* Default and catch-all redirects */}
          <Route path="/" element={<Navigate to="/signin" replace />} />
          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

// Wrappers to inject navigate into handleVerifyOtp, handleLogout, handleDeleteAccount
const SignupVerifyViewWrapper = (props) => {
  const navigate = ReactRouterDOM.useNavigate();
  return (
    <SignupVerifyView
      {...props}
      handleVerifyOtp={(route) => props.handleVerifyOtp(route, navigate)}
    />
  );
};

const ForgotVerifyViewWrapper = (props) => {
  const navigate = ReactRouterDOM.useNavigate();
  return (
    <ForgotVerifyView
      {...props}
      handleVerifyOtp={(route) => props.handleVerifyOtp(route, navigate)}
    />
  );
};

const HomeViewWrapper = (props) => {
  const navigate = ReactRouterDOM.useNavigate();
  return (
    <HomeView
      {...props}
      handleLogout={() => props.handleLogout(navigate)}
      handleDeleteAccount={() => props.handleDeleteAccount(navigate)}
    />
  );
};
