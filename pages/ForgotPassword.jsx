const ForgotPasswordView = ({ formData, handleInputChange }) => {
  const navigate = ReactRouterDOM.useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/signin/forgot-password/verify');
  };

  return (
    <div className="w-full max-w-[440px] bg-white rounded-[12px] border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] p-8 sm:p-10 my-auto overflow-visible shrink-0">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-100">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Reset Password</h1>
        <p className="text-xs text-slate-500">Enter your registered email to receive a reset code</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
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
        <button onClick={() => navigate('/signin')} className="text-slate-500 hover:text-slate-800 font-medium">
          ← Back to Log In
        </button>
      </div>
    </div>
  );
};
