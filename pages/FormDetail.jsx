const FormDetailView = ({ id }) => {
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
  const isDraft = form && form.status === 'draft';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">Draft</span>;
      case 'published':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">Published</span>;
      case 'archived':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-slate-200 text-slate-700 rounded-full">Archived</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-800 rounded-full">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-lg p-12 text-center my-auto">
        <p className="text-xs font-semibold text-slate-500">Loading Form Detail...</p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-lg p-8 my-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium mb-4">
          {error || 'Form not found'}
        </div>
        <button onClick={() => navigate('/forms')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg">
          ← Back to Forms
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden flex flex-col min-h-[600px] relative my-auto">
      {/* Header */}
      <header className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/forms')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
          >
            ← Back to Forms
          </button>
          <span className="text-slate-300">|</span>
          <h1 className="text-sm font-bold text-slate-900">Form Details</h1>
        </div>

        {isDraft ? (
          <button
            onClick={() => navigate(`/forms/${form.id}/edit`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
          >
            ✏️ Edit Form
          </button>
        ) : (
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            Read Only (Archived)
          </span>
        )}
      </header>

      {/* Main Content */}
      <main className="p-6 sm:p-8 flex-1 bg-slate-50 space-y-6">
        {/* Title / Description Summary Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Form Information</span>
            {getStatusBadge(form.status)}
          </div>
          <h2 className="text-xl font-bold text-slate-900">{form.title}</h2>
          <p className="text-xs text-slate-600 mt-1">{form.description || 'No description provided.'}</p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-6 text-[11px] text-slate-400">
            <div>Form ID: <span className="font-mono text-slate-600">{form.id}</span></div>
            <div>Created: <span className="text-slate-600">{new Date(form.created_at).toLocaleString()}</span></div>
          </div>
        </div>

        {/* Read-only Form Preview / Field List */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-sm text-slate-900 pb-3 border-b border-slate-100">
            Form Preview ({fields.length} {fields.length === 1 ? 'Field' : 'Fields'})
          </h3>

          {fields.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No fields configured for this form yet.
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl">
              {fields.map((field, idx) => (
                <div key={field.id} className="space-y-1.5 p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                  <label className="block text-xs font-semibold text-slate-800">
                    {idx + 1}. {field.label}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {/* Render simulated input control according to field_type */}
                  {field.field_type === 'text' && (
                    <input
                      type="text"
                      disabled
                      placeholder={field.placeholder || 'Text response...'}
                      className="w-full h-9 px-3 border border-slate-300 rounded-md text-xs bg-white text-slate-400 cursor-not-allowed"
                    />
                  )}

                  {field.field_type === 'email' && (
                    <input
                      type="email"
                      disabled
                      placeholder={field.placeholder || 'email@example.com'}
                      className="w-full h-9 px-3 border border-slate-300 rounded-md text-xs bg-white text-slate-400 cursor-not-allowed"
                    />
                  )}

                  {field.field_type === 'number' && (
                    <input
                      type="number"
                      disabled
                      placeholder={field.placeholder || 'Numeric value...'}
                      className="w-full h-9 px-3 border border-slate-300 rounded-md text-xs bg-white text-slate-400 cursor-not-allowed"
                    />
                  )}

                  {field.field_type === 'date' && (
                    <input
                      type="date"
                      disabled
                      className="w-full h-9 px-3 border border-slate-300 rounded-md text-xs bg-white text-slate-400 cursor-not-allowed"
                    />
                  )}

                  {field.field_type === 'dropdown' && (
                    <select disabled className="w-full h-9 px-3 border border-slate-300 rounded-md text-xs bg-white text-slate-400 cursor-not-allowed">
                      <option>Select an option...</option>
                      {field.options && field.options.map(opt => (
                        <option key={opt.id} value={opt.option_value}>{opt.option_label}</option>
                      ))}
                    </select>
                  )}

                  {field.field_type === 'checkbox' && (
                    <div className="space-y-1.5 pt-1">
                      {field.options && field.options.map(opt => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input type="checkbox" disabled className="w-3.5 h-3.5 border-slate-300 rounded cursor-not-allowed" />
                          <span className="text-xs text-slate-600 font-medium">{opt.option_label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
