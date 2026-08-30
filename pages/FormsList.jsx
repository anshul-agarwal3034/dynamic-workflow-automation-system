const FormsListView = () => {
  const [forms, setForms] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [portfolioViewMode, setPortfolioViewMode] = React.useState('grid'); // 'grid' | 'table'

  // Share Link modal state
  const [shareModalForm, setShareModalForm] = React.useState(null);
  const [shareUrl, setShareUrl] = React.useState('');
  const [generatingLink, setGeneratingLink] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Archive & Unarchive Form modal state
  const [archiveModalForm, setArchiveModalForm] = React.useState(null);
  const [archiving, setArchiving] = React.useState(false);
  const [unarchivingId, setUnarchivingId] = React.useState(null);

  // 3-Dot Action Menu & Delete Form Modal state
  const [openMenuFormId, setOpenMenuFormId] = React.useState(null);
  const [deleteModalForm, setDeleteModalForm] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  // Version History Modal state
  const [showVersionsModalForm, setShowVersionsModalForm] = React.useState(null);
  const [versionsList, setVersionsList] = React.useState([]);
  const [loadingVersions, setLoadingVersions] = React.useState(false);
  const [viewingVersionDetail, setViewingVersionDetail] = React.useState(null);

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

  const handleStatusTabClick = (newStatus) => {
    setStatusFilter(newStatus);
    fetchForms(search, newStatus);
  };

  const handleOpenShareModal = async (e, form) => {
    e.stopPropagation();
    setShareModalForm(form);
    setGeneratingLink(true);
    setCopiedLink(false);
    try {
      const data = await formsApi.generateShareLink(form.id);
      setShareUrl(data.share_url);
    } catch (err) {
      setError(err.message || 'Failed to generate share link.');
      setShareModalForm(null);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleConfirmArchive = async () => {
    if (!archiveModalForm) return;
    setArchiving(true);
    try {
      await formsApi.archiveForm(archiveModalForm.id);
      setArchiveModalForm(null);
      await fetchForms();
    } catch (err) {
      setError(err.message || 'Failed to archive form.');
    } finally {
      setArchiving(false);
    }
  };

  const handleUnarchiveForm = async (e, formId) => {
    if (e) e.stopPropagation();
    setUnarchivingId(formId);
    try {
      await formsApi.unarchiveForm(formId);
      await fetchForms();
    } catch (err) {
      setError(err.message || 'Failed to unarchive form.');
    } finally {
      setUnarchivingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalForm) return;
    const targetFormId = deleteModalForm.id;
    setDeleteModalForm(null);
    setOpenMenuFormId(null);
    setDeleting(true);
    setError('');
    try {
      await formsApi.deleteForm(targetFormId);
      setForms((prev) => prev.filter((f) => f.id !== targetFormId));
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to delete form.';
      alert("Delete failed: " + errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenVersionsModal = async (e, form) => {
    if (e) e.stopPropagation();
    setShowVersionsModalForm(form);
    setLoadingVersions(true);
    setViewingVersionDetail(null);
    try {
      const versions = await formsApi.getFormVersions(form.id);
      setVersionsList(versions);
    } catch (err) {
      setError(err.message || 'Failed to fetch version history.');
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleViewVersionDetail = async (formId, versionId) => {
    try {
      const detail = await formsApi.getFormVersionDetail(formId, versionId);
      setViewingVersionDetail(detail);
    } catch (err) {
      setError(err.message || 'Failed to load version details.');
    }
  };

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

  return (
    <SaaSAppShell activeTab="forms" searchVal={search} onSearchChange={(v) => { setSearch(v); fetchForms(v, statusFilter); }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header, Dual View Toggle & New Form Trigger */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ash-border pb-5">
          <div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-charcoal-dark tracking-tight">Forms Portfolio</h1>
            <p className="font-body-md text-body-md text-secondary mt-1">Manage, publish, and inspect your automated form workflows</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Dual View Toggle: Grid Cards vs Compact Table */}
            <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-ash-border">
              <button
                onClick={() => setPortfolioViewMode('grid')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  portfolioViewMode === 'grid'
                    ? 'bg-charcoal-dark text-on-primary shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-silver-container'
                }`}
              >
                🗂️ Grid Cards
              </button>
              <button
                onClick={() => setPortfolioViewMode('table')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  portfolioViewMode === 'table'
                    ? 'bg-charcoal-dark text-on-primary shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-silver-container'
                }`}
              >
                📊 Compact Table
              </button>
            </div>

            <button
              onClick={() => navigate('/forms/create')}
              className="px-4 py-2.5 bg-charcoal-dark hover:opacity-90 text-on-primary font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <span>+ New Form</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-ash-border pb-3">
          {[
            { id: '', label: 'All Forms' },
            { id: 'published', label: 'Published' },
            { id: 'draft', label: 'Drafts' },
            { id: 'archived', label: 'Archived' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleStatusTabClick(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                statusFilter === tab.id
                  ? 'bg-silver-container text-primary border border-ash-border'
                  : 'text-secondary hover:text-primary hover:bg-silver-container'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 bg-error-container/40 border border-error/20 rounded-xl text-xs text-error font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-xs text-secondary font-medium">
            Loading forms portfolio...
          </div>
        ) : forms.length === 0 ? (
          /* Empty State */
          <div className="bg-surface border border-ash-border rounded-2xl p-12 text-center my-6 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-silver-container text-secondary flex items-center justify-center text-2xl mx-auto mb-4 border border-ash-border">
              📝
            </div>
            <h3 className="text-base font-bold text-charcoal-dark mb-1">No forms found</h3>
            <p className="text-xs text-secondary max-w-sm mx-auto mb-6">
              {search || statusFilter
                ? 'No forms match your current search or status filter criteria.'
                : "You haven't created any forms yet. Initialize your first form to get started!"}
            </p>
            {!(search || statusFilter) && (
              <button
                onClick={() => navigate('/forms/create')}
                className="px-5 py-2.5 bg-charcoal-dark hover:opacity-90 text-on-primary text-xs font-bold rounded-xl shadow-sm transition-all inline-flex items-center gap-2"
              >
                <span>+ Create First Form</span>
              </button>
            )}
          </div>
        ) : portfolioViewMode === 'grid' ? (
          /* View Mode 1: Grid Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {forms.map((form) => {
              const activeVersion = form.versions && form.versions.length > 0 ? form.versions[0] : null;
              const fieldCount = activeVersion && activeVersion.fields ? activeVersion.fields.length : 0;
              return (
                <div
                  key={form.id}
                  onClick={() => navigate(`/forms/${form.id}`)}
                  className="bg-surface border border-ash-border hover:border-charcoal-dark rounded-2xl p-5 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-secondary font-bold bg-silver-container px-2 py-0.5 rounded-lg border border-ash-border">
                        v{activeVersion ? activeVersion.version_number : 1}
                      </span>
                      {getStatusBadge(form.status)}
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-charcoal-dark group-hover:text-primary transition-colors truncate">
                        {form.title}
                      </h3>
                      <p className="text-xs text-secondary mt-1 line-clamp-2 min-h-[32px]">
                        {form.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-secondary pt-2 border-t border-ash-border">
                      <span>{fieldCount} {fieldCount === 1 ? 'Field' : 'Fields'}</span>
                      <span>•</span>
                      <span>Created {new Date(form.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-ash-border flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-secondary">Form Actions</span>

                    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuFormId(openMenuFormId === form.id ? null : form.id);
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-surface hover:bg-silver-container text-charcoal-dark font-black text-base rounded-xl transition-all border border-ash-border shadow-sm"
                        title="Form Actions"
                      >
                        ⋮
                      </button>

                      {openMenuFormId === form.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuFormId(null); }} />
                          <div className="absolute right-0 bottom-9 w-52 bg-surface rounded-2xl shadow-2xl border border-ash-border z-50 p-2 space-y-1 text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuFormId(null);
                                navigate(`/forms/${form.id}/edit`);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-charcoal-dark hover:bg-silver-container rounded-xl transition-colors flex items-center gap-2"
                            >
                              <span>🎨</span> Open Form Builder
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuFormId(null);
                                handleOpenShareModal(e, form);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-charcoal-dark hover:bg-silver-container rounded-xl transition-colors flex items-center gap-2"
                            >
                              <span>🔗</span> Share Public Link
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuFormId(null);
                                handleOpenVersionsModal(e, form);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-charcoal-dark hover:bg-silver-container rounded-xl transition-colors flex items-center gap-2"
                            >
                              <span>📜</span> Version History
                            </button>

                            {form.status === 'archived' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuFormId(null);
                                  handleUnarchiveForm(e, form.id);
                                }}
                                disabled={unarchivingId === form.id}
                                className="w-full text-left px-3 py-2 text-xs font-bold text-mint-emerald hover:bg-mint-emerald/10 rounded-xl transition-colors flex items-center gap-2"
                              >
                                <span>🔄</span> {unarchivingId === form.id ? 'Restoring...' : 'Unarchive Form'}
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuFormId(null);
                                  setArchiveModalForm(form);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-bold text-charcoal-dark hover:bg-silver-container rounded-xl transition-colors flex items-center gap-2"
                              >
                                <span>📦</span> Archive Form
                              </button>
                            )}

                            <div className="border-t border-ash-border my-1" />

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuFormId(null);
                                setDeleteModalForm(form);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-error hover:bg-error-container/40 rounded-xl transition-colors flex items-center gap-2"
                            >
                              <span>🗑️</span> Delete Form
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* View Mode 2: Compact Data Table */
          <div className="bg-surface border border-ash-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-charcoal-dark">
                <thead>
                  <tr className="border-b border-ash-border text-secondary uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-bold">Form Title</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold">Version</th>
                    <th className="py-3 px-4 font-bold">Fields</th>
                    <th className="py-3 px-4 font-bold">Created Date</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ash-border">
                  {forms.map((form) => {
                    const activeVersion = form.versions && form.versions.length > 0 ? form.versions[0] : null;
                    const fieldCount = activeVersion && activeVersion.fields ? activeVersion.fields.length : 0;
                    return (
                      <tr
                        key={form.id}
                        onClick={() => navigate(`/forms/${form.id}`)}
                        className="hover:bg-silver-container/60 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-bold text-charcoal-dark">
                          {form.title}
                          {form.description && (
                            <span className="block text-[11px] font-normal text-secondary truncate max-w-xs">
                              {form.description}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(form.status)}</td>
                        <td className="py-3.5 px-4 font-mono text-secondary">
                          v{activeVersion ? activeVersion.version_number : 1}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-charcoal-dark">{fieldCount} Fields</td>
                        <td className="py-3.5 px-4 text-secondary">
                          {new Date(form.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuFormId(openMenuFormId === form.id ? null : form.id);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-surface hover:bg-silver-container text-charcoal-dark font-black text-base rounded-xl transition-all border border-ash-border shadow-sm ml-auto"
                              title="Form Actions"
                            >
                              ⋮
                            </button>

                            {openMenuFormId === form.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuFormId(null); }} />
                                <div className="absolute right-0 top-9 w-52 bg-surface rounded-2xl shadow-2xl border border-ash-border z-50 p-2 space-y-1 text-left">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuFormId(null);
                                      navigate(`/forms/${form.id}/edit`);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-charcoal-dark hover:bg-silver-container rounded-xl transition-colors flex items-center gap-2"
                                  >
                                    <span>🎨</span> Open Form Builder
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuFormId(null);
                                      handleOpenShareModal(e, form);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-charcoal-dark hover:bg-silver-container rounded-xl transition-colors flex items-center gap-2"
                                  >
                                    <span>🔗</span> Share Public Link
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuFormId(null);
                                      handleOpenVersionsModal(e, form);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-charcoal-dark hover:bg-silver-container rounded-xl transition-colors flex items-center gap-2"
                                  >
                                    <span>📜</span> Version History
                                  </button>

                                  {form.status === 'archived' ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuFormId(null);
                                        handleUnarchiveForm(e, form.id);
                                      }}
                                      disabled={unarchivingId === form.id}
                                      className="w-full text-left px-3 py-2 text-xs font-bold text-mint-emerald hover:bg-mint-emerald/10 rounded-xl transition-colors flex items-center gap-2"
                                    >
                                      <span>🔄</span> {unarchivingId === form.id ? 'Restoring...' : 'Unarchive Form'}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuFormId(null);
                                        setArchiveModalForm(form);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs font-bold text-charcoal-dark hover:bg-silver-container rounded-xl transition-colors flex items-center gap-2"
                                    >
                                      <span>📦</span> Archive Form
                                    </button>
                                  )}

                                  <div className="border-t border-ash-border my-1" />

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuFormId(null);
                                      setDeleteModalForm(form);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-error hover:bg-error-container/40 rounded-xl transition-colors flex items-center gap-2"
                                  >
                                    <span>🗑️</span> Delete Form
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Share Form Link Modal */}
      {shareModalForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-ash-border pb-3">
              <h3 className="font-bold text-charcoal-dark text-sm flex items-center gap-2">
                <span>🔗</span> Share Form: {shareModalForm.title}
              </h3>
              <button
                onClick={() => setShareModalForm(null)}
                className="text-secondary hover:text-primary text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {generatingLink ? (
              <p className="text-xs text-secondary py-4 text-center">Generating share link...</p>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-secondary leading-relaxed">
                  Anyone with this link can fill out and submit responses to this published form:
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 h-9 px-3 border border-ash-border rounded-xl text-xs font-mono bg-silver-container text-primary"
                  />
                  <button
                    onClick={handleCopyShareLink}
                    className="px-3.5 py-2 bg-charcoal-dark hover:opacity-90 text-on-primary font-bold text-xs rounded-xl transition-all shrink-0 shadow-sm"
                  >
                    {copiedLink ? 'Copied! ✓' : 'Copy Link'}
                  </button>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-electric-indigo hover:underline flex items-center gap-1"
                  >
                    <span>↗</span> Open Public Form
                  </a>

                  <button
                    onClick={() => setShareModalForm(null)}
                    className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Archive Form Confirmation Modal */}
      {archiveModalForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-sm w-full p-6 text-left space-y-4">
            <h3 className="font-bold text-charcoal-dark text-base">Archive form: {archiveModalForm.title}?</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Archiving will freeze this form permanently and reject any future public response submissions (returns HTTP 410 Gone). You can restore it anytime with Unarchive.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setArchiveModalForm(null)}
                className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmArchive}
                disabled={archiving}
                className="px-4 py-2 bg-error hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
              >
                {archiving ? 'Archiving...' : 'Archive Form'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Form Confirmation Modal */}
      {deleteModalForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-sm w-full p-6 text-left space-y-4">
            <h3 className="font-bold text-charcoal-dark text-base">Delete form: {deleteModalForm.title}?</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Are you sure you want to permanently delete this form? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteModalForm(null)}
                className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-error hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Form'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionsModalForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-lg w-full p-6 text-left space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-ash-border pb-3">
              <h3 className="font-bold text-charcoal-dark text-sm flex items-center gap-2">
                <span>📜</span> Version History: {showVersionsModalForm.title}
              </h3>
              <button onClick={() => setShowVersionsModalForm(null)} className="text-secondary hover:text-primary font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingVersions ? (
                <p className="text-xs text-secondary py-6 text-center">Loading versions...</p>
              ) : versionsList.length === 0 ? (
                <p className="text-xs text-secondary py-6 text-center">No version history found.</p>
              ) : (
                versionsList.map(v => (
                  <div key={v.id} className="p-3.5 border border-ash-border rounded-xl bg-silver-container/30 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-charcoal-dark">Version {v.version_number}</span>
                        {v.is_active && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-mint-emerald/10 text-mint-emerald rounded-full border border-mint-emerald/20">Active</span>
                        )}
                        {!v.published_at && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-warm-amber/10 text-warm-amber rounded-full border border-warm-amber/20">Draft</span>
                        )}
                      </div>
                      <p className="text-[11px] text-secondary mt-1">
                        {v.published_at ? `Published: ${new Date(v.published_at).toLocaleString()}` : 'Draft Snapshot (Unpublished)'}
                      </p>
                      <p className="text-[10px] text-secondary mt-0.5">{v.field_count} Fields</p>
                    </div>

                    <button
                      onClick={() => handleViewVersionDetail(showVersionsModalForm.id, v.id)}
                      className="px-3 py-1 text-xs font-semibold bg-silver-container hover:bg-ash-border text-primary rounded-lg transition-colors"
                    >
                      View Fields
                    </button>
                  </div>
                ))
              )}

              {viewingVersionDetail && (
                <div className="mt-4 p-4 border border-electric-indigo/30 rounded-xl bg-electric-indigo/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-electric-indigo">
                      Fields Snapshot for Version {viewingVersionDetail.version_number}
                    </h4>
                    <button onClick={() => setViewingVersionDetail(null)} className="text-[11px] font-bold text-electric-indigo hover:underline">
                      Close Snapshot
                    </button>
                  </div>
                  {viewingVersionDetail.fields.length === 0 ? (
                    <p className="text-xs text-secondary">No fields in this version.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {viewingVersionDetail.fields.map((f, i) => (
                        <div key={f.id} className="text-xs bg-surface p-2 border border-ash-border rounded flex items-center justify-between">
                          <span className="font-medium text-charcoal-dark">{i + 1}. {f.label}</span>
                          <span className="text-[10px] text-secondary uppercase">{f.field_type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-ash-border flex justify-end">
              <button onClick={() => setShowVersionsModalForm(null)} className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </SaaSAppShell>
  );
};
