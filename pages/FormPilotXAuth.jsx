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
    { path: '/', element: <SigninView /> },
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
    { path: '/submissions', component: SubmissionsView },
    { path: '/public/forms/:slug', component: PublicFormView },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative flex flex-col w-full justify-center items-center overflow-x-hidden p-0 m-0">
      <Router routes={routes} />

      {/* ⚠️ Delete Account Modal Confirmation */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-sm w-full p-6 text-left space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center font-bold text-lg border border-red-500/20">
                ⚠️
              </div>
              <h3 className="font-bold text-slate-100 text-base">Delete your account?</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              This action cannot be undone. Your account and associated data may be permanently deleted.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
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
