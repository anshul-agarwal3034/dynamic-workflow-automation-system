const ForgotVerifyView = () => {
  const [otp, setOtp] = React.useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = React.useState('');

  const handleVerifyOtp = () => {
    const enteredOtp = otp.join('');
    if (enteredOtp === '123456') {
      setOtpError('');
      navigate('/signin/forgot-password/reset');
    } else {
      setOtpError('Invalid OTP code.');
    }
  };

  const email = localStorage.getItem('pending_forgot_email') || 'your email';

  return (
    <div className="w-full max-w-[440px] bg-white rounded-[12px] border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] p-8 sm:p-10 my-auto overflow-visible shrink-0 text-center">
      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-100">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Enter Verification Code</h1>
      <p className="text-xs text-slate-500 mb-4">
        Enter the 6-digit code sent to <span className="font-semibold text-slate-700">{email}</span>
      </p>

      {otpError && (
        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
          {otpError}
        </div>
      )}

      <OtpInputs otp={otp} setOtp={setOtp} />

      <button
        onClick={handleVerifyOtp}
        className="w-full h-10 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors mt-4"
      >
        Verify Code
      </button>

      <div className="mt-6 text-xs">
        <button onClick={() => navigate('/signin/forgot-password')} className="text-slate-500 hover:text-slate-800 font-medium">
          ← Back to Email Input
        </button>
      </div>
    </div>
  );
};
