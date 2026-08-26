import React, { useState, useRef, useEffect } from 'react';

// --- SVGs & Icons ---
const Logo = ({ size = "md" }) => (
  <div className="flex items-center justify-center gap-2.5 pt-0.5 shrink-0">
    <svg className={size === "lg" ? "w-10 h-10" : "w-8 h-8"} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="formpilotx-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="45%" stopColor="#0284C7" />
          <stop offset="85%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#00F0FF" />
        </linearGradient>
      </defs>
      <path d="M90 12 L12 48 L32 86 L48 64 L65 82 L90 12 Z" stroke="url(#formpilotx-gradient)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M90 12 L48 64" stroke="url(#formpilotx-gradient)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 43 L65 82" stroke="url(#formpilotx-gradient)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32 86 L74 27" stroke="url(#formpilotx-gradient)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M48 64 L32 86" stroke="url(#formpilotx-gradient)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <span className="text-xl font-extrabold tracking-tight uppercase" style={{ fontSize: size === "lg" ? "24px" : "21px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
      FORMPILOT<span className="text-cyan-500">X</span>
    </span>
  </div>
);

const EyeIcon = ({ visible }) => (
  <svg className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {visible ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a9.98 9.98 0 014.122-.963c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
    )}
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const CrossIcon = () => (
  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

// --- Password Requirements Checklist ---
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
    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200/90 rounded-lg text-[11px] space-y-1.5 transition-all">
      <p className="font-semibold text-slate-700 text-[11px]">Password must contain:</p>
      <div className="grid grid-cols-1 gap-1">
        {rules.map((rule, idx) => (
          <div key={idx} className={`flex items-center gap-1.5 transition-colors ${rule.valid ? "text-emerald-600 font-medium" : "text-slate-500"}`}>
            {rule.valid ? <CheckIcon /> : <CrossIcon />}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- OTP Input Grid ---
const OtpInputs = ({ otp, setOtp }) => {
  const inputsRef = useRef([]);

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
          className="w-11 h-12 text-center text-lg font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
        />
      ))}
    </div>
  );
};

