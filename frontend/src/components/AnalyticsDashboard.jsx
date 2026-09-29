const AnalyticsDashboard = (props) => {
  const { t } = typeof useLanguage === 'function' ? useLanguage() : { t: (k) => (window.t ? window.t(k) : k) };
  const initialFormId = props.id || props.formId;
  const [formsList, setFormsList] = React.useState([]);
  const [selectedFormId, setSelectedFormId] = React.useState(initialFormId || '');
  const [form, setForm] = React.useState(null);
  const [versions, setVersions] = React.useState([]);
  const [selectedVersionId, setSelectedVersionId] = React.useState('');
  const [dateFilter, setDateFilter] = React.useState('all'); // 'all' | '7d' | '30d'
  const [analytics, setAnalytics] = React.useState(null);
  const [loadingForms, setLoadingForms] = React.useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');

  // 1. Initial Load: Fetch available forms on mount
  React.useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }

    const loadForms = async () => {
      try {
        setLoadingForms(true);
        const forms = await formsApi.listForms();
        const list = Array.isArray(forms) ? forms : [];
        setFormsList(list);
      } catch (err) {
        console.error('Failed to load forms list:', err);
      } finally {
        setLoadingForms(false);
      }
    };

    loadForms();
  }, []);

  // Sync selectedFormId when route prop changes
  React.useEffect(() => {
    if (props.id && props.id !== selectedFormId) {
      setSelectedFormId(props.id);
    }
  }, [props.id]);

  // 2. Fetch Form Metadata & Versions when selectedFormId changes
  React.useEffect(() => {
    if (!selectedFormId) {
      setForm(null);
      setVersions([]);
      setAnalytics(null);
      return;
    }

    const initSelectedForm = async () => {
      setLoadingAnalytics(true);
      setError('');
      try {
        const [formData, versionsData] = await Promise.all([
          formsApi.getForm(selectedFormId).catch(() => null),
          formsApi.getFormVersions(selectedFormId).catch(() => [])
        ]);
        setForm(formData);
        setVersions(Array.isArray(versionsData) ? versionsData : []);
      } catch (err) {
        console.error('Failed to load form details for analytics:', err);
      }
    };

    setSelectedVersionId('');
    initSelectedForm();
  }, [selectedFormId]);

  // 3. Analytics Query Callback
  const fetchAnalytics = React.useCallback(async (formIdToUse = selectedFormId, verId = selectedVersionId, range = dateFilter) => {
    if (!formIdToUse) return;
    try {
      setRefreshing(true);
      setError('');
      const params = {};
      if (verId) params.version_id = verId;

      const now = Date.now();
      if (range === '7d') {
        params.from_date = new Date(now - 7 * 86400 * 1000).toISOString();
      } else if (range === '30d') {
        params.from_date = new Date(now - 30 * 86400 * 1000).toISOString();
      }

      const data = await formsApi.getFormAnalytics(formIdToUse, params);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err.message || 'Failed to calculate analytics metrics.');
    } finally {
      setRefreshing(false);
      setLoadingAnalytics(false);
    }
  }, [selectedFormId, selectedVersionId, dateFilter]);

  // Trigger analytics whenever selectedFormId, version, or date range changes
  React.useEffect(() => {
    if (selectedFormId) {
      fetchAnalytics(selectedFormId, selectedVersionId, dateFilter);
    }
  }, [selectedFormId, selectedVersionId, dateFilter, fetchAnalytics]);

  const handleFormChange = (newFormId) => {
    setSelectedFormId(newFormId);
    if (newFormId) {
      navigate(`/forms/${newFormId}/analytics`);
    }
  };

  const handleVersionChange = (newVerId) => {
    setSelectedVersionId(newVerId);
    fetchAnalytics(selectedFormId, newVerId, dateFilter);
  };

  const handleDateFilterChange = (newRange) => {
    setDateFilter(newRange);
    fetchAnalytics(selectedFormId, selectedVersionId, newRange);
  };

  // Atelier Obsidian bar colors for choice distributions
  const barColors = [
    { bg: 'bg-[#E2B858]', text: 'text-[#E2B858]', badge: 'bg-[#E2B858]/10 text-[#E2B858]' },
    { bg: 'bg-[#52B788]', text: 'text-[#52B788]', badge: 'bg-[#52B788]/10 text-[#52B788]' },
    { bg: 'bg-[#38BDF8]', text: 'text-[#38BDF8]', badge: 'bg-[#38BDF8]/10 text-[#38BDF8]' },
    { bg: 'bg-[#F59E0B]', text: 'text-[#F59E0B]', badge: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
    { bg: 'bg-[#E05D44]', text: 'text-[#E05D44]', badge: 'bg-[#E05D44]/10 text-[#E05D44]' },
    { bg: 'bg-[#A855F7]', text: 'text-[#A855F7]', badge: 'bg-[#A855F7]/10 text-[#A855F7]' }
  ];

  const completionRate = analytics ? analytics.completion_rate : 0.0;
  const totalCompleted = analytics ? analytics.total_completed : 0;
  const totalStarted = analytics ? analytics.total_started : 0;
  const dropOffCount = analytics ? analytics.drop_off_count : 0;
  const avgDisplay = analytics ? analytics.average_duration_display : ('0 ' + t('analytics.secondsUnit'));
  const fieldDistributions = analytics ? analytics.field_distributions || [] : [];

  return (
    <SaaSAppShell activeTab="analytics">
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Top Header Banner with Form Selector */}
        <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1A1D24] border border-[#2A2D35] p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C59B27]/20 to-[#E2B858]/10 border border-[#E2B858]/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(226,184,88,0.15)]">
              <span className="material-symbols-outlined text-2xl text-[#E2B858]">insights</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#F5F3EF]">
                {t('analytics.title') || "Analytics"}
              </h1>
              <p className="text-xs text-[#949089] mt-1 max-w-xl leading-relaxed">
                {t('analytics.subtitle') || "See how many people viewed, started, and completed your forms."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-center">
            {formsList.length > 0 && (
              <div className="bg-[#16181D] border border-[#2A2D35] px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-inner">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#949089]">{t('analytics.activeFormLabel')}</label>
                <select
                  value={selectedFormId || ''}
                  onChange={(e) => handleFormChange(e.target.value)}
                  className="bg-transparent text-[#F5F3EF] text-xs font-semibold focus:outline-none cursor-pointer max-w-[240px] truncate"
                >
                  <option value="" className="bg-[#16181D] text-[#949089]">-- Select a Form --</option>
                  {formsList.map((f) => (
                    <option key={f.id} value={f.id} className="bg-[#16181D] text-[#F5F3EF]">
                      {f.title || 'Untitled Form'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => fetchAnalytics(selectedFormId, selectedVersionId, dateFilter)}
              disabled={refreshing || !selectedFormId}
              className="px-3.5 py-2 bg-[#16181D] hover:bg-[#20232B] text-[#F5F3EF] font-bold text-xs rounded-xl transition-all border border-[#2A2D35] flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              title="Refresh Analytics"
            >
              <span className={`material-symbols-outlined text-sm ${refreshing ? 'animate-spin' : ''}`}>sync</span>
              <span>{refreshing ? 'Refreshing...' : t('analytics.refresh')}</span>
            </button>

            {selectedFormId && (
              <button
                onClick={() => navigate(`/forms/${selectedFormId}/submissions`)}
                className="px-4 py-2 bg-gradient-to-r from-[#C59B27] to-[#E2B858] hover:brightness-110 text-[#2A1D00] font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(226,184,88,0.25)] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">inbox</span>
                <span>{t('analytics.submissionsButton')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Loading State for Forms List */}
        {loadingForms && (
          <div className="py-20 text-center space-y-3 bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-10">
            <div className="w-10 h-10 border-2 border-[#E2B858]/30 border-t-[#E2B858] rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-bold text-[#F5F3EF]">Loading Forms & Analytics...</p>
            <p className="text-[11px] text-[#949089]">Retrieving form portfolio and metric aggregations</p>
          </div>
        )}

        {/* Zero Forms Empty State */}
        {!loadingForms && formsList.length === 0 && (
          <div className="bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-12 text-center shadow-sm space-y-4 max-w-xl mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-[#16181D] text-[#E2B858] flex items-center justify-center text-2xl mx-auto border border-[#2A2D35]">
              📊
            </div>
            <h3 className="font-bold text-[#F5F3EF] text-lg">No forms available</h3>
            <p className="text-xs text-[#949089] max-w-sm mx-auto leading-relaxed">
              Create your first form to start collecting responses and unlock real-time completion analytics, duration tracking, and choice distributions.
            </p>
            <button
              onClick={() => navigate('/forms/new')}
              className="px-5 py-2.5 bg-gradient-to-r from-[#C59B27] to-[#E2B858] text-[#2A1D00] text-xs font-bold rounded-xl shadow-md hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              <span>Create Form</span>
            </button>
          </div>
        )}

        {/* Unselected Form Empty State */}
        {!selectedFormId && (
          <div className="text-center py-20 text-[#8E929C]">Select a form from the dropdown above to view analytics.</div>
        )}

        {/* Main Content Area when Form Selected */}
        {!loadingForms && formsList.length > 0 && selectedFormId && (
          <>
            {/* Filters Bar: Version Selector & Date Range Presets */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-mono uppercase tracking-wider text-[#949089]">{t('analytics.versionFilterLabel')}</label>
                <select
                  value={selectedVersionId}
                  onChange={(e) => handleVersionChange(e.target.value)}
                  className="px-3 py-1.5 bg-[#16181D] border border-[#2A2D35] rounded-xl text-xs font-medium text-[#F5F3EF] focus:outline-none focus:border-[#E2B858] cursor-pointer"
                >
                  <option value="">{t('analytics.allVersions')}</option>
                  {versions.map(v => (
                    <option key={v.id} value={v.id} className="bg-[#16181D] text-[#F5F3EF]">
                      Version {v.version_number} {v.is_active ? '(Active)' : v.published_at ? '(Published)' : '(Draft)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Preset Pills */}
              <div className="flex items-center gap-1.5 bg-[#16181D] p-1 rounded-xl border border-[#2A2D35]">
                {[
                  { id: 'all', label: t('analytics.filterAllTime') },
                  { id: '7d', label: t('analytics.filter7Days') },
                  { id: '30d', label: t('analytics.filter30Days') }
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => handleDateFilterChange(pill.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      dateFilter === pill.id
                        ? 'bg-[#E2B858]/15 border border-[#E2B858]/40 text-[#E2B858] shadow-sm'
                        : 'bg-[#16181D] border border-transparent text-[#949089] hover:text-[#F5F3EF] hover:bg-[#20232B]'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Notification Banner */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium flex items-center justify-between">
                <span>⚠️ {error}</span>
                <button
                  onClick={() => fetchAnalytics(selectedFormId, selectedVersionId, dateFilter)}
                  className="font-bold underline ml-2 text-red-300 hover:text-red-200 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Row 1: KPI Summary Cards */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
              {/* Card 1: Total Completed */}
              <div className="p-3 sm:p-5 rounded-xl border border-[#2A2D35] bg-[#1A1D24] shadow-sm flex flex-col justify-between space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-[#949089] truncate">{t('analytics.kpiTotalCompleted')}</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#52B788]/10 text-[#52B788] flex items-center justify-center text-xs sm:text-sm border border-[#52B788]/20 shrink-0">
                    <span className="material-symbols-outlined text-sm sm:text-base">task_alt</span>
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                    {loadingAnalytics ? '...' : totalCompleted}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-[#949089] mt-1">
                    <span>{t('analytics.outOf')}</span>
                    <span className="font-bold text-[#F5F3EF]">{loadingAnalytics ? '...' : totalStarted}</span>
                    <span className="hidden sm:inline">{t('analytics.sessionStarts')}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#2A2D35] text-[10px] sm:text-[11px] text-[#52B788] font-semibold flex items-center gap-1 truncate">
                  <span>●</span> {t('analytics.recordedInDb')}
                </div>
              </div>

              {/* Card 2: Completion Rate with Radial Progress */}
              <div className="p-3 sm:p-5 rounded-xl border border-[#2A2D35] bg-[#1A1D24] shadow-sm flex flex-col justify-between space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-[#949089] truncate">{t('analytics.kpiCompletionRate')}</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#38BDF8]/10 text-[#38BDF8] flex items-center justify-center text-xs sm:text-sm border border-[#38BDF8]/20 shrink-0">
                    <span className="material-symbols-outlined text-sm sm:text-base">published_with_changes</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <div>
                    <div className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                      {loadingAnalytics ? '...' : `${completionRate}%`}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-[#949089] mt-1 truncate">
                      {totalStarted > 0 ? `${totalCompleted}/${totalStarted}` : t('analytics.noStartsYet')}
                    </p>
                  </div>

                  {/* SVG Radial Progress Ring */}
                  <div className="relative w-10 h-10 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center">
                    <svg className="w-10 h-10 sm:w-14 sm:h-14 -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#2A2D35]"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#E2B858] transition-all duration-700 ease-out"
                        strokeDasharray={`${Math.min(100, Math.max(0, completionRate))}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-[9px] sm:text-[10px] font-bold text-[#F5F3EF] font-mono">
                      {Math.round(completionRate)}%
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#2A2D35] text-[10px] sm:text-[11px] text-[#949089] truncate">
                  {t('analytics.handshakeFinish')}
                </div>
              </div>

              {/* Card 3: Average Completion Time */}
              <div className="p-3 sm:p-5 rounded-xl border border-[#2A2D35] bg-[#1A1D24] shadow-sm flex flex-col justify-between space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-[#949089] truncate">{t('analytics.kpiAvgDuration')}</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center text-xs sm:text-sm border border-[#F59E0B]/20 shrink-0">
                    <span className="material-symbols-outlined text-sm sm:text-base">timer</span>
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                    {loadingAnalytics ? '...' : avgDisplay}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-[#949089] mt-1 truncate">
                    {analytics?.average_duration_seconds ? `${analytics.average_duration_seconds}s avg` : t('analytics.awaitingCompleted')}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#2A2D35] text-[10px] sm:text-[11px] text-[#949089] truncate">
                  {t('analytics.measuredFromHandshake')}
                </div>
              </div>

              {/* Card 4: Drop-off Sessions */}
              <div className="p-3 sm:p-5 rounded-xl border border-[#2A2D35] bg-[#1A1D24] shadow-sm flex flex-col justify-between space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-[#949089] truncate">{t('analytics.kpiDropOffSessions')}</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#E05D44]/10 text-[#E05D44] flex items-center justify-center text-xs sm:text-sm border border-[#E05D44]/20 shrink-0">
                    <span className="material-symbols-outlined text-sm sm:text-base">trending_down</span>
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                    {loadingAnalytics ? '...' : dropOffCount}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-[#949089] mt-1 truncate">
                    {totalStarted > 0
                      ? `${Math.round((dropOffCount / totalStarted) * 100)}% drop`
                      : t('analytics.zeroDropOffs')}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#2A2D35] text-[10px] sm:text-[11px] text-[#E05D44] font-medium truncate">
                  {t('analytics.sessionsWithoutSub')}
                </div>
              </div>
            </div>

            {/* Empty State when form has no completed submissions */}
            {!loadingAnalytics && totalCompleted === 0 ? (
              <div className="bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-12 text-center shadow-xl">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#16181D] border border-[#2A2D35] flex items-center justify-center text-[#E2B858]">
                  <span className="material-symbols-outlined text-3xl">query_stats</span>
                </div>
                <h3 className="text-base font-semibold text-[#F5F3EF] mb-1">{t('analytics.awaitingTitle')}</h3>
                <p className="text-xs text-[#949089] max-w-md mx-auto">
                  {t('analytics.awaitingSubtitle')}
                </p>
              </div>
            ) : (
              /* Row 2: Field-Level Visual Distribution Cards */
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {t('analytics.distributionsTitle')}
                    </h3>
                    <p className="text-xs text-[#8E929C] mt-0.5">
                      {t('analytics.distributionsSub')}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#E2B858] bg-[#16181D] px-3 py-1 rounded-xl border border-[#2A2D35]">
                    {fieldDistributions.length} {fieldDistributions.length === 1 ? 'Field Charted' : 'Fields Charted'}
                  </span>
                </div>

                {fieldDistributions.length === 0 ? (
                  <div className="bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-12 text-center shadow-sm space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-[#16181D] border border-[#2A2D35] flex items-center justify-center text-[#E2B858]">
                      <span className="material-symbols-outlined text-2xl">pie_chart</span>
                    </div>
                    <h3 className="font-bold text-[#F5F3EF] text-base">No Categorical Field Data Yet</h3>
                    <p className="text-xs text-[#949089] max-w-md mx-auto leading-relaxed">
                      No dropdown, rating, radio, or checkbox responses have been recorded yet for the selected filter range.
                      Submissions with answers to choice fields will automatically populate interactive distribution charts here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {fieldDistributions.map((fieldData, fieldIdx) => {
                      const isRating = fieldData.field_type === 'rating';
                      const totalAnswers = fieldData.total_responses;

                      return (
                        <div
                          key={fieldData.field_id}
                          className="w-full h-56 sm:h-80 bg-[#1A1D24] border border-[#2A2D35] rounded-xl p-4 sm:p-6 shadow-sm flex flex-col justify-between hover:border-[#E2B858]/40 transition-all overflow-y-auto"
                        >
                          {/* Field Header */}
                          <div className="flex items-start justify-between gap-3 border-b border-[#2A2D35] pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#F5F3EF]">
                                  {fieldIdx + 1}. {fieldData.label}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono uppercase text-[#949089] mt-1 block">
                                Field Type: <span className="font-bold text-[#E2B858]">{fieldData.field_type}</span>
                              </span>
                            </div>

                            <span className="px-2.5 py-1 text-[11px] font-bold bg-[#16181D] text-[#E2B858] rounded-xl border border-[#2A2D35] shrink-0">
                              {totalAnswers} {totalAnswers === 1 ? 'Response' : 'Responses'}
                            </span>
                          </div>

                          {/* Breakdown Bars Visualization */}
                          <div className="space-y-3.5 flex-1">
                            {fieldData.breakdown && fieldData.breakdown.length > 0 ? (
                              fieldData.breakdown.map((item, optIdx) => {
                                const pct = item.percentage;

                                return (
                                  <div key={item.option} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2 max-w-[70%]">
                                        {isRating && (
                                          <span className="text-[#E2B858] font-bold">
                                            {'★'.repeat(Number(item.option) || 1)}
                                          </span>
                                        )}
                                        <span className="font-semibold text-[#F5F3EF] truncate" title={item.option}>
                                          {item.option}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-mono text-[11px] text-[#949089]">
                                          {item.count} {item.count === 1 ? 'vote' : 'votes'}
                                        </span>
                                        <span className="font-mono font-bold text-xs text-[#F5F3EF] w-12 text-right">
                                          {pct}%
                                        </span>
                                      </div>
                                    </div>

                                    {/* Animated Progress Bar */}
                                    <div className="w-full h-3 bg-[#16181D] rounded-full overflow-hidden border border-[#2A2D35]">
                                      <div
                                        className="h-full bg-gradient-to-r from-[#C59B27] to-[#E2B858] rounded-full transition-all duration-700 ease-out"
                                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-[#949089] py-4 text-center">No options recorded</p>
                            )}
                          </div>

                          {/* Field Footer Summary */}
                          <div className="pt-3 border-t border-[#2A2D35] flex items-center justify-between text-[11px] text-[#949089]">
                            <span>Total answers aggregated</span>
                            <span className="font-bold text-[#F5F3EF]">{totalAnswers} recorded</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </SaaSAppShell>
  );
};
