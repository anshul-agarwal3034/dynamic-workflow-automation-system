(function() {
const t = typeof window !== 'undefined' && window.t || function (k) {
  return k;
};
const LANGUAGES = typeof window !== 'undefined' && window.LANGUAGES || [];
const FormPilotXLogo = window.FormPilotXLogo || (({
  className = "w-8 h-8"
}) => /*#__PURE__*/React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 100 100",
  className: `${className} shrink-0`,
  fill: "none"
}, /*#__PURE__*/React.createElement("path", {
  d: "M 28 14 H 72 C 79.7 14 86 20.3 86 28 V 68 L 72 82 H 28 C 20.3 82 14 75.7 14 68 V 28 C 14 20.3 20.3 14 28 14 Z",
  fill: "#DFB257"
}), /*#__PURE__*/React.createElement("path", {
  d: "M 68 86 L 86 68 L 86 72 L 72 86 Z",
  fill: "#14161B"
}), /*#__PURE__*/React.createElement("path", {
  d: "M 66 84 L 84 66",
  stroke: "#14161B",
  strokeWidth: "5",
  strokeLinecap: "round"
}), /*#__PURE__*/React.createElement("rect", {
  x: "30",
  y: "32",
  width: "38",
  height: "8",
  rx: "4",
  fill: "#14161B"
}), /*#__PURE__*/React.createElement("rect", {
  x: "30",
  y: "46",
  width: "28",
  height: "8",
  rx: "4",
  fill: "#14161B"
}), /*#__PURE__*/React.createElement("rect", {
  x: "30",
  y: "60",
  width: "34",
  height: "8",
  rx: "4",
  fill: "#14161B"
})));
const HomeView = ({
  setIsDeleteModalOpen
}) => {
  const {
    t
  } = typeof useLanguage === 'function' ? useLanguage() : {
    t: k => window.t ? window.t(k) : k
  };
  const [userData, setUserData] = React.useState(null);
  const [dashboardData, setDashboardData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [searchVal, setSearchVal] = React.useState('');
  const [subFilter, setSubFilter] = React.useState('All');

  // Share Link modal state
  const [shareModalForm, setShareModalForm] = React.useState(null);
  const [shareUrl, setShareUrl] = React.useState('');
  const [generatingLink, setGeneratingLink] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [previewSubmission, setPreviewSubmission] = React.useState(null);
  const fetchDashboard = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await formsApi.getDashboardSummary();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }
    const apiBase = typeof window !== 'undefined' && window.API_BASE_URL || '';
    fetch(`${apiBase}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).then(res => res.ok ? res.json() : null).then(data => {
      if (data) setUserData(data);
    }).catch(() => {});
    fetchDashboard();
  }, [fetchDashboard]);
  const kpis = dashboardData ? dashboardData.kpis : {
    active_forms_count: 0,
    published_forms_count: 0,
    submissions_today_count: 0,
    avg_completion_rate: 0.0,
    active_rules_count: 0
  };
  const topForms = dashboardData ? dashboardData.top_forms || [] : [];
  const recentSubmissions = dashboardData ? dashboardData.recent_submissions || [] : [];
  const totalResponsesCount = topForms.reduce((acc, f) => acc + (f.total_responses || 0), 0);
  const handleOpenShareModal = async (e, form) => {
    e.stopPropagation();
    setShareModalForm(form);
    setGeneratingLink(true);
    setCopiedLink(false);
    try {
      const targetId = form.form_id || form.id;
      const data = await formsApi.generateShareLink(targetId);
      setShareUrl(data.share_url);
    } catch (err) {
      console.error('Share link generation error:', err);
      setShareModalForm(null);
    } finally {
      setGeneratingLink(false);
    }
  };
  const handleCopyShareLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };
  const formatSubmittedDate = dateStr => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  const formatTimeTaken = seconds => {
    if (seconds === undefined || seconds === null || seconds < 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m`;
    return `${secs}s`;
  };
  const getInitials = (identifier, title) => {
    const raw = identifier && identifier !== 'Anonymous Respondent' ? identifier : title || 'FP';
    const cleaned = raw.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (cleaned.length >= 2) {
      return (cleaned[0][0] + cleaned[1][0]).toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase() || 'FP';
  };

  // Compute proportional widths for top forms bar chart
  const maxResponses = Math.max(...topForms.map(f => f.total_responses), 1);
  const barItems = topForms.map(f => {
    const count = f.total_responses || 0;
    const widthPercentage = count > 0 && maxResponses > 0 ? Math.max(12, Math.round(count / maxResponses * 100)) : 8;
    return {
      id: f.form_id,
      title: f.title,
      count: count,
      width: `${widthPercentage}%`
    };
  });
  const availableStatuses = ['All', 'Completed'];
  const filteredSubmissions = recentSubmissions.filter(s => {
    if (subFilter === 'All') return true;
    return (s.status || '').toLowerCase() === subFilter.toLowerCase();
  });
  const isZeroState = !loading && kpis.active_forms_count === 0;
  return /*#__PURE__*/React.createElement(SaaSAppShell, {
    activeTab: "overview",
    searchVal: searchVal,
    onSearchChange: setSearchVal
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col md:flex-row justify-between items-start md:items-end gap-md"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "font-headline-lg text-2xl md:text-3xl text-[#F5F3EF] mb-1 font-bold"
  }, t('dashboard.title') || 'Dashboard'), /*#__PURE__*/React.createElement("p", {
    className: "font-body-md text-xs sm:text-sm text-[#949089] max-w-2xl"
  }, t('dashboard.subtitle') || 'Overview of your forms, responses, and quick actions.')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-md"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => navigate('/forms/new'),
    className: "bg-gradient-to-r from-[#C59B27] to-[#E2B858] hover:brightness-110 text-[#2A1D00] font-bold text-sm h-9 px-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(226,184,88,0.2)] flex items-center gap-1.5 cursor-pointer leading-none"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-[18px] leading-none"
  }, "add"), t('nav.newForm')), /*#__PURE__*/React.createElement("button", {
    onClick: fetchDashboard,
    disabled: loading,
    className: "bg-[#1A1D24] border border-[#2A2D35] text-[#F5F3EF] font-bold text-sm h-9 px-3.5 rounded-xl hover:bg-[#20232B] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 leading-none",
    title: t('nav.refresh')
  }, /*#__PURE__*/React.createElement("span", {
    className: `material-symbols-outlined text-[18px] leading-none ${loading ? 'animate-spin' : ''}`
  }, "sync"), t('nav.refresh')))), error && /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
    onClick: fetchDashboard,
    className: "underline text-red-300 hover:text-red-200 cursor-pointer"
  }, "Retry")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 sm:p-5 rounded-xl bg-[#1A1D24] border border-[#2A2D35] flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5 sm:mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] sm:text-xs font-medium text-[#8E929C] truncate"
  }, t('dashboard.activeForms')), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-base sm:text-xl text-[#E2B858]/80 p-1 sm:p-1.5 rounded-lg bg-[#E2B858]/10 shrink-0"
  }, "description")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end justify-between gap-1"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-lg sm:text-2xl font-bold text-white tracking-tight"
  }, loading ? '...' : kpis.active_forms_count), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] sm:text-xs text-[#8E929C] mt-1 truncate"
  }, kpis.published_forms_count, " ", t('dashboard.publishedCount'))), /*#__PURE__*/React.createElement("span", {
    className: "bg-[#52B788]/10 text-[#52B788] border border-[#52B788]/20 text-[10px] sm:text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-[11px] sm:text-[13px]"
  }, "trending_up"), " ", t('dashboard.liveBadge')))), /*#__PURE__*/React.createElement("div", {
    className: "p-3 sm:p-5 rounded-xl bg-[#1A1D24] border border-[#2A2D35] flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5 sm:mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] sm:text-xs font-medium text-[#8E929C] truncate"
  }, t('dashboard.submissionsToday')), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-base sm:text-xl text-[#E2B858]/80 p-1 sm:p-1.5 rounded-lg bg-[#E2B858]/10 shrink-0"
  }, "inbox")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-lg sm:text-2xl font-bold text-white tracking-tight"
  }, loading ? '...' : kpis.submissions_today_count), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 text-[10px] sm:text-xs text-[#8E929C] mt-1 truncate"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-xs text-[#E2B858]"
  }, "calendar_today"), /*#__PURE__*/React.createElement("span", null, new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "p-3 sm:p-5 rounded-xl bg-[#1A1D24] border border-[#2A2D35] flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5 sm:mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] sm:text-xs font-medium text-[#8E929C] truncate"
  }, t('dashboard.avgCompletion')), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-base sm:text-xl text-[#E2B858]/80 p-1 sm:p-1.5 rounded-lg bg-[#E2B858]/10 shrink-0"
  }, "data_usage")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end justify-between gap-1"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-lg sm:text-2xl font-bold text-white tracking-tight"
  }, loading ? '...' : `${kpis.avg_completion_rate}%`), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] sm:text-xs text-[#8E929C] mt-1 truncate"
  }, "Conversion")), /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 sm:border-4 border-[#2A2D35] flex items-center justify-center relative shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 rounded-full border-2 sm:border-4 border-[#E2B858] border-r-transparent border-t-transparent",
    style: {
      transform: `rotate(${kpis.avg_completion_rate / 100 * 360 - 45}deg)`
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] sm:text-[11px] text-[#F5F3EF] font-bold"
  }, Math.round(kpis.avg_completion_rate), "%")))), /*#__PURE__*/React.createElement("div", {
    className: "p-3 sm:p-5 rounded-xl bg-[#1A1D24] border border-[#2A2D35] flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5 sm:mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] sm:text-xs font-medium text-[#8E929C] truncate"
  }, "All time"), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-base sm:text-xl text-[#E2B858]/80 p-1 sm:p-1.5 rounded-lg bg-[#E2B858]/10 shrink-0"
  }, "dataset")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-lg sm:text-2xl font-bold text-white tracking-tight"
  }, loading ? '...' : totalResponsesCount || 0), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 text-[10px] sm:text-xs text-[#8E929C] mt-1 truncate"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-xs text-[#E2B858]"
  }, "check_circle"), /*#__PURE__*/React.createElement("span", null, "Recorded"))))), isZeroState ?
  /*#__PURE__*/
  /* Sleek High-Conviction Onboarding State */
  React.createElement("div", {
    className: "bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-10 md:p-14 text-center shadow-xl flex flex-col items-center justify-center max-w-3xl mx-auto my-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C59B27]/20 to-[#E2B858]/10 border border-[#E2B858]/30 flex items-center justify-center p-3 mb-6 shadow-[0_0_15px_rgba(226,184,88,0.15)]"
  }, /*#__PURE__*/React.createElement(FormPilotXLogo, {
    className: "w-full h-full"
  })), /*#__PURE__*/React.createElement("span", {
    className: "bg-[#E2B858]/10 text-[#E2B858] border border-[#E2B858]/20 font-mono text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3"
  }, "WELCOME TO FORMPILOT", /*#__PURE__*/React.createElement("span", {
    className: "text-[#DFB257]"
  }, "X")), /*#__PURE__*/React.createElement("h3", {
    className: "font-headline-lg text-2xl md:text-3xl text-[#F5F3EF] font-extrabold mb-3"
  }, t('dashboard.welcomeTitle')), /*#__PURE__*/React.createElement("p", {
    className: "font-body-md text-xs sm:text-sm text-[#949089] max-w-xl mb-8 leading-relaxed"
  }, t('dashboard.welcomeSubtitle')), /*#__PURE__*/React.createElement("button", {
    onClick: () => navigate('/forms/new'),
    className: "bg-gradient-to-r from-[#C59B27] to-[#E2B858] hover:brightness-110 text-[#2A1D00] font-label-md px-6 py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(226,184,88,0.25)] flex items-center gap-2 font-bold cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-lg"
  }, "add_circle"), /*#__PURE__*/React.createElement("span", null, "+ ", t('dashboard.buildFirstForm')))) :
  /*#__PURE__*/
  /* Active Data State: Charts & Recent Activity */
  React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-12 gap-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-8 bg-[#1A1D24] border border-[#2A2D35] rounded-2xl shadow-xl flex flex-col overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-6 py-4 border-b border-[#2A2D35] flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-headline-md text-base font-bold text-[#F5F3EF]"
  }, t('dashboard.submissionsPerForm')), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-xs text-[#949089] font-medium"
  }, t('dashboard.realTimeMetrics'))), /*#__PURE__*/React.createElement("div", {
    className: "p-6 flex flex-col gap-4"
  }, barItems.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "py-8 text-center text-xs text-[#949089] font-medium"
  }, "No active forms yet. Create a form to view distribution metrics.") : barItems.map(bar => /*#__PURE__*/React.createElement("div", {
    key: bar.id,
    className: "flex items-center gap-md"
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => navigate(`/forms/${bar.id}`),
    className: "w-1/3 font-label-sm text-xs text-[#949089] text-right truncate font-medium hover:text-[#E2B858] cursor-pointer transition-colors",
    title: bar.title
  }, bar.title), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 h-6 bg-[#16181D] rounded-r-full overflow-hidden flex items-center border border-[#2A2D35]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-[#C59B27] to-[#E2B858] rounded-r-full flex items-center justify-end pr-sm transition-all duration-500 min-w-[28px]",
    style: {
      width: bar.width
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[11px] text-[#2A1D00] mr-xs font-bold"
  }, bar.count))))))), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-4 bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-6 shadow-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-md border-b border-[#2A2D35] pb-md"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-headline-md text-base font-bold text-[#F5F3EF]"
  }, t('dashboard.topForms')), /*#__PURE__*/React.createElement("span", {
    onClick: () => navigate('/forms'),
    className: "font-label-sm text-xs text-[#E2B858] hover:underline cursor-pointer font-bold"
  }, t('dashboard.viewAll'))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-sm"
  }, topForms.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "py-8 text-center text-xs text-[#949089] font-medium"
  }, "No forms available.") : topForms.map((form, idx) => /*#__PURE__*/React.createElement("div", {
    key: form.form_id,
    className: "flex items-center justify-between p-sm hover:bg-[#16181D] rounded-xl transition-colors border border-transparent hover:border-[#2A2D35]"
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => navigate(`/forms/${form.form_id}`),
    className: "flex items-center gap-md cursor-pointer flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative flex h-3 w-3 shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-[#52B788] opacity-75",
    style: {
      animationDelay: `${idx * 0.2}s`
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "relative inline-flex rounded-full h-3 w-3 bg-[#52B788]"
  })), /*#__PURE__*/React.createElement("div", {
    className: "truncate"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-label-md text-xs font-bold text-[#F5F3EF] truncate hover:text-[#E2B858] transition-colors"
  }, form.title), /*#__PURE__*/React.createElement("div", {
    className: "font-body-sm text-[11px] text-[#949089]"
  }, form.total_responses, " ", t('dashboard.totalResponsesSub')))), /*#__PURE__*/React.createElement("button", {
    onClick: e => handleOpenShareModal(e, form),
    className: "text-[#949089] hover:text-[#E2B858] transition-colors p-2 rounded-lg bg-[#16181D] border border-[#2A2D35] ml-2 shrink-0 cursor-pointer",
    title: "Share Form"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-sm"
  }, "share"))))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] border border-[#2A2D35] rounded-2xl shadow-xl overflow-hidden flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-6 border-b border-[#2A2D35] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-headline-md text-base font-bold text-[#F5F3EF]"
  }, t('dashboard.recentSubmissions')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089]"
  }, t('dashboard.recentSubmissionsSub'))), /*#__PURE__*/React.createElement("div", {
    className: "flex bg-[#16181D] p-1 rounded-xl border border-[#2A2D35]"
  }, availableStatuses.map(tab => /*#__PURE__*/React.createElement("button", {
    key: tab,
    onClick: () => setSubFilter(tab),
    className: `px-3 py-1 rounded-lg font-mono text-xs transition-all cursor-pointer ${subFilter === tab ? 'bg-[#E2B858]/15 border border-[#E2B858]/40 text-[#E2B858] font-bold shadow-sm' : 'text-[#949089] hover:text-[#F5F3EF]'}`
  }, tab === 'All' ? t('dashboard.filterAll') : t('dashboard.filterCompleted'))))), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto w-full"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-left border-collapse min-w-[800px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-b border-[#2A2D35] bg-[#16181D]"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-4 font-mono text-[11px] uppercase tracking-wider text-[#949089] font-semibold"
  }, t('dashboard.colCode')), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-4 font-mono text-[11px] uppercase tracking-wider text-[#949089] font-semibold"
  }, t('dashboard.colFormName')), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-4 font-mono text-[11px] uppercase tracking-wider text-[#949089] font-semibold"
  }, t('dashboard.colRespondent')), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-4 font-mono text-[11px] uppercase tracking-wider text-[#949089] font-semibold"
  }, t('dashboard.colDuration')), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-4 font-mono text-[11px] uppercase tracking-wider text-[#949089] font-semibold"
  }, t('dashboard.colSubmitted')), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-4 font-mono text-[11px] uppercase tracking-wider text-[#949089] font-semibold"
  }, t('dashboard.colStatus')), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-4 font-mono text-[11px] uppercase tracking-wider text-[#949089] font-semibold text-right"
  }, t('dashboard.colActions')))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-[#2A2D35] text-xs text-[#F5F3EF]"
  }, recentSubmissions.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "7",
    className: "py-12 text-center text-[#949089] text-xs font-medium"
  }, "No submissions recorded yet. Share your form link to begin collecting data.")) : filteredSubmissions.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "7",
    className: "py-8 text-center text-[#949089] text-xs font-medium"
  }, "No submissions found under the \"", subFilter, "\" filter.")) : filteredSubmissions.map((row, idx) => /*#__PURE__*/React.createElement("tr", {
    key: row.id,
    className: `${idx % 2 === 1 ? 'bg-[#16181D]/30' : ''} hover:bg-[#16181D] transition-colors`
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3.5 px-4 font-mono text-xs font-bold text-[#E2B858]"
  }, row.reference_code), /*#__PURE__*/React.createElement("td", {
    onClick: () => navigate(`/forms/${row.form_id}`),
    className: "py-3.5 px-4 font-medium text-[#F5F3EF] hover:text-[#E2B858] cursor-pointer transition-colors"
  }, row.form_title), /*#__PURE__*/React.createElement("td", {
    className: "py-3.5 px-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-6 h-6 rounded-full bg-[#E2B858]/15 text-[#E2B858] border border-[#E2B858]/30 flex items-center justify-center font-bold text-[10px] shrink-0"
  }, getInitials(row.respondent_identifier, row.form_title)), /*#__PURE__*/React.createElement("span", {
    className: "truncate max-w-[220px] text-[#F5F3EF]",
    title: row.respondent_identifier || t('dashboard.anonRespondent')
  }, row.respondent_identifier || t('dashboard.anonRespondent')))), /*#__PURE__*/React.createElement("td", {
    className: "py-3.5 px-4 text-[#949089]"
  }, formatTimeTaken(row.time_taken_seconds)), /*#__PURE__*/React.createElement("td", {
    className: "py-3.5 px-4 text-[#949089]"
  }, formatSubmittedDate(row.submitted_at)), /*#__PURE__*/React.createElement("td", {
    className: "py-3.5 px-4"
  }, row.status.toLowerCase() === 'completed' ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#52B788]/10 text-[#52B788] border border-[#52B788]/20 font-mono text-[10px] font-semibold"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-[#52B788]"
  }), " ", t('dashboard.statusCompleted')) : /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 font-mono text-[10px] font-semibold"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-[#F59E0B]"
  }), " ", row.status.toLowerCase() === 'in_progress' ? t('dashboard.statusInProgress') : row.status)), /*#__PURE__*/React.createElement("td", {
    className: "py-3.5 px-4 text-right"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      setPreviewSubmission(row);
    },
    className: "p-1.5 sm:p-2 rounded-lg text-[#8E929C] hover:text-[#E2B858] hover:bg-[#252830] transition-colors cursor-pointer",
    title: "Quick View Submission"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-base sm:text-lg"
  }, "visibility")))))))))), Boolean(shareModalForm) && /*#__PURE__*/React.createElement(EmbedModal, {
    isOpen: Boolean(shareModalForm),
    form: shareModalForm,
    shareUrl: shareUrl,
    generating: generatingLink,
    onClose: () => setShareModalForm(null)
  }), previewSubmission && (() => {
    const statusStr = String(previewSubmission.status || '').toLowerCase().trim();
    const isInProgress = statusStr.includes('progress') || statusStr === 'in_progress' || statusStr === 'inprogress' || statusStr === 'pending' || statusStr === 'started' || previewSubmission.is_complete === false;
    const refCode = previewSubmission.reference_code || `RESP-${previewSubmission.id || ''}`;
    const formId = previewSubmission.form_id || previewSubmission.formId || '';
    return /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm",
      onClick: () => setPreviewSubmission(null)
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-full max-w-sm bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-4 sm:p-5 shadow-2xl relative",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between pb-3 mb-3 border-b border-[#2A2D35]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: `material-symbols-outlined text-lg sm:text-xl ${isInProgress ? 'text-amber-400' : 'text-[#E2B858]'}`
    }, isInProgress ? 'hourglass_top' : 'verified'), /*#__PURE__*/React.createElement("h3", {
      className: "text-sm sm:text-base font-bold text-white"
    }, isInProgress ? 'Submission in Progress' : 'Submission Verification')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setPreviewSubmission(null),
      className: "p-1 rounded-lg text-[#8E929C] hover:text-white transition-colors cursor-pointer"
    }, /*#__PURE__*/React.createElement("span", {
      className: "material-symbols-outlined text-lg"
    }, "close"))), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between p-2.5 rounded-xl bg-[#121316] border border-[#2A2D35]"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-[#8E929C] font-medium"
    }, "Status"), isInProgress ? /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30"
    }, /*#__PURE__*/React.createElement("span", {
      className: "material-symbols-outlined text-xs"
    }, "hourglass_top"), "In Progress") : /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
    }, /*#__PURE__*/React.createElement("span", {
      className: "material-symbols-outlined text-xs"
    }, "check_circle"), "Verified")), /*#__PURE__*/React.createElement("div", {
      className: "p-2.5 rounded-xl bg-[#121316] border border-[#2A2D35]"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-[#8E929C] font-medium block mb-1"
    }, "Reference ID"), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-xs sm:text-sm font-bold text-[#E2B858] tracking-wider truncate"
    }, refCode || 'RESP-252025E5'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        const ref = refCode || 'RESP-252025E5';
        navigator.clipboard.writeText(ref);
      },
      className: "text-[11px] text-[#8E929C] hover:text-white flex items-center gap-1 transition-colors shrink-0 cursor-pointer",
      title: "Copy ID"
    }, /*#__PURE__*/React.createElement("span", {
      className: "material-symbols-outlined text-sm"
    }, "content_copy"), "Copy"))), /*#__PURE__*/React.createElement("div", {
      className: "p-2.5 rounded-xl bg-[#121316] border border-[#2A2D35] space-y-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between text-xs gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[#8E929C] shrink-0"
    }, "Form"), /*#__PURE__*/React.createElement("span", {
      className: "text-white font-medium truncate text-right"
    }, previewSubmission.form_title || 'Form')), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between text-xs pt-2 border-t border-[#2A2D35]/40 gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[#8E929C] shrink-0"
    }, isInProgress ? 'Started' : 'Submitted'), /*#__PURE__*/React.createElement("span", {
      className: "text-white text-right text-xs truncate"
    }, new Date(previewSubmission.created_at || previewSubmission.submitted_at || Date.now()).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }))))), /*#__PURE__*/React.createElement("div", {
      className: "pt-3 mt-3 border-t border-[#2A2D35] flex items-center justify-end gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setPreviewSubmission(null),
      className: "px-3 py-1.5 text-xs font-semibold text-[#8E929C] hover:text-white transition-colors cursor-pointer"
    }, "Close"), isInProgress ? /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-[#8E929C] px-3 py-1.5 bg-[#121316] rounded-xl border border-[#2A2D35]"
    }, "Awaiting Completion") : /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        setPreviewSubmission(null);
        window.location.hash = `#/submissions?formId=${encodeURIComponent(formId)}&ref=${encodeURIComponent(refCode)}`;
      },
      className: "px-3.5 py-1.5 bg-[#E2B858] text-black text-xs font-semibold rounded-xl hover:bg-[#D4A747] transition-colors flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
    }, /*#__PURE__*/React.createElement("span", null, "Go to Submission"), /*#__PURE__*/React.createElement("span", {
      className: "material-symbols-outlined text-sm"
    }, "arrow_forward")))));
  })());
};
  if (typeof t !== 'undefined') window.t = t;
  if (typeof LANGUAGES !== 'undefined') window.LANGUAGES = LANGUAGES;
  if (typeof FormPilotXLogo !== 'undefined') window.FormPilotXLogo = FormPilotXLogo;
  if (typeof HomeView !== 'undefined') window.HomeView = HomeView;
})();
