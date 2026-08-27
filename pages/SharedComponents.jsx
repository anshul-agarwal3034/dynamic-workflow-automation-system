// --- Shared SVGs & Icons ---
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

// Open Eye Icon (Visible state)
const EyeIcon = () => (
  <svg className="w-5 h-5 text-slate-500 hover:text-slate-700 transition-colors shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>
);

// Eye Off Icon with Diagonal Slash \ (Hidden state)
const EyeOffIcon = () => (
  <svg className="w-5 h-5 text-slate-500 hover:text-slate-700 transition-colors shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-2.06l2.36 2.36c.07-.3.11-.62.11-.96 0-1.66-1.34-3-3-3-.34 0-.66.04-.96.11z"/>
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

const SettingsIcon = () => (
  <svg className="w-4 h-4 text-slate-800 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-4 h-4 text-slate-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
          className="w-11 h-12 text-center text-lg font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
        />
      ))}
    </div>
  );
};
