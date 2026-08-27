const SigninView = ({ formData, handleInputChange, showPassword, setShowPassword, handleLoginSubmit }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (handleLoginSubmit) {
      handleLoginSubmit(e);
    } else {
      // Fallback frontend demo auth: set token and navigate to /home
      localStorage.setItem('auth_token', 'demo_jwt_token_formpilotx');
      navigate('/home');
    }
  };

  return (
    <div className="w-full max-w-[440px] bg-white rounded-[12px] border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] p-8 sm:p-10 my-auto overflow-visible shrink-0">
      <div className="text-center mb-6">
        <Logo size="lg" />
        <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Welcome back</h1>
        <p className="text-xs text-slate-500">Log in to access your dashboard</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
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
              onClick={() => navigate('/signin/forgot-password')}
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
              className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
            >
              {showPassword ? <EyeIcon /> : <EyeOffIcon />}
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
        <button onClick={() => navigate('/signup')} className="text-blue-600 font-semibold hover:underline">
          Sign Up
        </button>
      </div>
    </div>
  );
};
