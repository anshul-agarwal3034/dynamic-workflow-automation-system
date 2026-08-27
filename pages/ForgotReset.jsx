const ForgotResetView = ({ formData, handleInputChange, showNewPassword, setShowNewPassword, newPasswordFocused, setNewPasswordFocused }) => {
  const navigate = ReactRouterDOM.useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/signin');
  };

  return (
    <div className="w-full max-w-[440px] bg-white rounded-[12px] border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] p-8 sm:p-10 my-auto overflow-visible shrink-0">
      <div className="text-center mb-6">
        <Logo size="lg" />
        <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Set New Password</h1>
        <p className="text-xs text-slate-500">Create a secure password for your account</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              onFocus={() => setNewPasswordFocused(true)}
              onBlur={() => setNewPasswordFocused(false)}
              placeholder="••••••••"
              required
              className="w-full h-10 pl-3 pr-10 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
            >
              {showNewPassword ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          </div>
          <PasswordChecklist password={formData.newPassword} isFocused={newPasswordFocused} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              name="confirmNewPassword"
              value={formData.confirmNewPassword}
              onChange={handleInputChange}
              placeholder="••••••••"
              required
              className={`w-full h-10 pl-3 pr-10 border rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                formData.confirmNewPassword && formData.newPassword !== formData.confirmNewPassword
                  ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                  : "border-slate-300 focus:ring-blue-600/20 focus:border-blue-600"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
            >
              {showNewPassword ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          </div>
          {formData.confirmNewPassword && formData.newPassword !== formData.confirmNewPassword && (
            <span className="text-[11px] text-red-600 font-normal mt-1 block">Passwords must match</span>
          )}
        </div>

        <button
          type="submit"
          className="w-full h-10 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors mt-2"
        >
          Reset Password & Log In
        </button>
      </form>
    </div>
  );
};
