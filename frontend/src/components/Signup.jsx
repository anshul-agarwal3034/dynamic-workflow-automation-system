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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-ash-border' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[!@#$%^&*()]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-error' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-warm-amber' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-cyan-accent' };
    return { score: 4, label: 'Strong', color: 'bg-mint-emerald' };
  };

  const strength = getPasswordStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');

    if (!formData.terms) {
      setSignupError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create account via POST /auth/signup
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
        setLoading(false);
        return;
      }

      // 2. Direct Auto-Login via POST /auth/signin
      const loginResponse = await fetch('http://127.0.0.1:8000/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
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

  return (
    <div className="w-full min-h-screen bg-platinum-bg text-on-surface font-body-md antialiased flex flex-col justify-center items-center p-md lg:p-xl">
      <div className="w-full max-w-5xl bg-surface-container-lowest rounded-xl border border-ash-border shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row my-auto">
        {/* Left Branding/Marketing Pane */}
        <div className="hidden md:flex flex-col justify-between w-1/2 p-2xl bg-charcoal-dark text-on-primary relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.5) 0%, transparent 50%)" }}></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-sm mb-3xl">
              <span className="material-symbols-outlined text-[32px] text-surface-bright" style={{ fontVariationSettings: "'FILL' 1" }}>hexagon</span>
              <span className="font-headline-md text-headline-md font-black tracking-tight text-surface-bright">FormPilotX</span>
            </div>
            <h2 className="font-display-lg text-display-lg text-surface-bright mb-lg font-black leading-tight">Enterprise Data Collection, Perfected.</h2>
            <p className="font-body-lg text-body-lg text-secondary-fixed-dim">
              Deploy complex logic, gather actionable insights, and integrate seamlessly with your existing infrastructure. All within a secure, high-performance environment.
            </p>
          </div>

          <div className="relative z-10 font-body-sm text-body-sm text-secondary-fixed-dim">
            © 2026 FormPilotX Enterprise. All rights reserved.
          </div>
        </div>

        {/* Right Form Pane */}
        <div className="w-full md:w-1/2 p-lg md:p-2xl flex flex-col justify-center">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-center gap-sm mb-xl">
            <span className="material-symbols-outlined text-[28px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>hexagon</span>
            <span className="font-headline-md text-headline-md font-black tracking-tight text-on-surface">FormPilotX</span>
          </div>

          <div className="mb-xl">
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-sm font-bold">Create Account</h1>
            <p className="font-body-md text-body-md text-secondary">Join FormPilotX to streamline your enterprise data workflows.</p>
          </div>

          {signupError && (
            <div className="mb-md p-md bg-error-container/40 border border-error/20 rounded-lg text-body-sm text-error font-medium flex items-center gap-sm">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{signupError}</span>
            </div>
          )}

          {/* Email Sign Up Form */}
          <form className="space-y-md" onSubmit={handleSubmit}>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-sm font-semibold" htmlFor="fullName">Full Name</label>
              <div className="relative">
                <input
                  id="fullName"
                  name="name"
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-surface-container-lowest border border-ash-border rounded-lg py-md px-lg pl-3xl font-body-md text-body-md text-on-surface focus:outline-none focus:border-charcoal-dark focus:ring-4 focus:ring-silver-container transition-all"
                />
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-secondary">person</span>
              </div>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-sm font-semibold" htmlFor="workEmail">Work Email</label>
              <div className="relative">
                <input
                  id="workEmail"
                  name="email"
                  type="email"
                  required
                  placeholder="jane.doe@company.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-surface-container-lowest border border-ash-border rounded-lg py-md px-lg pl-3xl font-body-md text-body-md text-on-surface focus:outline-none focus:border-charcoal-dark focus:ring-4 focus:ring-silver-container transition-all"
                />
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-secondary">mail</span>
              </div>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-sm font-semibold" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-surface-container-lowest border border-ash-border rounded-lg py-md px-lg pl-3xl pr-3xl font-body-md text-body-md text-on-surface focus:outline-none focus:border-charcoal-dark focus:ring-4 focus:ring-silver-container transition-all"
                />
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-secondary">lock</span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-md top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface focus:outline-none"
                >
                  <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>

              {/* Dynamic Password Strength Indicator */}
              {formData.password && (
                <div className="mt-sm space-y-xs">
                  <div className="flex gap-xs">
                    <div className={`h-1 w-1/4 rounded-full transition-all ${strength.score >= 1 ? strength.color : 'bg-ash-border'}`}></div>
                    <div className={`h-1 w-1/4 rounded-full transition-all ${strength.score >= 2 ? strength.color : 'bg-ash-border'}`}></div>
                    <div className={`h-1 w-1/4 rounded-full transition-all ${strength.score >= 3 ? strength.color : 'bg-ash-border'}`}></div>
                    <div className={`h-1 w-1/4 rounded-full transition-all ${strength.score >= 4 ? strength.color : 'bg-ash-border'}`}></div>
                  </div>
                  <p className="font-label-sm text-label-sm text-secondary">
                    Password strength: <span className="font-bold text-on-surface">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-sm pt-sm">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={formData.terms}
                  onChange={handleInputChange}
                  className="w-4 h-4 border-ash-border rounded bg-surface-container-lowest focus:ring-charcoal-dark focus:ring-2 text-charcoal-dark"
                />
              </div>
              <label className="font-body-sm text-body-sm text-secondary cursor-pointer" htmlFor="terms">
                I agree to the <a className="text-on-surface font-semibold underline hover:text-charcoal-muted" href="#/terms">Terms of Service</a> and <a className="text-on-surface font-semibold underline hover:text-charcoal-muted" href="#/privacy">Privacy Policy</a>.
              </label>
            </div>

            <div className="pt-md">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-charcoal-dark text-on-primary font-label-md text-label-md py-md px-lg rounded-lg hover:bg-tertiary-container transition-colors duration-200 disabled:opacity-50 font-bold"
              >
                {loading ? 'Creating Account & Logging In...' : 'Create Account'}
              </button>
            </div>
          </form>

          <div className="mt-xl text-center">
            <p className="font-body-sm text-body-sm text-secondary">
              Already have an account? <button onClick={() => navigate('/signin')} className="text-on-surface font-semibold underline hover:text-charcoal-muted font-bold">Log in</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
