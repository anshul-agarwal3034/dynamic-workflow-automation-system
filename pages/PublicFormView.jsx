const PublicFormView = ({ slug }) => {
  const [form, setForm] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [isArchived, setIsArchived] = React.useState(false);
  const [formResponses, setFormResponses] = React.useState({});
  const [submitted, setSubmitted] = React.useState(false);
  const [startTime] = React.useState(Date.now());
  const [completionSeconds, setCompletionSeconds] = React.useState(0);

  React.useEffect(() => {
    const fetchForm = async () => {
      setLoading(true);
      setError('');
      setIsArchived(false);
      try {
        const data = await formsApi.getPublicForm(slug);
        setForm(data);
      } catch (err) {
        if (err.message && err.message.includes('archived')) {
          setIsArchived(true);
        } else {
          setError(err.message || 'Form not found or link is invalid.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchForm();
    }
  }, [slug]);

  const handleInputChange = (fieldId, value) => {
    setFormResponses(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleCheckboxToggle = (fieldId, optionValue) => {
    setFormResponses(prev => {
      const current = prev[fieldId] || [];
      const updated = current.includes(optionValue)
        ? current.filter(v => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [fieldId]: updated };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    setCompletionSeconds(elapsedSeconds);
    setSubmitted(true);
  };

  const formatCompletionTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center my-auto shadow-2xl">
        <p className="text-xs font-semibold text-slate-400">Loading FormPilotX Public Form...</p>
      </div>
    );
  }

  if (isArchived) {
    return (
      <div className="w-full max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center my-auto shadow-2xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center text-2xl mx-auto border border-slate-700">
          🔒
        </div>
        <h2 className="text-xl font-bold text-slate-100">Form No Longer Available</h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          This form has been archived by its creator and is no longer accepting public submissions.
        </p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="w-full max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center my-auto shadow-2xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center text-2xl mx-auto border border-red-500/20">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-100">Form Link Invalid</h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          {error || 'The link you opened is invalid or the form is not currently published.'}
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="w-full max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center my-auto shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-3xl mx-auto border border-emerald-500/20">
          ✓
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-100">Response Submitted!</h2>
          <p className="text-xs text-slate-400">
            Thank you for completing <span className="font-bold text-slate-200">{form.title}</span>. Your response has been recorded.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-full border border-slate-800 text-xs font-mono text-indigo-400 mt-2">
            <span>⏱️ Completion time:</span>
            <span className="font-bold text-slate-100">{formatCompletionTime(completionSeconds)} ({completionSeconds}s)</span>
          </div>
        </div>
        <button
          onClick={() => { setSubmitted(false); setFormResponses({}); }}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
        >
          Submit Another Response
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 p-8 text-white relative">
        <div className="flex items-center justify-between gap-4 mb-3">
          <span className="px-3 py-1 text-[10px] font-bold bg-white/10 rounded-full backdrop-blur-md border border-white/20">
            Version {form.version_number}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">
            FormPilotX Public Form
          </span>
        </div>
        <h1 className="text-2xl font-extrabold mb-2">{form.title}</h1>
        {form.description && (
          <p className="text-xs text-blue-100 leading-relaxed max-w-xl">{form.description}</p>
        )}
      </div>

      {/* Form Questions List */}
      <form onSubmit={handleSubmit} className="p-8 bg-slate-950/80 space-y-6">
        {form.fields.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            This published form does not contain any fields.
          </div>
        ) : (
          form.fields.map((field, idx) => (
            <div key={field.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-200">
                  {idx + 1}. {field.label}
                  {field.is_required && <span className="text-red-400 ml-1">*</span>}
                </label>
                <span className="text-[10px] font-mono text-slate-500 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {field.field_type}
                </span>
              </div>

              {/* Text Input */}
              {field.field_type === 'text' && (
                <input
                  type="text"
                  required={field.is_required}
                  placeholder={field.placeholder || 'Enter your response...'}
                  value={formResponses[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              )}

              {/* Email Input */}
              {field.field_type === 'email' && (
                <input
                  type="email"
                  required={field.is_required}
                  placeholder={field.placeholder || 'name@example.com'}
                  value={formResponses[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              )}

              {/* Number Input */}
              {field.field_type === 'number' && (
                <input
                  type="number"
                  required={field.is_required}
                  placeholder={field.placeholder || 'Enter numeric value...'}
                  value={formResponses[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              )}

              {/* Date Input */}
              {field.field_type === 'date' && (
                <input
                  type="date"
                  required={field.is_required}
                  value={formResponses[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              )}

              {/* Dropdown Select */}
              {field.field_type === 'dropdown' && (
                <select
                  required={field.is_required}
                  value={formResponses[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                >
                  <option value="">Select an option...</option>
                  {field.options && field.options.map(opt => (
                    <option key={opt.id} value={opt.option_value}>{opt.option_label}</option>
                  ))}
                </select>
              )}

              {/* Checkbox Group */}
              {field.field_type === 'checkbox' && (
                <div className="space-y-2 pt-1">
                  {field.options && field.options.map(opt => {
                    const isChecked = (formResponses[field.id] || []).includes(opt.option_value);
                    return (
                      <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxToggle(field.id, opt.option_value)}
                          className="w-4 h-4 text-indigo-600 border-slate-700 bg-slate-950 rounded focus:ring-indigo-500"
                        />
                        <span className="text-xs text-slate-300 font-medium">{opt.option_label}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Rating Control */}
              {field.field_type === 'rating' && (
                <div className="flex items-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleInputChange(field.id, star)}
                      className={`w-10 h-10 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${
                        (formResponses[field.id] || 0) >= star
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                          : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      ★ {star}
                    </button>
                  ))}
                </div>
              )}

              {/* File Placeholder */}
              {field.field_type === 'file' && (
                <div className="border border-dashed border-slate-800 rounded-xl p-4 bg-slate-950 text-center">
                  <input type="file" className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/20 file:text-indigo-400 hover:file:bg-indigo-600/30" />
                </div>
              )}
            </div>
          ))
        )}

        <div className="pt-4 flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
          >
            <span>Submit Response</span>
            <span>→</span>
          </button>
        </div>
      </form>
    </div>
  );
};
