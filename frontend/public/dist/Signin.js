(function() {
const SigninView = () => {
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    remember: false
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [signinError, setSigninError] = React.useState('');
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
  const handleSubmit = async e => {
    e.preventDefault();
    setSigninError('');
    setLoading(true);
    try {
      const apiBase = typeof window !== 'undefined' && window.API_BASE_URL || '';
      const response = await fetch(`${apiBase}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setSigninError(data.detail || 'Sign in failed. Please check your credentials.');
      } else {
        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('user_info', JSON.stringify({
          email: formData.email
        }));
        navigate('/home');
      }
    } catch (err) {
      setSigninError('Unable to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "w-full min-h-screen bg-platinum-bg text-on-background font-body-md antialiased flex flex-col items-center justify-center p-md lg:p-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-[480px] p-xl bg-surface border border-ash-border rounded-xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] flex flex-col gap-lg my-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center text-center gap-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-[32px] text-primary",
    style: {
      fontVariationSettings: "'FILL' 1"
    }
  }, "hexagon"), /*#__PURE__*/React.createElement("h1", {
    className: "font-headline-lg text-headline-lg text-charcoal-dark tracking-tight font-black"
  }, "FormPilot", /*#__PURE__*/React.createElement("span", {
    className: "text-[#DFB257]"
  }, "X"))), /*#__PURE__*/React.createElement("p", {
    className: "font-body-sm text-body-sm text-secondary"
  }, "Sign in to your enterprise account.")), signinError && /*#__PURE__*/React.createElement("div", {
    className: "p-md bg-error-container/40 border border-error/20 rounded-lg text-body-sm text-error font-medium flex items-center gap-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-sm"
  }, "error"), /*#__PURE__*/React.createElement("span", null, signinError)), /*#__PURE__*/React.createElement("form", {
    className: "flex flex-col gap-md",
    onSubmit: handleSubmit
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-xs"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-label-sm text-label-sm text-charcoal-muted uppercase font-semibold",
    htmlFor: "email"
  }, "Work Email"), /*#__PURE__*/React.createElement("input", {
    id: "email",
    name: "email",
    type: "email",
    required: true,
    placeholder: "name@company.com",
    value: formData.email,
    onChange: handleInputChange,
    className: "w-full px-md py-sm bg-surface border border-ash-border rounded-DEFAULT focus:outline-none focus:border-charcoal-dark focus:ring-4 focus:ring-silver-container transition-all font-body-md text-body-md placeholder:text-outline-variant text-primary"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-label-sm text-label-sm text-charcoal-muted uppercase font-semibold",
    htmlFor: "password"
  }, "Password")), /*#__PURE__*/React.createElement("div", {
    className: "relative flex items-center"
  }, /*#__PURE__*/React.createElement("input", {
    id: "password",
    name: "password",
    type: showPassword ? "text" : "password",
    required: true,
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    value: formData.password,
    onChange: handleInputChange,
    className: "w-full px-md py-sm pr-10 bg-surface border border-ash-border rounded-DEFAULT focus:outline-none focus:border-charcoal-dark focus:ring-4 focus:ring-silver-container transition-all font-body-md text-body-md placeholder:text-outline-variant text-primary"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowPassword(!showPassword),
    className: "absolute right-3 top-0 h-full flex items-center justify-center text-secondary hover:text-on-surface focus:outline-none"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-[20px] leading-none"
  }, showPassword ? "visibility_off" : "visibility")))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-sm mt-xs"
  }, /*#__PURE__*/React.createElement("input", {
    id: "remember",
    name: "remember",
    type: "checkbox",
    checked: formData.remember,
    onChange: handleInputChange,
    className: "w-4 h-4 rounded border-ash-border text-charcoal-dark focus:ring-charcoal-dark"
  }), /*#__PURE__*/React.createElement("label", {
    className: "font-body-sm text-body-sm text-secondary cursor-pointer",
    htmlFor: "remember"
  }, "Remember me")), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: loading,
    className: "w-full py-sm bg-charcoal-dark text-on-primary font-label-md text-label-md rounded-lg mt-sm hover:bg-tertiary-container transition-colors shadow-sm disabled:opacity-50 font-bold"
  }, loading ? 'Signing In...' : 'Sign In')), /*#__PURE__*/React.createElement("p", {
    className: "text-center font-body-sm text-body-sm text-secondary mt-2"
  }, "Don't have an account? ", /*#__PURE__*/React.createElement("button", {
    onClick: () => navigate('/signup'),
    className: "font-label-md text-label-md text-charcoal-dark hover:underline font-bold"
  }, "Sign up"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-2xl flex flex-col md:flex-row justify-between items-center px-lg py-xl w-full max-w-[480px] mx-auto border-t border-ash-border"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-label-md text-label-md font-bold text-on-surface"
  }, "FormPilot", /*#__PURE__*/React.createElement("span", {
    className: "text-[#DFB257]"
  }, "X")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-md mt-sm md:mt-0"
  }, /*#__PURE__*/React.createElement("a", {
    className: "font-body-sm text-body-sm text-secondary hover:text-charcoal-dark transition-colors",
    href: "#/privacy"
  }, "Privacy Policy"), /*#__PURE__*/React.createElement("a", {
    className: "font-body-sm text-body-sm text-secondary hover:text-charcoal-dark transition-colors",
    href: "#/terms"
  }, "Terms of Service"))));
};
  if (typeof SigninView !== 'undefined') window.SigninView = SigninView;
})();
