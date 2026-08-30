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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-warm-amber/10 text-warm-amber border border-warm-amber/20 rounded-full">Draft</span>;
      case 'published':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-mint-emerald/10 text-mint-emerald border border-mint-emerald/20 rounded-full">Published</span>;
      case 'archived':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-silver-container text-secondary border border-ash-border rounded-full">Archived</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-silver-container text-primary rounded-full">{status}</span>;
    }
  };

  if (loading) {
    return (
      <SaaSAppShell activeTab="forms">
        <div className="py-16 text-center text-xs font-semibold text-secondary">Loading Form Details...</div>
      </SaaSAppShell>
    );
  }

  if (error || !form) {
    return (
      <SaaSAppShell activeTab="forms">
        <div className="p-5 bg-error-container/40 border border-error/20 rounded-2xl text-xs text-error font-medium mb-4">
          {error || 'Form not found'}
        </div>
        <button onClick={() => navigate('/forms')} className="px-4 py-2 bg-charcoal-dark text-on-primary text-xs font-bold rounded-xl">
          ← Back to Portfolio
        </button>
      </SaaSAppShell>
    );
  }

  return (
    <SaaSAppShell activeTab="forms">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ash-border pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/forms')}
              className="text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center gap-1"
            >
              ← Back to Portfolio
            </button>
            <span className="text-ash-border">|</span>
            <h1 className="font-headline-md text-headline-md font-bold text-charcoal-dark">Form Specification Summary</h1>
          </div>

          {form.status !== 'archived' && (
            <button
              onClick={() => navigate(`/forms/${form.id}/edit`)}
              className="px-4 py-2 bg-charcoal-dark hover:opacity-90 text-on-primary font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>🎨</span> Open Form Builder
            </button>
          )}
        </div>

        {/* Title / Description Summary Card */}
        <div className="bg-surface border border-ash-border rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Form Information</span>
            {getStatusBadge(form.status)}
          </div>
          <h2 className="text-xl font-bold text-charcoal-dark">{form.title}</h2>
          <p className="text-xs text-secondary">{form.description || 'No description provided.'}</p>
          <div className="pt-3 border-t border-ash-border flex flex-wrap gap-6 text-[11px] text-secondary">
            <div>Form ID: <span className="font-mono text-charcoal-dark">{form.id}</span></div>
            <div>Created: <span className="text-charcoal-dark">{new Date(form.created_at).toLocaleString()}</span></div>
          </div>
        </div>

        {/* Read-only Form Preview / Field List */}
        <div className="bg-surface border border-ash-border rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-sm text-charcoal-dark pb-3 border-b border-ash-border">
            Field Preview ({fields.length} {fields.length === 1 ? 'Field' : 'Fields'})
          </h3>

          {fields.length === 0 ? (
            <div className="py-8 text-center text-xs text-secondary">
              No fields configured for this form yet.
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, idx) => (
                <div key={field.id} className="space-y-2 p-4 border border-ash-border rounded-xl bg-silver-container/40">
                  <label className="block text-xs font-bold text-charcoal-dark">
                    {idx + 1}. {field.label}
                    {field.is_required && <span className="text-error ml-1">*</span>}
                  </label>

                  {/* Render simulated input control without disabled cursor-not-allowed */}
                  {field.field_type === 'text' && (
                    <input type="text" placeholder={field.placeholder || 'Text response...'} className="w-full h-10 px-3.5 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark focus:outline-none focus:border-charcoal-dark" />
                  )}

                  {field.field_type === 'email' && (
                    <input type="email" placeholder={field.placeholder || 'email@example.com'} className="w-full h-10 px-3.5 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark focus:outline-none focus:border-charcoal-dark" />
                  )}

                  {field.field_type === 'number' && (
                    <input type="number" placeholder={field.placeholder || 'Numeric value...'} className="w-full h-10 px-3.5 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark focus:outline-none focus:border-charcoal-dark" />
                  )}

                  {field.field_type === 'date' && (
                    <input type="date" className="w-full h-10 px-3.5 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark focus:outline-none focus:border-charcoal-dark cursor-pointer" />
                  )}

                  {field.field_type === 'dropdown' && (
                    <select className="w-full h-10 px-3.5 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark font-semibold focus:outline-none focus:border-charcoal-dark cursor-pointer">
                      <option value="">Select an option...</option>
                      {field.options && field.options.map(opt => (
                        <option key={opt.id || opt.option_value} value={opt.option_value}>{opt.option_label}</option>
                      ))}
                    </select>
                  )}

                  {field.field_type === 'checkbox' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {field.options && field.options.map(opt => (
                        <label key={opt.id || opt.option_value} className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-ash-border rounded-xl text-xs font-semibold text-charcoal-dark cursor-pointer">
                          <input type="checkbox" className="w-3.5 h-3.5 text-charcoal-dark rounded border-ash-border" />
                          <span>{opt.option_label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {field.field_type === 'rating' && (
                    <div className="flex gap-2 pt-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} type="button" className="px-3 py-1.5 bg-surface border border-ash-border rounded-xl text-xs text-warm-amber font-bold cursor-pointer">
                          ★ {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {field.field_type === 'file' && (
                    <div className="p-4 bg-surface border border-dashed border-ash-border rounded-xl text-xs text-secondary text-center cursor-pointer">
                      📎 Drag and drop file or click to browse attachment
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SaaSAppShell>
  );
};
