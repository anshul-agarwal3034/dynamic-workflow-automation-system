const FormsListView = () => {
  const [forms, setForms] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  const fetchForms = React.useCallback(async (searchTerm = search, statusVal = statusFilter) => {
    setLoading(true);
    setError('');
    try {
      const data = await formsApi.listForms({ search: searchTerm, status: statusVal });
      setForms(data);
    } catch (err) {
      setError(err.message || 'Failed to load forms.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/signin');
      return;
    }
    fetchForms();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchForms(search, statusFilter);
  };

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    fetchForms(search, newStatus);
  };

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

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden flex flex-col min-h-[600px] relative my-auto">
      {/* Top Navbar */}
      <header className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-6">
          <Logo size="md" />
          <nav className="flex items-center gap-4 text-xs font-semibold">
            <button onClick={() => navigate('/home')} className="text-slate-600 hover:text-blue-600 transition-colors">Home</button>
            <button onClick={() => navigate('/forms')} className="text-blue-600 font-bold border-b-2 border-blue-600 pb-1">My Forms</button>
          </nav>
        </div>
        <button
          onClick={() => navigate('/forms/create')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>+</span> Create Form
        </button>
      </header>

      {/* Main Content */}
      <main className="p-6 sm:p-8 flex-1 bg-slate-50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Forms</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage and edit your workflow forms</p>
          </div>

          {/* Search & Status Filter Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search forms by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-3 pr-8 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white"
              />
              <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                🔍
              </button>
            </form>

            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="h-9 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs font-medium">
            Loading forms...
          </div>
        ) : forms.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center my-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl mx-auto mb-3">
              📝
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No forms found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {search || statusFilter 
                ? 'No forms match your current search or filter criteria. Try clearing filters.'
                : "You haven't created any forms yet. Create your first form to get started!"}
            </p>
            {!(search || statusFilter) && (
              <button
                onClick={() => navigate('/forms/create')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <span>+</span> Create First Form
              </button>
            )}
          </div>
        ) : (
          /* Form List Grid */
          <div className="space-y-3">
            {forms.map((form) => (
              <div
                key={form.id}
                onClick={() => navigate(`/forms/${form.id}`)}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-sm text-slate-900 truncate hover:text-blue-600 transition-colors">
                      {form.title}
                    </h3>
                    {getStatusBadge(form.status)}
                  </div>
                  {form.description && (
                    <p className="text-xs text-slate-500 truncate max-w-xl">{form.description}</p>
                  )}
                  <p className="text-[11px] text-slate-400 pt-0.5">
                    Created: {new Date(form.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {form.status === 'draft' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/forms/${form.id}/edit`);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-md transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  <span className="text-slate-400 text-sm">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
