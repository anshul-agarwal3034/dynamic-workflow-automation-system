const SubmissionsView = (props) => {
  const { t } = typeof useLanguage === 'function' ? useLanguage() : { t: (k) => (window.t ? window.t(k) : k) };
  const formIdFromProps = props && props.id ? props.id : null;
  const [viewMode, setViewMode] = React.useState('table'); // 'table' | 'cards'
  const [selectedSubmission, setSelectedSubmission] = React.useState(null);

  // Forms state
  const [forms, setForms] = React.useState([]);
  const [selectedFormId, setSelectedFormId] = React.useState(formIdFromProps || '');
  const [loadingForms, setLoadingForms] = React.useState(true);

  // Server-Side Query & Pagination state
  const [responses, setResponses] = React.useState([]);
  const [loadingResponses, setLoadingResponses] = React.useState(false);
  const [error, setError] = React.useState('');

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [totalCount, setTotalCount] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);

  // Filters state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all'); // 'all' | 'completed' | 'in_progress'
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  // Bulk Management State
  const [selectedResponseIds, setSelectedResponseIds] = React.useState([]);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deletingBulk, setDeletingBulk] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');

  // Export State
  const [exportingCsv, setExportingCsv] = React.useState(false);
  const [exportingJson, setExportingJson] = React.useState(false);

  // Retention Modal State
  const [showRetentionModal, setShowRetentionModal] = React.useState(false);
  const [retentionDaysInput, setRetentionDaysInput] = React.useState('');
  const [savingRetention, setSavingRetention] = React.useState(false);
  const [retentionMessage, setRetentionMessage] = React.useState(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = React.useState('');
  const toastTimeoutRef = React.useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  // 1. Debounce Search Input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 2. Fetch User Forms on initial mount
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

  // When selectedFormId changes, sync retention policy input and reset selections
  const selectedForm = forms.find(f => f.id === selectedFormId);
  React.useEffect(() => {
    if (selectedForm) {
      setRetentionDaysInput(selectedForm.retention_days ? String(selectedForm.retention_days) : '');
    }
    setSelectedResponseIds([]);
  }, [selectedFormId, selectedForm]);

  // 3. Reset page when filters change
  const isInitialMount = React.useRef(true);
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPage(1);
    setSelectedResponseIds([]);
  }, [selectedFormId, debouncedSearch, statusFilter, dateFrom, dateTo, pageSize]);

  // 4. Server-Side Fetch Responses
  const loadResponses = React.useCallback(async () => {
    if (!selectedFormId) {
      setResponses([]);
      setTotalCount(0);
      setTotalPages(1);
      return;
    }

    try {
      setLoadingResponses(true);
      setError('');
      const params = {
        page,
        page_size: pageSize
      };
      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (dateFrom) {
        params.from_date = dateFrom;
      }
      if (dateTo) {
        params.to_date = `${dateTo}T23:59:59`;
      }

      const res = await formsApi.getFormResponses(selectedFormId, params);
      setResponses(res.items || []);
      setTotalCount(res.total_count || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      console.error('Failed to load paginated responses:', err);
      setError(err.message || 'Failed to load responses for the selected form.');
      setResponses([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoadingResponses(false);
    }
  }, [selectedFormId, page, pageSize, debouncedSearch, statusFilter, dateFrom, dateTo]);

  React.useEffect(() => {
    loadResponses();
  }, [loadResponses]);

  // Auto-Select Form & Open Submission via Deep Link Params (?formId=...&ref=...)
  React.useEffect(() => {
    const hash = window.location.hash || '';
    const queryIndex = hash.indexOf('?');
    if (queryIndex !== -1) {
      const params = new URLSearchParams(hash.slice(queryIndex));
      const targetFormId = params.get('formId');
      const targetRef = params.get('ref');

      if (targetFormId && (!selectedFormId || String(selectedFormId) !== String(targetFormId))) {
        setSelectedFormId(targetFormId);
      }

      const submissions = responses;
      if (targetRef && submissions && submissions.length > 0) {
        const cleanRef = targetRef.trim().toLowerCase();
        const match = submissions.find(
          s => (s.reference_code && s.reference_code.trim().toLowerCase() === cleanRef) ||
               (s.response_id && s.response_id.trim().toLowerCase() === cleanRef) ||
               String(s.id) === targetRef ||
               String(s.submission_id) === targetRef ||
               `resp-${s.id}` === cleanRef ||
               `resp-${s.submission_id}` === cleanRef ||
               `sub-${s.id}` === cleanRef ||
               `sub-${s.submission_id}` === cleanRef ||
               (s.id && `sub-${String(s.id).slice(0, 8)}`.toLowerCase() === cleanRef) ||
               (s.submission_id && `sub-${String(s.submission_id).slice(0, 8)}`.toLowerCase() === cleanRef)
        );
        if (match) {
          setSelectedSubmission(match); // Auto-opens the response details modal
        }
      }
    }
  }, [responses, selectedFormId, window.location.hash]);

  // 5. Reset All Filters Helper
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setSelectedResponseIds([]);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(ts);
    }
  };

  // 6. Selection Handlers
  const allCurrentPageSelected = responses.length > 0 && responses.every(r => selectedResponseIds.includes(r.submission_id));
  const someCurrentPageSelected = responses.length > 0 && responses.some(r => selectedResponseIds.includes(r.submission_id));

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      const pageIds = new Set(responses.map(r => r.submission_id));
      setSelectedResponseIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const newIds = new Set([...selectedResponseIds, ...responses.map(r => r.submission_id)]);
      setSelectedResponseIds(Array.from(newIds));
    }
  };

  const toggleSelectRow = (subId) => {
    setSelectedResponseIds(prev =>
      prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]
    );
  };

  // 7. Bulk Delete Execution
  const handleConfirmDelete = async () => {
    if (!selectedFormId || selectedResponseIds.length === 0) return;
    try {
      setDeletingBulk(true);
      setDeleteError('');
      const res = await formsApi.bulkDeleteResponses(selectedFormId, selectedResponseIds);
      const count = res.deleted_count !== undefined ? res.deleted_count : selectedResponseIds.length;
      setSelectedResponseIds([]);
      setShowDeleteModal(false);
      showToast(`Successfully deleted ${count} response(s)`);
      await loadResponses();
    } catch (err) {
      console.error('Delete error:', err);
      setDeleteError(err.message || 'Failed to delete selected responses');
    } finally {
      setDeletingBulk(false);
    }
  };

  // 8. Retention Settings Handlers
  const handleOpenRetention = () => {
    if (selectedForm) {
      setRetentionDaysInput(selectedForm.retention_days ? String(selectedForm.retention_days) : '');
    }
    setRetentionMessage(null);
    setShowRetentionModal(true);
  };

  const handleSaveRetention = async () => {
    if (!selectedFormId) return;
    try {
      setSavingRetention(true);
      setRetentionMessage(null);
      const days = retentionDaysInput !== '' && !isNaN(Number(retentionDaysInput)) && Number(retentionDaysInput) > 0
        ? Number(retentionDaysInput)
        : null;

      const res = await formsApi.updateFormRetention(selectedFormId, days);
      setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, retention_days: res.retention_days } : f));

      const purgeText = res.purged_count > 0 ? ` (${res.purged_count} expired response(s) purged)` : '';
      setRetentionMessage({
        type: 'success',
        text: `Retention policy updated to ${res.retention_days ? `${res.retention_days} days` : 'indefinite'}${purgeText}`
      });

      showToast(`Retention updated${purgeText}`);
      setTimeout(() => {
        setShowRetentionModal(false);
        setRetentionMessage(null);
      }, 1200);

      await loadResponses();
    } catch (err) {
      console.error('Save retention error:', err);
      setRetentionMessage({ type: 'error', text: err.message || 'Failed to update retention policy' });
    } finally {
      setSavingRetention(false);
    }
  };

  // 9. Export Triggers
  const handleExportCSV = async () => {
    if (!selectedFormId) return;
    try {
      setExportingCsv(true);
      await formsApi.exportResponsesCSV(selectedFormId);
      showToast('CSV export downloaded successfully');
    } catch (err) {
      console.error('Export CSV error:', err);
      setError('Failed to export CSV: ' + (err.message || 'Error downloading file'));
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportJSON = async () => {
    if (!selectedFormId) return;
    try {
      setExportingJson(true);
      await formsApi.exportResponsesJSON(selectedFormId);
      showToast('JSON export downloaded successfully');
    } catch (err) {
      console.error('Export JSON error:', err);
      setError('Failed to export JSON: ' + (err.message || 'Error downloading file'));
    } finally {
      setExportingJson(false);
    }
  };

  const handleExport = handleExportCSV;
  const filteredSubmissions = responses;

  // 10. Render Pagination Page Buttons
  const renderPaginationButtons = () => {
    if (totalPages <= 1) return null;
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      buttons.push(
        <button
          key={1}
          onClick={() => setPage(1)}
          className="w-8 h-8 rounded-lg text-xs font-bold transition-all text-[#949089] hover:bg-[#20232B] hover:text-[#F5F3EF] cursor-pointer"
        >
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(<span key="ellipsis-start" className="px-1 text-[#949089] text-xs">...</span>);
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      buttons.push(
        <button
          key={p}
          onClick={() => setPage(p)}
          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            page === p
              ? 'bg-gradient-to-r from-[#C59B27] to-[#E2B858] text-[#2A1D00] shadow-sm font-bold'
              : 'text-[#949089] hover:text-[#F5F3EF] hover:bg-[#20232B]'
          }`}
        >
          {p}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(<span key="ellipsis-end" className="px-1 text-[#949089] text-xs">...</span>);
      }
      buttons.push(
        <button
          key={totalPages}
          onClick={() => setPage(totalPages)}
          className="w-8 h-8 rounded-lg text-xs font-bold transition-all text-[#949089] hover:bg-[#20232B] hover:text-[#F5F3EF] cursor-pointer"
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || dateFrom || dateTo;

  return (
    <SaaSAppShell activeTab="submissions">
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 bg-charcoal-dark text-on-primary px-4 py-3 rounded-xl shadow-2xl border border-charcoal-muted flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-3">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header & Action Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#2A2D35] pb-5">
          <div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-white tracking-tight">
              {t('submissions.title') || "Responses"}
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-[#949089] mt-1">
              {t('submissions.subtitle') || "View, search, and download submissions from your forms."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Export Actions */}
            {selectedForm && (
              <div className="flex items-center gap-1.5 bg-[#1A1D24] p-1 rounded-xl border border-[#2A2D35]">
                <button
                  onClick={handleExportCSV}
                  disabled={exportingCsv || responses.length === 0}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 text-[#949089] hover:text-[#F5F3EF] hover:bg-[#16181D] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Export all completed responses as Excel-ready CSV"
                >
                  <span>{exportingCsv ? '⏳' : '📊'}</span>
                  <span>{exportingCsv ? 'Exporting...' : t('submissions.exportCsv')}</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  disabled={exportingJson || responses.length === 0}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 text-[#949089] hover:text-[#F5F3EF] hover:bg-[#16181D] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Export all completed responses as structured JSON"
                >
                  <span>{exportingJson ? '⏳' : '📄'}</span>
                  <span>{exportingJson ? 'Exporting...' : t('submissions.exportJson')}</span>
                </button>
              </div>
            )}

            {/* Retention Policy Trigger */}
            {selectedForm && (
              <button
                onClick={handleOpenRetention}
                className="px-3.5 py-2 bg-[#16181D] hover:bg-[#20232B] text-[#F5F3EF] font-bold text-xs rounded-xl transition-all border border-[#2A2D35] flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Configure automated retention and auto-purge threshold"
              >
                <span>⏱️</span>
                <span>{t('submissions.retentionPolicy')}</span>
                {selectedForm.retention_days && (
                  <span className="w-2 h-2 rounded-full bg-[#E2B858]"></span>
                )}
              </button>
            )}

            {/* Analytics Navigation */}
            {selectedForm && (
              <button
                onClick={() => navigate(`/forms/${selectedForm.id}/analytics`)}
                className="px-3.5 py-2 bg-[#16181D] hover:bg-[#20232B] text-[#F5F3EF] font-bold text-xs rounded-xl transition-all border border-[#2A2D35] flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>📈</span> {t('submissions.analyticsButton')}
              </button>
            )}

            {/* Dual View Toggle: Table vs Cards */}
            <div className="flex items-center gap-1 bg-[#1A1D24] p-1 rounded-xl border border-[#2A2D35]">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-gradient-to-r from-[#C59B27] to-[#E2B858] text-[#2A1D00] shadow-sm'
                    : 'text-[#949089] hover:text-[#F5F3EF] hover:bg-[#16181D]'
                }`}
              >
                <span>📊</span> {t('submissions.viewTable')}
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-gradient-to-r from-[#C59B27] to-[#E2B858] text-[#2A1D00] shadow-sm'
                    : 'text-[#949089] hover:text-[#F5F3EF] hover:bg-[#16181D]'
                }`}
              >
                <span>🗂️</span> {t('submissions.viewCards')}
              </button>
            </div>
          </div>
        </div>

        {/* Header & Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
          {/* Form Dropdown Selector */}
          <div className="w-full sm:w-72">
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="w-full bg-[#1A1D24] border border-[#2A2D35] text-white text-xs sm:text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[#E2B858]"
            >
              <option value="">Select a form...</option>
              {forms.map(f => (
                <option key={f.id} value={f.id}>{f.title}</option>
              ))}
            </select>
          </div>

          {/* Search & Action Buttons */}
          {selectedFormId && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8E929C] text-sm">search</span>
                <input
                  type="text"
                  placeholder="Search responses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1A1D24] border border-[#2A2D35] text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#E2B858]"
                />
              </div>
              {/* Export Button (Compact on mobile) */}
              {handleExport && (
                <button
                  onClick={handleExport}
                  className="px-3 py-2 bg-[#252830] hover:bg-[#2F333E] text-white text-xs font-semibold rounded-xl border border-[#2A2D35] flex items-center gap-1 shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Secondary Filter Bar */}
        {selectedFormId && (
          <div className="bg-[#1A1D24] border border-[#2A2D35] rounded-xl p-3 shadow-sm mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-bold text-[#949089] uppercase tracking-wider">{t('submissions.statusLabel')}</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-[#16181D] border border-[#2A2D35] rounded-lg text-xs font-bold text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
              >
                <option value="all">{t('submissions.allStatuses')}</option>
                <option value="completed">{t('submissions.completedStatus')}</option>
                <option value="in_progress">{t('submissions.inProgressStatus')}</option>
              </select>

              <label className="text-xs font-bold text-[#949089] uppercase tracking-wider ml-1">{t('submissions.fromLabel')}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 py-1 bg-[#16181D] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] [color-scheme:dark]"
              />
              <label className="text-xs font-bold text-[#949089] uppercase tracking-wider">{t('submissions.toLabel')}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1 bg-[#16181D] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] [color-scheme:dark]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-[#16181D] border border-[#2A2D35] rounded-lg text-xs font-bold text-[#F5F3EF]"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 text-xs font-bold bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] rounded-lg border border-[#2A2D35]"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-error-container/40 border border-error/20 rounded-xl text-xs text-error font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadResponses()}
              className="px-3 py-1 bg-error text-white font-bold text-xs rounded-lg hover:opacity-90"
            >
              Retry
            </button>
          </div>
        )}

        {/* Submissions Content: Loading, Empty, Table, or Cards */}
        {!selectedFormId ? (
          <div className="text-center py-20 text-[#8E929C]">Select a form from the dropdown above to view submissions.</div>
        ) : loadingResponses ? (
          <div className="bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-16 text-center shadow-lg space-y-3">
            <div className="inline-block animate-spin text-3xl">⏳</div>
            <p className="text-xs font-bold text-[#F5F3EF]">Loading server-side responses...</p>
            <p className="text-[11px] text-[#949089]">Fetching filtered submission items from database</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-12 text-center shadow-sm space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#16181D] text-[#E2B858] flex items-center justify-center text-2xl mx-auto mb-4 border border-[#2A2D35] shadow-inner">
              📝
            </div>
            <h3 className="font-bold text-[#F5F3EF] text-lg tracking-tight mb-1.5">No Forms Found</h3>
            <p className="text-xs text-[#949089] max-w-md mx-auto mb-6 leading-relaxed">
              You haven't created any forms yet. Create and publish a form to start collecting real-time submissions.
            </p>
            <button
              onClick={() => navigate('/forms/create')}
              className="px-5 py-2.5 bg-gradient-to-r from-[#DFB257] to-[#E2B858] hover:brightness-110 text-[#121316] font-bold text-xs rounded-xl shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Create New Form</span>
            </button>
          </div>
        ) : responses.length === 0 ? (
          <div className="bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-12 text-center shadow-lg space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#232730] border border-[#2E333D] flex items-center justify-center text-2xl mx-auto mb-2 text-[#DFB257]">
              🔍
            </div>
            <h3 className="font-bold text-[#F5F3EF] text-base tracking-tight">{t('submissions.noMatchingTitle')}</h3>
            <p className="text-xs text-[#949089] max-w-md mx-auto leading-relaxed">
              {hasActiveFilters
                ? 'No responses match the specified search keywords, status, or date range filters.'
                : t('submissions.noMatchingSubtitle')}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-gradient-to-r from-[#C59B27] to-[#E2B858] hover:brightness-110 text-[#2A1D00] font-bold text-xs rounded-xl mt-2 shadow-sm transition-all cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* View Mode 1: Table View with Multi-Select */
          <div className="bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="hidden md:block overflow-x-auto rounded-xl border border-[#2A2D35] bg-[#1A1D24]">
              <table className="w-full text-left text-xs text-[#F5F3EF]">
                <thead>
                  <tr className="border-b border-[#2A2D35] text-[#949089] uppercase tracking-wider text-[10px]">
                    {/* Header Checkbox */}
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allCurrentPageSelected}
                        ref={el => {
                          if (el) el.indeterminate = someCurrentPageSelected && !allCurrentPageSelected;
                        }}
                        onChange={toggleSelectAll}
                        className="rounded border-[#2A2D35] bg-[#16181D] text-[#E2B858] focus:ring-0 cursor-pointer w-4 h-4"
                        title="Select/Deselect all rows on this page"
                      />
                    </th>
                    <th className="py-3 px-4 font-bold">Reference Code</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold">Submitted At & Duration</th>
                    <th className="py-3 px-4 font-bold">Answers Preview</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2D35]">
                  {responses.map((sub) => {
                    const textAnswers = (sub.answers || []).filter(a => a.field_type !== 'file');
                    const fileAnswers = (sub.answers || []).filter(a => a.field_type === 'file' || a.file_url);
                    const isCompleted = sub.status === 'completed';
                    const isSelected = selectedResponseIds.includes(sub.submission_id);

                    return (
                      <tr
                        key={sub.submission_id}
                        className={`transition-colors ${
                          isSelected ? 'bg-[#E2B858]/10 hover:bg-[#E2B858]/15' : 'hover:bg-[#20232B]/60'
                        }`}
                      >
                        {/* Row Checkbox */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(sub.submission_id)}
                            className="rounded border-[#2A2D35] bg-[#16181D] text-[#E2B858] focus:ring-0 cursor-pointer w-4 h-4"
                          />
                        </td>

                        {/* Reference Code */}
                        <td className="py-3.5 px-4 font-mono font-bold text-[#DFB257] whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-[#16181D] rounded-lg border border-[#2A2D35]">
                            {sub.response_id}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isCompleted ? (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full inline-flex items-center gap-1">
                              <span>✓</span> Completed
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full inline-flex items-center gap-1">
                              <span>⏳</span> In Progress
                            </span>
                          )}
                        </td>

                        {/* Submitted Date & Duration */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-[#F5F3EF] font-medium">
                            {sub.submitted_at ? formatTimestamp(sub.submitted_at) : (
                              <span className="text-[#949089] italic">Started {formatTimestamp(sub.started_at)}</span>
                            )}
                          </div>
                          {sub.completion_time_display && sub.completion_time_display !== '0 secs' && (
                            <span className="text-[10px] text-[#949089] font-mono block">
                              Duration: {sub.completion_time_display}
                            </span>
                          )}
                        </td>

                        {/* Answers Preview */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 max-w-sm sm:max-w-md">
                            {textAnswers.length === 0 && fileAnswers.length === 0 && (
                              <span className="text-[11px] text-[#949089] italic">No answers recorded</span>
                            )}
                            {textAnswers.slice(0, 3).map((ans, idx) => (
                              <div key={idx} className="truncate text-[11px] text-[#F5F3EF]">
                                <span className="font-semibold text-[#949089]">{ans.field_label}: </span>
                                <span>{Array.isArray(ans.value) ? ans.value.join(', ') : String(ans.value ?? '')}</span>
                              </div>
                            ))}
                            {textAnswers.length > 3 && (
                              <span className="text-[10px] text-[#949089] font-medium block">
                                +{textAnswers.length - 3} more answers
                              </span>
                            )}
                            {fileAnswers.length > 0 && (
                              <div className="flex items-center gap-1 pt-0.5">
                                <span className="text-[10px] text-[#949089] font-mono">📎 {fileAnswers.length} file attached</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions: View Answers */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="px-3 py-1.5 text-xs font-bold bg-[#20232B] hover:bg-[#2A2E38] text-[#F5F3EF] hover:text-[#E2B858] rounded-xl transition-all border border-[#2A2D35] shadow-sm flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <span>Inspect</span>
                            <span>→</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Submissions Card Stream */}
            <div className="md:hidden flex flex-col gap-2.5">
              {filteredSubmissions.map((sub, idx) => {
                const answersList = Array.isArray(sub.answers)
                  ? sub.answers.map(a => [a.field_label || 'Answer', Array.isArray(a.value) ? a.value.join(', ') : a.value])
                  : Object.entries(sub.answers || {});
                const firstPreview = answersList[0] ? `${answersList[0][0]}: ${answersList[0][1]}` : 'Recorded Submission';
                const refCode = sub.response_id || sub.reference_code || `RESP-${sub.id || idx + 1}`;

                return (
                  <div
                    key={sub.submission_id || sub.id || idx}
                    onClick={() => setSelectedSubmission(sub)}
                    className="p-3.5 rounded-xl bg-[#1A1D24] border border-[#2A2D35] active:bg-[#252830] transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="overflow-hidden pr-3 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-[#E2B858]">
                          {refCode}
                        </span>
                        <span className="text-[10px] text-[#8E929C]">
                          {new Date(sub.submitted_at || sub.created_at || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-[#CBD0DC] truncate">
                        {firstPreview}
                      </p>
                      {answersList.length > 1 && (
                        <p className="text-[10px] text-[#8E929C] mt-0.5">
                          +{answersList.length - 1} more answer{answersList.length - 1 > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-[#8E929C] text-sm shrink-0">
                      chevron_right
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Server-Side Pagination Bar */}
            <div className="pt-4 border-t border-[#2A2D35] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-[#949089] font-medium">
                Showing{' '}
                <span className="font-bold text-[#F5F3EF]">
                  {totalCount > 0 ? (page - 1) * pageSize + 1 : 0}
                </span>{' '}
                to{' '}
                <span className="font-bold text-[#F5F3EF]">
                  {Math.min(page * pageSize, totalCount)}
                </span>{' '}
                of <span className="font-bold text-[#F5F3EF]">{totalCount}</span> responses
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-[#2A2D35] text-xs font-bold text-[#F5F3EF] bg-[#16181D] hover:bg-[#20232B] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  ← Previous
                </button>

                <div className="flex items-center gap-1">
                  {renderPaginationButtons()}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-[#2A2D35] text-xs font-bold text-[#F5F3EF] bg-[#16181D] hover:bg-[#20232B] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* View Mode 2: Card View with Checkboxes */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {responses.map((sub) => {
                const textAnswers = (sub.answers || []).filter(a => a.field_type !== 'file');
                const fileAnswers = (sub.answers || []).filter(a => a.field_type === 'file' || a.file_url);
                const isCompleted = sub.status === 'completed';
                const isSelected = selectedResponseIds.includes(sub.submission_id);

                return (
                  <div
                    key={sub.submission_id}
                    className={`bg-[#1A1D24] border rounded-2xl p-5 shadow-lg space-y-4 flex flex-col justify-between transition-all ${
                      isSelected ? 'border-[#E2B858] bg-[#E2B858]/5' : 'border-[#2A2D35] hover:border-[#E2B858]/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-[#2A2D35] pb-3">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(sub.submission_id)}
                            className="rounded border-[#2A2D35] bg-[#16181D] text-[#E2B858] focus:ring-0 cursor-pointer w-4 h-4"
                          />
                          <div>
                            <span className="font-mono text-[11px] text-[#DFB257] font-bold block">
                              {sub.response_id}
                            </span>
                            <span className="text-[10px] text-[#949089] font-mono">
                              {sub.submitted_at ? formatTimestamp(sub.submitted_at) : `Started ${formatTimestamp(sub.started_at)}`}
                            </span>
                          </div>
                        </div>

                        {isCompleted ? (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full">
                            In Progress
                          </span>
                        )}
                      </div>

                      {/* Answers preview */}
                      <div className="p-3.5 bg-[#16181D] rounded-xl border border-[#2A2D35] space-y-1.5 mt-3 text-xs">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#949089]">Answers Summary</p>
                        {textAnswers.slice(0, 3).map((ans, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] gap-2">
                            <span className="text-[#949089] truncate max-w-[140px]">{ans.field_label}:</span>
                            <span className="font-medium text-[#F5F3EF] truncate max-w-[180px]">
                              {Array.isArray(ans.value) ? ans.value.join(', ') : String(ans.value ?? '')}
                            </span>
                          </div>
                        ))}
                        {textAnswers.length === 0 && (
                          <p className="text-[11px] text-[#949089] italic">No answers recorded</p>
                        )}
                      </div>

                      {fileAnswers.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {fileAnswers.map((fa, fIdx) => (
                            <a
                              key={fIdx}
                              href={fa.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#20232B] hover:bg-[#2A2E38] text-[#DFB257] border border-[#2A2D35] text-xs font-bold rounded-lg transition-colors truncate max-w-[200px]"
                            >
                              <span>📎</span>
                              <span className="truncate">{fa.file_name || 'File Attachment'}</span>
                              <span>↗</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedSubmission(sub)}
                      className="w-full py-2 bg-[#20232B] hover:bg-[#2A2E38] text-[#F5F3EF] hover:text-[#E2B858] border border-[#2A2D35] font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      Inspect Full Submission
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Pagination for Card View */}
            <div className="bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-[#949089] font-medium">
                Showing{' '}
                <span className="font-bold text-[#F5F3EF]">
                  {totalCount > 0 ? (page - 1) * pageSize + 1 : 0}
                </span>{' '}
                to{' '}
                <span className="font-bold text-[#F5F3EF]">
                  {Math.min(page * pageSize, totalCount)}
                </span>{' '}
                of <span className="font-bold text-[#F5F3EF]">{totalCount}</span> responses
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-[#2A2D35] text-xs font-bold text-[#F5F3EF] bg-[#16181D] hover:bg-[#20232B] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  ← Previous
                </button>
                <div className="flex items-center gap-1">
                  {renderPaginationButtons()}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-[#2A2D35] text-xs font-bold text-[#F5F3EF] bg-[#16181D] hover:bg-[#20232B] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Bulk Action Bar */}
        {selectedResponseIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-charcoal-dark text-on-primary px-5 py-3 rounded-2xl shadow-2xl border border-charcoal-muted flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-electric-indigo text-white text-xs font-bold flex items-center justify-center shadow-sm">
                {selectedResponseIds.length}
              </span>
              <span className="text-xs font-bold">responses selected</span>
            </div>

            <div className="h-4 w-px bg-white/20"></div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3.5 py-1.5 bg-error text-white font-bold text-xs rounded-xl hover:bg-error/90 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>🗑️</span>
                <span>Delete Selected</span>
              </button>

              <button
                onClick={() => setSelectedResponseIds([])}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Retention Settings Modal */}
      {showRetentionModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A2D35] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⏱️</span>
                <div>
                  <h3 className="font-bold text-[#F5F3EF] text-base">Response Retention Policy</h3>
                  <p className="text-[11px] text-[#949089] truncate max-w-[260px]">{selectedForm?.title || 'Form'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRetentionModal(false)}
                className="text-[#949089] hover:text-[#F5F3EF] text-sm font-bold w-7 h-7 rounded-lg hover:bg-[#20232B] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#949089] leading-relaxed">
              Configure automated cleanup for stored responses. Submissions older than the specified duration will be automatically purged upon policy enforcement and recorded in the audit log.
            </p>

            <div className="p-4 bg-[#16181D] rounded-xl border border-[#2A2D35] space-y-2">
              <label className="text-xs font-bold text-[#F5F3EF] block">
                Auto-Purge Responses Older Than:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="3650"
                  placeholder="e.g. 30, 60, 90 (0 to disable)"
                  value={retentionDaysInput}
                  onChange={(e) => setRetentionDaysInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs font-bold text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
                />
                <span className="text-xs font-bold text-[#949089] shrink-0">Days</span>
              </div>
              <p className="text-[10px] text-[#949089]">
                Leave empty or enter 0 to retain all response data indefinitely.
              </p>
            </div>

            <div className="text-[11px] text-[#949089] flex items-center gap-1.5 px-1">
              <span>🛡️</span>
              <span>Current policy: </span>
              <span className="font-bold text-[#F5F3EF]">
                {selectedForm?.retention_days ? `${selectedForm.retention_days} days auto-purge active` : 'No auto-purge (Indefinite retention)'}
              </span>
            </div>

            {retentionMessage && (
              <div className={`p-3 rounded-xl text-xs font-medium ${retentionMessage.type === 'error' ? 'bg-[#93000A]/30 text-[#FFDAD6] border border-[#93000A]/50' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'}`}>
                {retentionMessage.text}
              </div>
            )}

            <div className="pt-3 border-t border-[#2A2D35] flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRetentionModal(false)}
                disabled={savingRetention}
                className="px-4 py-2 bg-[#20232B] hover:bg-[#2A2E38] text-[#F5F3EF] font-bold text-xs rounded-xl transition-all cursor-pointer border border-[#2A2D35]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRetention}
                disabled={savingRetention}
                className="px-4 py-2 bg-gradient-to-r from-[#C59B27] to-[#E2B858] hover:brightness-110 text-[#2A1D00] font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {savingRetention && <span className="animate-spin">⏳</span>}
                <span>{savingRetention ? 'Saving...' : 'Save Policy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center gap-3 text-error">
              <div className="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center text-xl">
                ⚠️
              </div>
              <div>
                <h3 className="font-bold text-[#F5F3EF] text-base">Delete Form Responses</h3>
                <p className="text-xs text-[#949089]">Irreversible action</p>
              </div>
            </div>

            <p className="text-xs text-[#949089] leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-[#F5F3EF]">{selectedResponseIds.length}</strong> selected response(s)? All submitted answer data and file links will be purged. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="p-3 bg-error/20 text-[#FFDAD6] border border-error/40 rounded-xl text-xs font-medium">
                {deleteError}
              </div>
            )}

            <div className="pt-3 border-t border-[#2A2D35] flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingBulk}
                className="px-4 py-2 bg-[#20232B] hover:bg-[#2A2E38] text-[#F5F3EF] font-bold text-xs rounded-xl transition-all cursor-pointer border border-[#2A2D35]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingBulk}
                className="px-4 py-2 bg-error hover:bg-error/90 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {deletingBulk && <span className="animate-spin">⏳</span>}
                <span>{deletingBulk ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Submission Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#1A1D24] border-t sm:border border-[#2A2D35] rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col p-5 shadow-2xl text-left space-y-4">
            <div className="w-12 h-1 bg-[#2A2D35] rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between border-b border-[#2A2D35] pb-3">
              <div>
                <span className="font-mono text-[11px] text-[#DFB257] font-bold">{selectedSubmission.response_id}</span>
                <h3 className="font-bold text-[#F5F3EF] text-base">{selectedForm?.title || 'Form Submission'}</h3>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-[#949089] hover:text-[#F5F3EF] text-sm font-bold w-7 h-7 rounded-lg hover:bg-[#20232B] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-[#949089] bg-[#16181D] p-3 rounded-xl border border-[#2A2D35]">
              <div>
                <span className="font-bold text-[#F5F3EF] block">
                  Status: {selectedSubmission.status === 'completed' ? 'Completed' : 'In Progress'}
                </span>
                <span className="text-[10px] font-mono text-[#949089]">UUID: {selectedSubmission.submission_id}</span>
              </div>
              <div className="text-right">
                <span className="block font-bold text-[#F5F3EF]">
                  {selectedSubmission.submitted_at ? 'Submitted' : 'Started'}
                </span>
                <span className="text-[10px] text-[#949089]">
                  {formatTimestamp(selectedSubmission.submitted_at || selectedSubmission.started_at)}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#949089]">
                Submitted Answers ({selectedSubmission.answers?.length || 0})
              </p>
              {(selectedSubmission.answers || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-[#949089] italic">
                  No answers submitted for this session.
                </div>
              ) : (
                (selectedSubmission.answers || []).map((ans, idx) => (
                  <div key={idx} className="p-3 bg-[#16181D] border border-[#2A2D35] rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#949089]">{ans.field_label}</p>
                      <span className="text-[10px] uppercase font-mono text-[#949089] bg-[#20232B] px-1.5 py-0.5 rounded border border-[#2A2D35]">
                        {ans.field_type}
                      </span>
                    </div>

                    {ans.field_type === 'file' || ans.file_url ? (
                      <div className="flex items-center justify-between p-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-base">📁</span>
                          <span className="text-xs font-bold text-[#F5F3EF] truncate">{ans.file_name || 'Uploaded File'}</span>
                        </div>
                        {ans.file_url && (
                          <a
                            href={ans.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-[#2A2E38] text-[#DFB257] border border-[#2A2D35] font-bold text-xs rounded-lg hover:brightness-125 transition-all flex items-center gap-1 shrink-0 shadow-sm"
                          >
                            <span>View File</span>
                            <span>↗</span>
                          </a>
                        )}
                      </div>
                    ) : ans.field_type === 'rating' ? (
                      <div className="flex items-center gap-1 text-[#E2B858] font-bold text-xs">
                        <span>{'★'.repeat(Number(ans.value) || 0)}</span>
                        <span className="text-[#949089] ml-1 font-normal">({ans.value} / 5)</span>
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-[#F5F3EF] whitespace-pre-wrap">
                        {Array.isArray(ans.value) ? ans.value.join(', ') : String(ans.value ?? '—')}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#2A2D35] flex justify-end">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-[#20232B] hover:bg-[#2A2E38] text-[#F5F3EF] font-semibold text-xs rounded-xl transition-all border border-[#2A2D35] cursor-pointer"
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
