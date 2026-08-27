const SignupView = () => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [passwordFocused, setPasswordFocused] = React.useState(false);
  const [signupError, setSignupError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');

    if (formData.password !== formData.confirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSignupError(data.detail || 'Signup failed. Please try again.');
      } else {
        // Save registered user info for OTP step display
        localStorage.setItem('pending_user_email', formData.email);
        navigate('/signup/verify');
      }
    } catch (err) {
      setSignupError('Unable to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] bg-white rounded-[12px] border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] p-8 sm:p-10 my-auto overflow-visible shrink-0">
      <div className="text-center mb-6">
        <Logo size="lg" />
        <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Create your account</h1>
        <p className="text-xs text-slate-500">Build smart forms. Automate complex workflows.</p>
      </div>

      {signupError && (
        <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
          {signupError}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
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
              required
              className="w-full h-10 pl-3 pr-10 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
            >
              {showPassword ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          </div>
          <PasswordChecklist password={formData.password} isFocused={passwordFocused} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              className={`w-full h-10 pl-3 pr-10 border rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                formData.confirmPassword && formData.password !== formData.confirmPassword
                  ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                  : "border-slate-300 focus:ring-blue-600/20 focus:border-blue-600"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
            >
              {showPassword ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          </div>
          {formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <span className="text-[11px] text-red-600 font-normal mt-1 block">Passwords must match</span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 mt-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-600/20 disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-600">
        Already have an account?{" "}
        <button onClick={() => navigate('/signin')} className="text-blue-600 font-semibold hover:underline">
          Log In
        </button>
      </div>
    </div>
  );
};
