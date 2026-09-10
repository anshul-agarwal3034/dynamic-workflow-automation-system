const SubmissionsView = (props) => {
  const formIdFromProps = props && props.id ? props.id : null;
  const [viewMode, setViewMode] = React.useState('table'); // 'table' | 'cards'
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedSubmission, setSelectedSubmission] = React.useState(null);

  const [forms, setForms] = React.useState([]);
  const [selectedFormId, setSelectedFormId] = React.useState(formIdFromProps || '');
  const [submissions, setSubmissions] = React.useState([]);
  const [loadingForms, setLoadingForms] = React.useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = React.useState(false);
  const [error, setError] = React.useState('');

  // Fetch all user forms on initial mount
  React.useEffect(() => {
    let isMounted = true;
    const fetchForms = async () => {
      try {
        setLoadingForms(true);
        const data = await formsApi.listForms();
        if (!isMounted) return;
        const formsList = Array.isArray(data) ? data : [];
        setForms(formsList);

        if (formIdFromProps && formsList.some(f => f.id === formIdFromProps)) {
          setSelectedFormId(formIdFromProps);
        } else if (formsList.length > 0 && !selectedFormId) {
          setSelectedFormId(formsList[0].id);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load forms list:', err);
        setError('Failed to load forms. Please ensure your authentication session is active.');
      } finally {
        if (isMounted) setLoadingForms(false);
      }
    };
    fetchForms();
    return () => { isMounted = false; };
  }, [formIdFromProps]);

  // Load real submissions whenever selectedFormId changes
  const loadSubmissions = React.useCallback(async (fId) => {
    if (!fId) {
      setSubmissions([]);
      return;
    }
    try {
      setLoadingSubmissions(true);
      setError('');
      const data = await formsApi.getFormSubmissions(fId);
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load submissions for form:', err);
      setError(err.message || 'Failed to load submissions for the selected form.');
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedFormId) {
      loadSubmissions(selectedFormId);
    }
  }, [selectedFormId, loadSubmissions]);

  const selectedForm = forms.find(f => f.id === selectedFormId);

  // Filter submissions by response ID, respondent values, or file names
  const filteredSubmissions = submissions.filter(sub => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesId = (sub.response_id && sub.response_id.toLowerCase().includes(q)) ||
                      (sub.submission_id && sub.submission_id.toLowerCase().includes(q));
    const matchesAnswers = (sub.answers || []).some(ans => {
      const valStr = Array.isArray(ans.value) ? ans.value.join(' ') : String(ans.value || '');
      const fnStr = String(ans.file_name || '');
      const labelStr = String(ans.field_label || '');
      return valStr.toLowerCase().includes(q) || fnStr.toLowerCase().includes(q) || labelStr.toLowerCase().includes(q);
    });
    return matchesId || matchesAnswers;
  });

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(ts);
    }
  };

  return (
    <SaaSAppShell activeTab="submissions" searchVal={searchQuery} onSearchChange={setSearchQuery}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Workspace Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ash-border pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-silver-container text-primary border border-ash-border text-xs font-bold mb-2">
              <span>📥</span> FormPilotX Response Browser & Analytics
            </div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-charcoal-dark tracking-tight">
              Submissions & Responses
            </h1>
            <p className="font-body-md text-body-md text-secondary mt-1">Browse, filter, and inspect incoming form responses in real time</p>
          </div>

          {/* Dual View Toggle: Table vs Cards */}
          <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-ash-border shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-charcoal-dark text-on-primary shadow-sm'
                  : 'text-secondary hover:text-primary hover:bg-silver-container'
              }`}
            >
              <span>📊</span> Table View
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-charcoal-dark text-on-primary shadow-sm'
                  : 'text-secondary hover:text-primary hover:bg-silver-container'
              }`}
            >
              <span>🗂️</span> Card View
            </button>
          </div>
        </div>

        {/* Form Selector Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface border border-ash-border rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider">Select Form:</label>
            {loadingForms ? (
              <span className="text-xs text-secondary italic">Loading forms...</span>
            ) : forms.length === 0 ? (
              <span className="text-xs text-secondary italic">No forms created yet</span>
            ) : (
              <select
                value={selectedFormId}
                onChange={(e) => setSelectedFormId(e.target.value)}
                className="px-3.5 py-2 bg-silver-container border border-ash-border rounded-xl text-xs font-bold text-charcoal-dark focus:outline-none focus:ring-2 focus:ring-electric-indigo/20 cursor-pointer max-w-xs sm:max-w-md truncate"
              >
                {forms.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.title || 'Untitled Form'} ({f.status || 'draft'})
                  </option>
                ))}
              </select>
            )}

            {selectedForm && (
              <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                selectedForm.status === 'published'
                  ? 'bg-mint-emerald/10 text-mint-emerald border border-mint-emerald/20'
                  : selectedForm.status === 'archived'
                  ? 'bg-error/10 text-error border border-error/20'
                  : 'bg-warm-amber/10 text-warm-amber border border-warm-amber/20'
              }`}>
                {selectedForm.status ? selectedForm.status.toUpperCase() : 'DRAFT'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadSubmissions(selectedFormId)}
              disabled={loadingSubmissions || !selectedFormId}
              className="px-3 py-1.5 text-xs font-bold bg-silver-container hover:bg-ash-border text-primary rounded-xl transition-all flex items-center gap-1.5 border border-ash-border"
              title="Refresh submissions"
            >
              <span className={loadingSubmissions ? 'animate-spin' : ''}>🔄</span> Refresh
            </button>
            {selectedForm && selectedForm.share_slug && selectedForm.status === 'published' && (
              <a
                href={`http://127.0.0.1:8000/app/public/index.html#/public/forms/${selectedForm.share_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-bold bg-electric-indigo/10 hover:bg-electric-indigo/20 text-electric-indigo border border-electric-indigo/20 rounded-xl transition-all flex items-center gap-1.5"
              >
                <span>🔗</span> Public Form ↗
              </a>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-error/10 border border-error/20 text-error text-xs rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadSubmissions(selectedFormId)}
              className="px-3 py-1 bg-error text-white font-bold text-xs rounded-lg hover:opacity-90"
            >
              Retry
            </button>
          </div>
        )}

        {/* Metric Summary Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-surface border border-ash-border rounded-2xl p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Total Submissions</span>
            <p className="font-display-lg text-display-lg font-black text-charcoal-dark">
              {loadingSubmissions ? '...' : submissions.length}
            </p>
            <p className="text-[11px] text-mint-emerald font-bold">Live database synced</p>
          </div>

          <div className="bg-surface border border-ash-border rounded-2xl p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Active Form</span>
            <p className="font-headline-sm text-base font-black text-charcoal-dark truncate">
              {selectedForm ? (selectedForm.title || 'Untitled Form') : 'None Selected'}
            </p>
            <p className="text-[11px] text-cyan-accent font-bold">
              {selectedForm ? `Status: ${selectedForm.status}` : 'Select a form above'}
            </p>
          </div>

          <div className="bg-surface border border-ash-border rounded-2xl p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Latest Submission</span>
            <p className="font-headline-sm text-sm font-black text-charcoal-dark truncate">
              {submissions.length > 0 ? formatTimestamp(submissions[0].submitted_at) : 'No submissions yet'}
            </p>
            <p className="text-[11px] text-electric-indigo font-bold">
              {submissions.length > 0 ? submissions[0].response_id : 'Awaiting responses'}
            </p>
          </div>
        </div>

        {/* Submissions Content: Loading, Empty, or Data Display */}
        {loadingSubmissions ? (
          <div className="bg-surface border border-ash-border rounded-2xl p-12 text-center shadow-sm space-y-3">
            <div className="inline-block animate-spin text-2xl">⏳</div>
            <p className="text-xs font-bold text-charcoal-dark">Fetching live submissions from database...</p>
            <p className="text-[11px] text-secondary">Resolving response values and uploaded file records</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="bg-surface border border-ash-border rounded-2xl p-12 text-center shadow-sm space-y-4">
            <div className="text-4xl">📝</div>
            <h3 className="font-bold text-charcoal-dark text-base">No Forms Found</h3>
            <p className="text-xs text-secondary max-w-md mx-auto">
              You haven't created any forms yet. Create and publish a form to start collecting real-time submissions.
            </p>
            <button
              onClick={() => navigate('/forms/create')}
              className="px-4 py-2 bg-charcoal-dark text-on-primary font-bold text-xs rounded-xl shadow-sm hover:opacity-90 transition-all"
            >
              Create New Form
            </button>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-surface border border-ash-border rounded-2xl p-12 text-center shadow-sm space-y-4">
            <div className="text-4xl">📭</div>
            <h3 className="font-bold text-charcoal-dark text-base">No Submissions Recorded Yet</h3>
            <p className="text-xs text-secondary max-w-md mx-auto">
              This form hasn't received any responses yet. Share your published form link to collect responses.
            </p>
            {selectedForm && selectedForm.share_slug && selectedForm.status === 'published' && (
              <a
                href={`http://127.0.0.1:8000/app/public/index.html#/public/forms/${selectedForm.share_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-electric-indigo text-white font-bold text-xs rounded-xl shadow-sm hover:opacity-90 transition-all"
              >
                <span>🔗</span>
                <span>Open Public Form Link</span>
              </a>
            )}
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="bg-surface border border-ash-border rounded-2xl p-8 text-center shadow-sm space-y-2">
            <div className="text-2xl">🔍</div>
            <p className="text-xs font-bold text-charcoal-dark">No matching submissions found</p>
            <p className="text-[11px] text-secondary">No submissions matched "{searchQuery}". Try a different keyword.</p>
          </div>
        ) : viewMode === 'table' ? (
          /* View Mode 1: Data Table */
          <div className="bg-surface border border-ash-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-charcoal-dark">
                <thead>
                  <tr className="border-b border-ash-border text-secondary uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-bold">Response ID</th>
                    <th className="py-3 px-4 font-bold">Submitted At</th>
                    <th className="py-3 px-4 font-bold">Answers Preview</th>
                    <th className="py-3 px-4 font-bold">Files</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ash-border">
                  {filteredSubmissions.map((sub) => {
                    const fileAnswers = (sub.answers || []).filter(a => a.field_type === 'file' || a.file_url);
                    const textAnswers = (sub.answers || []).filter(a => a.field_type !== 'file' && !a.file_url);

                    return (
                      <tr key={sub.submission_id} className="hover:bg-silver-container/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-electric-indigo whitespace-nowrap">
                          {sub.response_id}
                        </td>
                        <td className="py-3.5 px-4 text-secondary whitespace-nowrap">
                          {formatTimestamp(sub.submitted_at)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 max-w-md">
                            {textAnswers.slice(0, 2).map((a, idx) => (
                              <div key={idx} className="truncate text-[11px] text-charcoal-dark">
                                <span className="font-semibold text-secondary">{a.field_label}: </span>
                                <span>{Array.isArray(a.value) ? a.value.join(', ') : String(a.value ?? '')}</span>
                              </div>
                            ))}
                            {textAnswers.length > 2 && (
                              <span className="text-[10px] text-secondary font-medium block">
                                +{textAnswers.length - 2} more answers
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {fileAnswers.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {fileAnswers.map((fa, fIdx) => (
                                <a
                                  key={fIdx}
                                  href={fa.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-electric-indigo/10 hover:bg-electric-indigo/20 text-electric-indigo rounded text-[11px] font-bold transition-all truncate max-w-[180px]"
                                  title={fa.file_name || 'View file in new tab'}
                                >
                                  <span>📎</span>
                                  <span className="truncate">{fa.file_name || 'View File'}</span>
                                  <span className="text-[10px]">↗</span>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-secondary text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="px-3 py-1.5 text-xs font-bold bg-charcoal-dark hover:opacity-90 text-on-primary rounded-lg transition-all shadow-sm"
                          >
                            View Answers
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* View Mode 2: Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredSubmissions.map((sub) => {
              const fileAnswers = (sub.answers || []).filter(a => a.field_type === 'file' || a.file_url);

              return (
                <div key={sub.submission_id} className="bg-surface border border-ash-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-ash-border pb-3">
                    <div>
                      <span className="font-mono text-[11px] text-electric-indigo font-bold block">{sub.response_id}</span>
                      <h3 className="font-bold text-sm text-charcoal-dark">{selectedForm?.title || 'Form Submission'}</h3>
                    </div>
                    <span className="text-[10px] text-secondary font-mono">
                      {formatTimestamp(sub.submitted_at)}
                    </span>
                  </div>

                  <div className="p-3.5 bg-silver-container rounded-xl border border-ash-border space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Answers Summary</p>
                    <div className="space-y-1.5 text-xs">
                      {(sub.answers || []).slice(0, 4).map((ans, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] gap-2">
                          <span className="text-secondary truncate max-w-[140px]">{ans.field_label}:</span>
                          {ans.field_type === 'file' || ans.file_url ? (
                            <a
                              href={ans.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-electric-indigo font-bold hover:underline truncate max-w-[180px]"
                            >
                              📎 {ans.file_name || 'View File'} ↗
                            </a>
                          ) : (
                            <span className="font-medium text-charcoal-dark truncate max-w-[180px]">
                              {Array.isArray(ans.value) ? ans.value.join(', ') : String(ans.value ?? '')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {fileAnswers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {fileAnswers.map((fa, fIdx) => (
                        <a
                          key={fIdx}
                          href={fa.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-electric-indigo/10 hover:bg-electric-indigo/20 text-electric-indigo text-xs font-bold rounded-lg transition-colors truncate max-w-[220px]"
                        >
                          <span>📎</span>
                          <span className="truncate">{fa.file_name || 'File Attachment'}</span>
                          <span>↗</span>
                        </a>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedSubmission(sub)}
                    className="w-full py-2 bg-charcoal-dark hover:opacity-90 text-on-primary font-bold text-xs rounded-xl transition-all"
                  >
                    Inspect Full Submission
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inspect Submission Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-lg w-full p-6 text-left space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-ash-border pb-3">
              <div>
                <span className="font-mono text-[11px] text-electric-indigo font-bold">{selectedSubmission.response_id}</span>
                <h3 className="font-bold text-charcoal-dark text-base">{selectedForm?.title || 'Form Submission'}</h3>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-secondary hover:text-primary text-sm font-bold w-7 h-7 rounded-lg hover:bg-silver-container flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-secondary bg-silver-container p-3 rounded-xl border border-ash-border">
              <div>
                <span className="font-bold text-charcoal-dark block">Submission Details</span>
                <span className="text-[10px] font-mono text-secondary">UUID: {selectedSubmission.submission_id}</span>
              </div>
              <div className="text-right">
                <span className="block font-bold text-charcoal-dark">Recorded</span>
                <span className="text-[10px] text-secondary">{formatTimestamp(selectedSubmission.submitted_at)}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Submitted Answers ({selectedSubmission.answers?.length || 0})</p>
              {(selectedSubmission.answers || []).map((ans, idx) => (
                <div key={idx} className="p-3 bg-silver-container/50 border border-ash-border rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-secondary">{ans.field_label}</p>
                    <span className="text-[10px] uppercase font-mono text-slate-500 bg-silver-container px-1.5 py-0.5 rounded border border-ash-border">
                      {ans.field_type}
                    </span>
                  </div>

                  {ans.field_type === 'file' || ans.file_url ? (
                    <div className="flex items-center justify-between p-2.5 bg-surface border border-ash-border rounded-lg">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">📁</span>
                        <span className="text-xs font-bold text-charcoal-dark truncate">{ans.file_name || 'Uploaded File'}</span>
                      </div>
                      {ans.file_url && (
                        <a
                          href={ans.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-electric-indigo text-white font-bold text-xs rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0 shadow-sm"
                        >
                          <span>View File</span>
                          <span>↗</span>
                        </a>
                      )}
                    </div>
                  ) : ans.field_type === 'rating' ? (
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                      <span>{'★'.repeat(Number(ans.value) || 0)}</span>
                      <span className="text-secondary ml-1 font-normal">({ans.value} / 5)</span>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-charcoal-dark whitespace-pre-wrap">
                      {Array.isArray(ans.value) ? ans.value.join(', ') : String(ans.value ?? '—')}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-ash-border flex justify-end">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </SaaSAppShell>
  );
};
