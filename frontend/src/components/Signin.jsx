const SigninView = () => {
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    remember: false
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [signinError, setSigninError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSigninError('');
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
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

  return (
    <div className="w-full min-h-screen bg-platinum-bg text-on-background font-body-md antialiased flex flex-col items-center justify-center p-md lg:p-xl">
      <div className="w-full max-w-[480px] p-xl bg-surface border border-ash-border rounded-xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] flex flex-col gap-lg my-auto">
        <div className="flex flex-col items-center text-center gap-sm">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-[32px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>hexagon</span>
            <h1 className="font-headline-lg text-headline-lg text-charcoal-dark tracking-tight font-black">FormPilotX</h1>
          </div>
          <p className="font-body-sm text-body-sm text-secondary">Sign in to your enterprise account.</p>
        </div>

        {signinError && (
          <div className="p-md bg-error-container/40 border border-error/20 rounded-lg text-body-sm text-error font-medium flex items-center gap-sm">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{signinError}</span>
          </div>
        )}

        <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-xs">
            <label className="font-label-sm text-label-sm text-charcoal-muted uppercase font-semibold" htmlFor="email">Work Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-md py-sm bg-surface border border-ash-border rounded-DEFAULT focus:outline-none focus:border-charcoal-dark focus:ring-4 focus:ring-silver-container transition-all font-body-md text-body-md placeholder:text-outline-variant text-primary"
            />
          </div>

          <div className="flex flex-col gap-xs">
            <div className="flex justify-between items-center">
              <label className="font-label-sm text-label-sm text-charcoal-muted uppercase font-semibold" htmlFor="password">Password</label>
            </div>
            <div className="relative flex items-center">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-md py-sm pr-10 bg-surface border border-ash-border rounded-DEFAULT focus:outline-none focus:border-charcoal-dark focus:ring-4 focus:ring-silver-container transition-all font-body-md text-body-md placeholder:text-outline-variant text-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-0 h-full flex items-center justify-center text-secondary hover:text-on-surface focus:outline-none"
              >
                <span className="material-symbols-outlined text-[20px] leading-none">{showPassword ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-sm mt-xs">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              checked={formData.remember}
              onChange={handleInputChange}
              className="w-4 h-4 rounded border-ash-border text-charcoal-dark focus:ring-charcoal-dark"
            />
            <label className="font-body-sm text-body-sm text-secondary cursor-pointer" htmlFor="remember">Remember me</label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-sm bg-charcoal-dark text-on-primary font-label-md text-label-md rounded-lg mt-sm hover:bg-tertiary-container transition-colors shadow-sm disabled:opacity-50 font-bold"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center font-body-sm text-body-sm text-secondary mt-2">
          Don't have an account? <button onClick={() => navigate('/signup')} className="font-label-md text-label-md text-charcoal-dark hover:underline font-bold">Sign up</button>
        </p>
      </div>

      {/* Footer */}
      <div className="mt-2xl flex flex-col md:flex-row justify-between items-center px-lg py-xl w-full max-w-[480px] mx-auto border-t border-ash-border">
        <span className="font-label-md text-label-md font-bold text-on-surface">FormPilotX</span>
        <div className="flex gap-md mt-sm md:mt-0">
          <a className="font-body-sm text-body-sm text-secondary hover:text-charcoal-dark transition-colors" href="#/privacy">Privacy Policy</a>
          <a className="font-body-sm text-body-sm text-secondary hover:text-charcoal-dark transition-colors" href="#/terms">Terms of Service</a>
        </div>
      </div>
    </div>
  );
};
