(function() {
const CreateFormView = () => {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [existingForms, setExistingForms] = React.useState([]);
  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/signin');
      return;
    }
    formsApi.listForms().then(data => {
      if (Array.isArray(data)) {
        setExistingForms(data);
      }
    }).catch(() => {});
  }, []);
  const isDuplicateTitle = React.useMemo(() => {
    const trimmed = title.trim().toLowerCase();
    if (!trimmed) return false;
    return existingForms.some(f => f.title && f.title.trim().toLowerCase() === trimmed);
  }, [title, existingForms]);
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Form title is required.');
      return;
    }
    if (isDuplicateTitle) {
      setError('A form with this title already exists.');
      return;
    }
    setLoading(true);
    try {
      const form = await formsApi.createForm({
        title: title.trim(),
        description: description.trim() || undefined
      });
      navigate(`/forms/${form.id}/edit`);
    } catch (err) {
      setError(err.message || 'Failed to create form.');
    } finally {
      setLoading(false);
    }
  };
  return /*#__PURE__*/React.createElement(SaaSAppShell, {
    activeTab: "forms"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 sm:p-8 max-w-3xl mx-auto space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between border-b border-[#2A2D35] pb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => navigate('/forms'),
    className: "text-xs font-bold text-[#949089] hover:text-[#F5F3EF] transition-colors flex items-center gap-1 cursor-pointer"
  }, "\u2190 Back to Portfolio"), /*#__PURE__*/React.createElement("span", {
    className: "text-[#2A2D35]"
  }, "|"), /*#__PURE__*/React.createElement("h1", {
    className: "text-lg sm:text-2xl font-bold text-[#F5F3EF]"
  }, "Create New Form"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] border border-[#2A2D35] p-3.5 sm:p-5 rounded-xl shadow-sm"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-base font-bold text-[#F5F3EF] mb-1"
  }, "Form Specification"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs sm:text-sm text-[#8E929C] mb-4 sm:mb-6"
  }, "Enter a title and description to initialize your form builder studio."), error && /*#__PURE__*/React.createElement("div", {
    className: "mb-5 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-400 font-medium"
  }, error), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSubmit,
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF] mb-1.5"
  }, "Form Title ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-400"
  }, "*")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "e.g., Customer Feedback Survey or Product Onboarding",
    required: true,
    className: `w-full h-10 sm:h-12 px-3 sm:px-4 text-xs sm:text-sm bg-[#16181D] border rounded-xl text-[#F5F3EF] focus:outline-none transition-all placeholder:text-[#949089]/50 ${isDuplicateTitle ? 'border-amber-500/70 focus:border-amber-500' : 'border-[#2A2D35] focus:border-[#E2B858]'}`
  }), isDuplicateTitle && /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 flex items-center gap-1.5 text-xs text-amber-500 font-medium"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-sm"
  }, "warning"), /*#__PURE__*/React.createElement("span", null, "A form with this title already exists."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF] mb-1.5"
  }, "Description ", /*#__PURE__*/React.createElement("span", {
    className: "text-[#949089] font-normal"
  }, "(Optional)")), /*#__PURE__*/React.createElement("textarea", {
    value: description,
    onChange: e => setDescription(e.target.value),
    placeholder: "Briefly describe the target audience and purpose of this form...",
    rows: 3,
    className: "w-full p-3 sm:p-4 text-xs sm:text-sm bg-[#16181D] border border-[#2A2D35] rounded-xl text-[#F5F3EF] focus:outline-none focus:border-[#E2B858] transition-all resize-none placeholder:text-[#949089]/50"
  })), /*#__PURE__*/React.createElement("div", {
    className: "pt-4 border-t border-[#2A2D35] flex flex-col sm:flex-row items-center justify-end gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => navigate('/forms'),
    className: "w-full sm:w-auto py-2.5 px-4 text-xs sm:text-sm bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] font-semibold rounded-xl transition-colors cursor-pointer text-center"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: loading || isDuplicateTitle,
    className: "w-full sm:w-auto py-2.5 px-4 text-xs sm:text-sm bg-gradient-to-r from-[#DFB257] to-[#E2B858] hover:brightness-110 text-[#121316] font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
  }, loading ? 'Initializing Studio...' : 'Initialize Form Studio →'))))));
};
  if (typeof CreateFormView !== 'undefined') window.CreateFormView = CreateFormView;
})();
