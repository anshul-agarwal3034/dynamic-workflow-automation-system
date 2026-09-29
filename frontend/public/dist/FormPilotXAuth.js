(function() {
// --- Main App Entry Component ---
function FormPilotXAuthApp() {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const handleDeleteAccount = () => {
    setIsDeleteModalOpen(false);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    navigate('/signin');
  };
  const isAuthenticated = Boolean(localStorage.getItem('auth_token'));

  // Static routes mapping paths to top-level view elements
  const routes = [{
    path: '/',
    element: isAuthenticated ? /*#__PURE__*/React.createElement(HomeView, {
      setIsDeleteModalOpen: setIsDeleteModalOpen
    }) : /*#__PURE__*/React.createElement(SigninView, null)
  }, {
    path: '/signup',
    element: /*#__PURE__*/React.createElement(SignupView, null)
  }, {
    path: '/signup/verify',
    element: /*#__PURE__*/React.createElement(SignupVerifyView, null)
  }, {
    path: '/signin',
    element: /*#__PURE__*/React.createElement(SigninView, null)
  }, {
    path: '/login',
    element: /*#__PURE__*/React.createElement(SigninView, null)
  }, {
    path: '/signin/forgot-password',
    element: /*#__PURE__*/React.createElement(ForgotPasswordView, null)
  }, {
    path: '/signin/forgot-password/verify',
    element: /*#__PURE__*/React.createElement(ForgotVerifyView, null)
  }, {
    path: '/signin/forgot-password/reset',
    element: /*#__PURE__*/React.createElement(ForgotResetView, null)
  }, {
    path: '/home',
    element: /*#__PURE__*/React.createElement(HomeView, {
      setIsDeleteModalOpen: setIsDeleteModalOpen
    })
  }, {
    path: '/forms',
    component: FormsListView
  }, {
    path: '/forms/create',
    component: CreateFormView
  }, {
    path: '/forms/new',
    component: CreateFormView
  }, {
    path: '/forms/:id/submissions',
    component: SubmissionsView
  }, {
    path: '/forms/:id/analytics',
    component: AnalyticsDashboard
  }, {
    path: '/analytics',
    component: AnalyticsDashboard
  }, {
    path: '/forms/:id',
    component: FormDetailView
  }, {
    path: '/forms/:id/edit',
    component: FormBuilderView
  }, {
    path: '/submissions',
    component: SubmissionsView
  }, {
    path: '/settings',
    component: SettingsView,
    element: /*#__PURE__*/React.createElement(SettingsView, null)
  }, {
    path: '/public/forms/:slug',
    component: PublicFormView
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-slate-950 text-slate-100 font-sans relative flex flex-col w-full justify-center items-center overflow-x-hidden p-0 m-0"
  }, /*#__PURE__*/React.createElement(Router, {
    routes: routes
  }), isDeleteModalOpen && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-sm w-full p-6 text-left space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-red-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center font-bold text-lg border border-red-500/20"
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-100 text-base"
  }, "Delete your account?")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 leading-relaxed"
  }, "This action cannot be undone. Your account and associated data may be permanently deleted."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-3 pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setIsDeleteModalOpen(false),
    className: "px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: handleDeleteAccount,
    className: "px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
  }, "Delete Account")))));
}
  if (typeof FormPilotXAuthApp !== 'undefined') window.FormPilotXAuthApp = FormPilotXAuthApp;
})();
