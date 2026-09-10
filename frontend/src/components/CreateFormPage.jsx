const CreateFormView = () => {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/signin');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Form title is required.');
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

  return (
    <SaaSAppShell activeTab="forms">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-ash-border pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/forms')}
              className="text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center gap-1"
            >
              ← Back to Portfolio
            </button>
            <span className="text-ash-border">|</span>
            <h1 className="font-headline-md text-headline-md font-bold text-charcoal-dark">Create New Form</h1>
          </div>
        </div>

        <div className="bg-surface border border-ash-border rounded-2xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-bold text-charcoal-dark mb-1">Form Specification</h2>
          <p className="text-xs text-secondary mb-6">Enter a title and description to initialize your form builder studio.</p>

          {error && (
            <div className="mb-5 p-3.5 bg-error-container/40 border border-error/20 rounded-xl text-xs text-error font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-charcoal-dark mb-1.5">
                Form Title <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Customer Feedback Survey or Product Onboarding"
                required
                className="w-full h-10 px-3.5 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark focus:outline-none focus:border-charcoal-dark transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-dark mb-1.5">
                Description <span className="text-secondary font-normal">(Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the target audience and purpose of this form..."
                rows={3}
                className="w-full p-3.5 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark focus:outline-none focus:border-charcoal-dark transition-all resize-none"
              />
            </div>

            <div className="pt-4 border-t border-ash-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/forms')}
                className="px-4 py-2.5 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-charcoal-dark hover:opacity-90 text-on-primary font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? 'Initializing Studio...' : 'Initialize Form Studio →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SaaSAppShell>
  );
};
