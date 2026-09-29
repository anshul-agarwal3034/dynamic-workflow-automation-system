(function() {
const FormDetailView = ({
  id
}) => {
  const [form, setForm] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/signin');
      return;
    }
    const loadForm = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await formsApi.getForm(id);
        setForm(data);
      } catch (err) {
        setError(err.message || 'Failed to load form detail.');
      } finally {
        setLoading(false);
      }
    };
    loadForm();
  }, [id]);
  const activeVersion = form && form.versions && form.versions.length > 0 ? form.versions[0] : null;
  const fields = activeVersion && activeVersion.fields ? [...activeVersion.fields].sort((a, b) => a.display_order - b.display_order) : [];
  const getStatusBadge = status => {
    switch (status) {
      case 'draft':
        return /*#__PURE__*/React.createElement("span", {
          className: "px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full"
        }, "Draft");
      case 'published':
        return /*#__PURE__*/React.createElement("span", {
          className: "px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full"
        }, "Published");
      case 'archived':
        return /*#__PURE__*/React.createElement("span", {
          className: "px-2.5 py-0.5 text-[10px] font-bold bg-[#20232B] text-[#949089] border border-[#2A2D35] rounded-full"
        }, "Archived");
      default:
        return /*#__PURE__*/React.createElement("span", {
          className: "px-2.5 py-0.5 text-[10px] font-bold bg-[#20232B] text-[#F5F3EF] border border-[#2A2D35] rounded-full"
        }, status);
    }
  };
  if (loading) {
    return /*#__PURE__*/React.createElement(SaaSAppShell, {
      activeTab: "forms"
    }, /*#__PURE__*/React.createElement("div", {
      className: "py-16 text-center text-xs font-semibold text-[#949089]"
    }, "Loading Form Details..."));
  }
  if (error || !form) {
    return /*#__PURE__*/React.createElement(SaaSAppShell, {
      activeTab: "forms"
    }, /*#__PURE__*/React.createElement("div", {
      className: "p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 font-medium mb-4"
    }, error || 'Form not found'), /*#__PURE__*/React.createElement("button", {
      onClick: () => navigate('/forms'),
      className: "px-4 py-2 bg-gradient-to-r from-[#DFB257] to-[#E2B858] text-[#121316] text-xs font-bold rounded-xl"
    }, "\u2190 Back to Portfolio"));
  }
  return /*#__PURE__*/React.createElement(SaaSAppShell, {
    activeTab: "forms"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-4xl mx-auto space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between border-b border-[#2A2D35] pb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => navigate('/forms'),
    className: "text-xs font-bold text-[#949089] hover:text-[#E2B858] transition-colors flex items-center gap-1"
  }, "\u2190 Back to Portfolio"), /*#__PURE__*/React.createElement("span", {
    className: "text-[#2A2D35]"
  }, "|"), /*#__PURE__*/React.createElement("h1", {
    className: "font-headline-md text-headline-md font-bold text-[#F5F3EF]"
  }, "Form Specification Summary")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => navigate(`/forms/${form.id}/analytics`),
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 border border-[#2A2D35]"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC8"), " Analytics"), form.status !== 'archived' && /*#__PURE__*/React.createElement("button", {
    onClick: () => navigate(`/forms/${form.id}/edit`),
    className: "px-4 py-2 bg-gradient-to-r from-[#DFB257] to-[#E2B858] hover:brightness-110 text-[#121316] font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83C\uDFA8"), " Open Form Builder"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-6 shadow-sm space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold text-[#949089] uppercase tracking-wider"
  }, "Form Information"), getStatusBadge(form.status)), /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-[#F5F3EF]"
  }, form.title), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089]"
  }, form.description || 'No description provided.'), /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-[#2A2D35] flex flex-wrap gap-6 text-[11px] text-[#949089]"
  }, /*#__PURE__*/React.createElement("div", null, "Form ID: ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[#F5F3EF]"
  }, form.id)), /*#__PURE__*/React.createElement("div", null, "Created: ", /*#__PURE__*/React.createElement("span", {
    className: "text-[#F5F3EF]"
  }, new Date(form.created_at).toLocaleString())))), /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-6 shadow-sm space-y-5"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-[#F5F3EF] pb-3 border-b border-[#2A2D35]"
  }, "Field Preview (", fields.length, " ", fields.length === 1 ? 'Field' : 'Fields', ")"), fields.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "py-8 text-center text-xs text-[#949089]"
  }, "No fields configured for this form yet.") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, fields.map((field, idx) => /*#__PURE__*/React.createElement("div", {
    key: field.id,
    className: "space-y-2 p-4 border border-[#2A2D35] rounded-xl bg-[#16181D]"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF]"
  }, idx + 1, ". ", field.label, field.is_required && /*#__PURE__*/React.createElement("span", {
    className: "text-rose-400 ml-1"
  }, "*")), field.field_type === 'text' && /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: field.placeholder || 'Text response...',
    className: "w-full h-10 px-3.5 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
  }), field.field_type === 'email' && /*#__PURE__*/React.createElement("input", {
    type: "email",
    placeholder: field.placeholder || 'email@example.com',
    className: "w-full h-10 px-3.5 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
  }), field.field_type === 'number' && /*#__PURE__*/React.createElement("input", {
    type: "number",
    placeholder: field.placeholder || 'Numeric value...',
    className: "w-full h-10 px-3.5 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
  }), field.field_type === 'date' && /*#__PURE__*/React.createElement("input", {
    type: "date",
    className: "w-full h-10 px-3.5 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858] cursor-pointer"
  }), field.field_type === 'dropdown' && /*#__PURE__*/React.createElement("select", {
    className: "w-full h-10 px-3.5 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] font-semibold focus:outline-none focus:border-[#E2B858] cursor-pointer"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select an option..."), field.options && field.options.map(opt => /*#__PURE__*/React.createElement("option", {
    key: opt.id || opt.option_value,
    value: opt.option_value
  }, opt.option_label))), field.field_type === 'checkbox' && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 pt-1"
  }, field.options && field.options.map(opt => /*#__PURE__*/React.createElement("label", {
    key: opt.id || opt.option_value,
    className: "flex items-center gap-2 px-3 py-1.5 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs font-semibold text-[#F5F3EF] cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    className: "w-3.5 h-3.5 text-[#E2B858] bg-[#16181D] rounded border-[#2A2D35]"
  }), /*#__PURE__*/React.createElement("span", null, opt.option_label)))), field.field_type === 'rating' && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 pt-1"
  }, [1, 2, 3, 4, 5].map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    type: "button",
    className: "px-3 py-1.5 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-amber-400 font-bold cursor-pointer"
  }, "\u2605 ", s))), field.field_type === 'file' && /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-[#20232B] border border-dashed border-[#2A2D35] rounded-xl text-xs text-[#949089] text-center cursor-pointer"
  }, "\uD83D\uDCCE Drag and drop file or click to browse attachment")))))));
};
  if (typeof FormDetailView !== 'undefined') window.FormDetailView = FormDetailView;
})();
