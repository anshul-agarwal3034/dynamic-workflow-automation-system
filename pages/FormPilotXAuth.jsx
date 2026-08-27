// --- Main App Entry Component ---
function FormPilotXAuthApp() {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  const handleDeleteAccount = () => {
    setIsDeleteModalOpen(false);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    navigate('/signin');
  };

  // Static routes mapping paths to top-level view elements
  const routes = [
    { path: '/signup', element: <SignupView /> },
    { path: '/signup/verify', element: <SignupVerifyView /> },
    { path: '/signin', element: <SigninView /> },
    { path: '/signin/forgot-password', element: <ForgotPasswordView /> },
    { path: '/signin/forgot-password/verify', element: <ForgotVerifyView /> },
    { path: '/signin/forgot-password/reset', element: <ForgotResetView /> },
    { path: '/home', element: <HomeView setIsDeleteModalOpen={setIsDeleteModalOpen} /> },
    { path: '/forms', component: FormsListView },
    { path: '/forms/create', component: CreateFormView },
    { path: '/forms/:id', component: FormDetailView },
    { path: '/forms/:id/edit', component: FormBuilderView },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F4F8] to-slate-200 flex items-center justify-center p-4 py-8 box-border font-sans relative">
      <Router routes={routes} />

      {/* ⚠️ Delete Account Modal Confirmation */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-left space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center font-bold text-lg">
                ⚠️
              </div>
              <h3 className="font-bold text-slate-900 text-base">Delete your account?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action cannot be undone. Your account and associated data may be permanently deleted.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
