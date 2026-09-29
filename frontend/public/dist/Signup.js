(function() {
const SignupView = () => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    terms: false
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [signupError, setSignupError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const handleInputChange = e => {
    const {
      name,
      value,
      type,
      checked
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  const getPasswordStrength = pass => {
    if (!pass) return {
      score: 0,
      label: 'None',
      color: 'bg-ash-border'
    };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[!@#$%^&*()]/.test(pass)) score++;
    if (score <= 1) return {
      score: 1,
      label: 'Weak',
      color: 'bg-error'
    };
    if (score === 2) return {
      score: 2,
      label: 'Fair',
      color: 'bg-warm-amber'
    };
    if (score === 3) return {
      score: 3,
      label: 'Good',
      color: 'bg-cyan-accent'
    };
    return {
      score: 4,
      label: 'Strong',
      color: 'bg-mint-emerald'
    };
  };
  const strength = getPasswordStrength(formData.password);
  const handleSubmit = async e => {
    e.preventDefault();
    setSignupError('');
    if (!formData.terms) {
      setSignupError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }
    setLoading(true);
    try {
      const apiBase = typeof window !== 'undefined' && window.API_BASE_URL || '';
      // 1. Create account via POST /auth/signup
      const response = await fetch(`${apiBase}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: formData.name,
          email: formData.email,
          password: formData.password
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setSignupError(data.detail || 'Signup failed. Please try again.');
        setLoading(false);
        return;
      }

      // 2. Direct Auto-Login via POST /auth/signin
      const loginResponse = await fetch(`${apiBase}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });
      const loginData = await loginResponse.json();
      if (loginResponse.ok && loginData.access_token) {
        localStorage.setItem('auth_token', loginData.access_token);
        localStorage.setItem('user_info', JSON.stringify({
          email: formData.email,
          full_name: formData.name
        }));
        // Direct auto-login redirect straight to Dashboard Overview (#/home)
        navigate('/home');
      } else {
        // Fallback to signin if auto-login returns error
        navigate('/signin');
      }
    } catch (err) {
      setSignupError('Unable to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "w-full min-h-screen bg-platinum-bg text-on-surface font-body-md antialiased flex flex-col justify-center items-center p-md lg:p-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-5xl bg-surface-container-lowest rounded-xl border border-ash-border shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row my-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:flex flex-col justify-between w-1/2 p-2xl bg-charcoal-dark text-on-primary relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 opacity-10 pointer-events-none",
    style: {
      backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.5) 0%, transparent 50%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-sm mb-3xl"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-[32px] text-surface-bright",
    style: {
      fontVariationSettings: "'FILL' 1"
    }
  }, "hexagon"), /*#__PURE__*/React.createElement("span", {
    className: "font-headline-md text-headline-md font-black tracking-tight text-surface-bright"
  }, "FormPilot", /*#__PURE__*/React.createElement("span", {
    className: "text-[#DFB257]"
  }, "X"))), /*#__PURE__*/React.createElement("h2", {
    className: "font-display-lg text-display-lg text-surface-bright mb-lg font-black leading-tight"
  }, "Enterprise Data Collection, Perfected."), /*#__PURE__*/React.createElement("p", {
    className: "font-body-lg text-body-lg text-secondary-fixed-dim"
  }, "Deploy complex logic, gather actionable insights, and integrate seamlessly with your existing infrastructure. All within a secure, high-performance environment.")), /*#__PURE__*/React.createElement("div", {
    className: "relative z-10 font-body-sm text-body-sm text-secondary-fixed-dim"
  }, "\xA9 2026 FormPilotX Enterprise. All rights reserved.")), /*#__PURE__*/React.createElement("div", {
    className: "w-full md:w-1/2 p-lg md:p-2xl flex flex-col justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "md:hidden flex items-center justify-center gap-sm mb-xl"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-[28px] text-primary",
    style: {
      fontVariationSettings: "'FILL' 1"
    }
  }, "hexagon"), /*#__PURE__*/React.createElement("span", {
    className: "font-headline-md text-headline-md font-black tracking-tight text-on-surface"
  }, "FormPilot", /*#__PURE__*/React.createElement("span", {
    className: "text-[#DFB257]"
  }, "X"))), /*#__PURE__*/React.createElement("div", {
    className: "mb-xl"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "font-headline-lg text-headline-lg text-on-surface mb-sm font-bold"
  }, "Create Account"), /*#__PURE__*/React.createElement("p", {
    className: "font-body-md text-body-md text-secondary"
  }, "Join FormPilotX to streamline your enterprise data workflows.")), signupError && /*#__PURE__*/React.createElement("div", {
    className: "mb-md p-md bg-error-container/40 border border-error/20 rounded-lg text-body-sm text-error font-medium flex items-center gap-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-sm"
  }, "error"), /*#__PURE__*/React.createElement("span", null, signupError)), /*#__PURE__*/React.createElement("form", {
    className: "space-y-md",
    onSubmit: handleSubmit
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block font-label-md text-label-md text-on-surface mb-sm font-semibold",
    htmlFor: "fullName"
  }, "Full Name"), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    id: "fullName",
    name: "name",
    type: "text",
    required: true,
    placeholder: "Jane Doe",
    value: formData.name,
    onChange: handleInputChange,
    className: "w-full bg-surface-container-lowest border border-ash-border rounded-lg py-md px-lg pl-3xl font-body-md text-body-md text-on-surface focus:outline-none focus:border-charcoal-dark focus:ring-4 focus:ring-silver-container transition-all"
  }), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-secondary"
  }, "person"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block font-label-md text-label-md text-on-surface mb-sm font-semibold",
    htmlFor: "workEmail"
  }, "Work Email"), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    id: "workEmail",
    name: "email",
    type: "email",
    required: true,
    placeholder: "jane.doe@company.com",
    value: formData.email,
    onChange: handleInputChange,
    className: "w-full bg-surface-container-lowest border border-ash-border rounded-lg py-md px-lg pl-3xl font-body-md text-body-md text-on-surface focus:outline-none focus:border-charcoal-dark focus:ring-4 focus:ring-silver-container transition-all"
  }), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-secondary"
  }, "mail"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block font-label-md text-label-md text-on-surface mb-sm font-semibold",
    htmlFor: "password"
  }, "Password"), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    id: "password",
    name: "password",
    type: showPassword ? "text" : "password",
    required: true,
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    value: formData.password,
    onChange: handleInputChange,
    className: "w-full bg-surface-container-lowest border border-ash-border rounded-lg py-md px-lg pl-3xl pr-3xl font-body-md text-body-md text-on-surface focus:outline-none focus:border-charcoal-dark focus:ring-4 focus:ring-silver-container transition-all"
  }), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-secondary"
  }, "lock"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowPassword(!showPassword),
    className: "absolute right-md top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface focus:outline-none"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, showPassword ? "visibility_off" : "visibility"))), formData.password && /*#__PURE__*/React.createElement("div", {
    className: "mt-sm space-y-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-1 w-1/4 rounded-full transition-all ${strength.score >= 1 ? strength.color : 'bg-ash-border'}`
  }), /*#__PURE__*/React.createElement("div", {
    className: `h-1 w-1/4 rounded-full transition-all ${strength.score >= 2 ? strength.color : 'bg-ash-border'}`
  }), /*#__PURE__*/React.createElement("div", {
    className: `h-1 w-1/4 rounded-full transition-all ${strength.score >= 3 ? strength.color : 'bg-ash-border'}`
  }), /*#__PURE__*/React.createElement("div", {
    className: `h-1 w-1/4 rounded-full transition-all ${strength.score >= 4 ? strength.color : 'bg-ash-border'}`
  })), /*#__PURE__*/React.createElement("p", {
    className: "font-label-sm text-label-sm text-secondary"
  }, "Password strength: ", /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-on-surface"
  }, strength.label)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-sm pt-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center h-5"
  }, /*#__PURE__*/React.createElement("input", {
    id: "terms",
    name: "terms",
    type: "checkbox",
    checked: formData.terms,
    onChange: handleInputChange,
    className: "w-4 h-4 border-ash-border rounded bg-surface-container-lowest focus:ring-charcoal-dark focus:ring-2 text-charcoal-dark"
  })), /*#__PURE__*/React.createElement("label", {
    className: "font-body-sm text-body-sm text-secondary cursor-pointer",
    htmlFor: "terms"
  }, "I agree to the ", /*#__PURE__*/React.createElement("a", {
    className: "text-on-surface font-semibold underline hover:text-charcoal-muted",
    href: "#/terms"
  }, "Terms of Service"), " and ", /*#__PURE__*/React.createElement("a", {
    className: "text-on-surface font-semibold underline hover:text-charcoal-muted",
    href: "#/privacy"
  }, "Privacy Policy"), ".")), /*#__PURE__*/React.createElement("div", {
    className: "pt-md"
  }, /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: loading,
    className: "w-full bg-charcoal-dark text-on-primary font-label-md text-label-md py-md px-lg rounded-lg hover:bg-tertiary-container transition-colors duration-200 disabled:opacity-50 font-bold"
  }, loading ? 'Creating Account & Logging In...' : 'Create Account'))), /*#__PURE__*/React.createElement("div", {
    className: "mt-xl text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-body-sm text-body-sm text-secondary"
  }, "Already have an account? ", /*#__PURE__*/React.createElement("button", {
    onClick: () => navigate('/signin'),
    className: "text-on-surface font-semibold underline hover:text-charcoal-muted font-bold"
  }, "Log in"))))));
};
  if (typeof SignupView !== 'undefined') window.SignupView = SignupView;
})();
