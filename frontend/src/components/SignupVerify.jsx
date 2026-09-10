// NOTE: The OTP verification screen is a UI placeholder (hardcoded 123456) pending a real email-verification backend service.
const SignupVerifyView = () => {
  const [otp, setOtp] = React.useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = React.useState('');
  const [timer, setTimer] = React.useState(45);

  React.useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResendOtp = () => {
    setTimer(45);
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
  };

  const handleVerifyOtp = () => {
    const enteredOtp = otp.join('');
    if (enteredOtp === '123456') {
      setOtpError('');
      navigate('/home');
    } else {
      setOtpError('Invalid OTP code.');
    }
  };

  const email = localStorage.getItem('pending_user_email') || 'your email';

  return (
    <div className="w-full max-w-[440px] bg-white rounded-[12px] border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] p-8 sm:p-10 my-auto overflow-visible shrink-0 text-center">
      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Verify Your Email</h1>
      <p className="text-xs text-slate-500 mb-4">
        We sent a 6-digit code to <span className="font-semibold text-slate-700">{email}</span>
      </p>

      {otpError && (
        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
          {otpError}
        </div>
      )}

      <OtpInputs otp={otp} setOtp={setOtp} />

      <div className="text-xs text-slate-500 my-4">
        {timer > 0 ? (
          <span>Resend code in <strong className="text-slate-700">00:{timer < 10 ? `0${timer}` : timer}</strong></span>
        ) : (
          <button onClick={handleResendOtp} className="text-blue-600 font-semibold hover:underline">
            Resend Code
          </button>
        )}
      </div>

      <button
        onClick={handleVerifyOtp}
        className="w-full h-10 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
      >
        Verify & Continue
      </button>

      <div className="mt-6 text-xs">
        <button onClick={() => navigate('/signup')} className="text-slate-500 hover:text-slate-800 font-medium">
          ← Back to Sign Up
        </button>
      </div>
    </div>
  );
};