// --- Main App Component ---
export default function FormPilotXAuth() {
  const [currentView, setCurrentView] = useState('signup');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    forgotEmail: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  // OTP input boxes start completely blank
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(45);

  // OTP Countdown Effect
  useEffect(() => {
    let interval;
    if ((currentView === 'signup-otp' || currentView === 'forgot-otp') && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [currentView, timer]);

  const handleResendOtp = () => {
    setTimer(45);
    setOtp(['', '', '', '', '', '']);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getUserDisplayName = () => {
    return formData.name.trim() || 'User';
  };

  const getUserDisplayEmail = () => {
    return formData.email.trim() || 'user@example.com';
  };

  const getForgotDisplayEmail = () => {
    return formData.forgotEmail.trim() || 'user@example.com';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F4F8] to-slate-200 flex items-center justify-center p-4 py-8 box-border font-sans">
      {currentView === 'home' ? (
        // --- 5. Authenticated Home Page Placeholder ---
        <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden flex flex-col min-h-[600px]">
          {/* Top Navbar */}
          <header className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-white">
            <Logo size="md" />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {getUserDisplayName().substring(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-700">{getUserDisplayName()}</span>
              </div>
              <button
                onClick={() => setCurrentView('login')}
                className="text-xs font-semibold text-slate-600 hover:text-red-600 transition-colors"
              >
                Logout
              </button>
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
                <div className="h-full">
                  <h3 className="font-bold text-slate-900 text-sm mb-1">Total Responses</h3>
                  <p className="text-2xl font-extrabold text-slate-900 mb-1">1,420</p>
                  <p className="text-xs text-emerald-600 font-medium">↑ +18% from last week</p>
                </div>
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
      ) : (
        // --- Auth Card Wrapper ---
        <div className="w-full max-w-[440px] bg-white rounded-[12px] border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] p-8 sm:p-10 my-auto overflow-visible shrink-0">
          
          {/* 1. Sign Up View */}
          {currentView === 'signup' && (
            <div>
              <div className="text-center mb-6">
                <Logo size="lg" />
                <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Create your account</h1>
                <p className="text-xs text-slate-500">Build smart forms. Automate complex workflows.</p>
              </div>

              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setCurrentView('signup-otp'); }}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    required
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="name@example.com"
                    required
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      placeholder="••••••••"
                      required
                      className="w-full h-10 pl-3 pr-10 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <EyeIcon visible={showPassword} />
                    </button>
                  </div>
                  <PasswordChecklist password={formData.password} isFocused={passwordFocused} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      required
                      className={`w-full h-10 pl-3 pr-10 border rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                        formData.confirmPassword && formData.password !== formData.confirmPassword
                          ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                          : "border-slate-300 focus:ring-blue-600/20 focus:border-blue-600"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <EyeIcon visible={showConfirmPassword} />
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <span className="text-[11px] text-red-600 font-normal mt-1 block">Passwords must match</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full h-10 mt-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-600/20"
                >
                  Sign Up
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-600">
                Already have an account?{" "}
                <button onClick={() => setCurrentView('login')} className="text-blue-600 font-semibold hover:underline">
                  Log In
                </button>
              </div>
            </div>
          )}

          {/* 2. Email OTP Verification View */}
          {currentView === 'signup-otp' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">Verify Your Email</h1>
              <p className="text-xs text-slate-500 mb-4">
                We sent a 6-digit code to <span className="font-semibold text-slate-700">{getUserDisplayEmail()}</span>
              </p>

              <OtpInputs otp={otp} setOtp={setOtp} />

              <div className="text-xs text-slate-500 my-4">
                {timer > 0 ? (
                  <span>Resend code in <strong className="text-slate-700">00:{timer < 10 ? `0${timer}` : timer}</strong></span>
                ) : (
                  <button onClick={handleResendOtp} className="text-blue-600 font-semibold hover:underline">
                    Resend Code
                  </button>
                )}
              </div>

              <button
                onClick={() => setCurrentView('home')}
                className="w-full h-10 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Verify & Continue
              </button>

              <div className="mt-6 text-xs">
                <button onClick={() => setCurrentView('signup')} className="text-slate-500 hover:text-slate-800 font-medium">
                  ← Back to Sign Up
                </button>
              </div>
            </div>
          )}

          {/* 3. Log In View */}
          {currentView === 'login' && (
            <div>
              <div className="text-center mb-6">
                <Logo size="lg" />
                <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Welcome back</h1>
                <p className="text-xs text-slate-500">Log in to access your dashboard</p>
              </div>

              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setCurrentView('home'); }}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="name@example.com"
                    required
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => setCurrentView('forgot-email')}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      required
                      className="w-full h-10 pl-3 pr-10 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <EyeIcon visible={showPassword} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-10 mt-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-600/20"
                >
                  Log In
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-600">
                Don't have an account?{" "}
                <button onClick={() => setCurrentView('signup')} className="text-blue-600 font-semibold hover:underline">
                  Sign Up
                </button>
              </div>
            </div>
          )}

          {/* 4. Forgot Password Flow - Step 1: Enter Email */}
          {currentView === 'forgot-email' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-1">Reset Password</h1>
                <p className="text-xs text-slate-500">Enter your registered email to receive a reset code</p>
              </div>

              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setCurrentView('forgot-otp'); }}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="forgotEmail"
                    value={formData.forgotEmail}
                    onChange={handleInputChange}
                    placeholder="name@example.com"
                    required
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-10 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send Reset Code
                </button>
              </form>

              <div className="mt-6 text-center text-xs">
                <button onClick={() => setCurrentView('login')} className="text-slate-500 hover:text-slate-800 font-medium">
                  ← Back to Log In
                </button>
              </div>
            </div>
          )}

          {/* 4. Forgot Password Flow - Step 2: Enter OTP */}
          {currentView === 'forgot-otp' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">Enter Verification Code</h1>
              <p className="text-xs text-slate-500 mb-4">
                Enter the 6-digit code sent to <span className="font-semibold text-slate-700">{getForgotDisplayEmail()}</span>
              </p>

              <OtpInputs otp={otp} setOtp={setOtp} />

              <button
                onClick={() => setCurrentView('forgot-reset')}
                className="w-full h-10 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors mt-4"
              >
                Verify Code
              </button>

              <div className="mt-6 text-xs">
                <button onClick={() => setCurrentView('forgot-email')} className="text-slate-500 hover:text-slate-800 font-medium">
                  ← Back to Email Input
                </button>
              </div>
            </div>
          )}

          {/* 4. Forgot Password Flow - Step 3: New Password */}
          {currentView === 'forgot-reset' && (
            <div>
              <div className="text-center mb-6">
                <Logo size="lg" />
                <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Set New Password</h1>
                <p className="text-xs text-slate-500">Create a secure password for your account</p>
              </div>

              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setCurrentView('login'); }}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      placeholder="••••••••"
                      required
                      className="w-full h-10 pl-3 pr-10 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <EyeIcon visible={showNewPassword} />
                    </button>
                  </div>
                  <PasswordChecklist password={formData.newPassword} isFocused={passwordFocused} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmNewPassword"
                    value={formData.confirmNewPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-10 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors mt-2"
                >
                  Reset Password & Log In
                </button>
              </form>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
