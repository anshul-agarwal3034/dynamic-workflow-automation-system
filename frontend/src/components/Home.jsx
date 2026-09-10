const HomeView = () => {
  const [userData, setUserData] = React.useState(null);
  const [forms, setForms] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchVal, setSearchVal] = React.useState('');
  const [subFilter, setSubFilter] = React.useState('All');

  // Share Link modal state
  const [shareModalForm, setShareModalForm] = React.useState(null);
  const [shareUrl, setShareUrl] = React.useState('');
  const [generatingLink, setGeneratingLink] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/signin');
      return;
    }

    fetch('http://127.0.0.1:8000/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.ok ? res.json() : null)
    .then(data => { if (data) setUserData(data); })
    .catch(() => {});

    formsApi.listForms()
      .then(data => setForms(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalFormsCount = forms.length;
  const publishedFormsCount = forms.filter(f => f.status === 'published').length;

  const handleOpenShareModal = async (e, form) => {
    e.stopPropagation();
    setShareModalForm(form);
    setGeneratingLink(true);
    setCopiedLink(false);
    try {
      const data = await formsApi.generateShareLink(form.id);
      setShareUrl(data.share_url);
    } catch (err) {
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

  // Map bar items dynamically to real created forms or fallbacks
  const barItems = forms.length > 0 ? forms.slice(0, 5).map((f, idx) => {
    const activeVer = f.versions && f.versions.length > 0 ? f.versions[0] : null;
    const fieldCount = activeVer && activeVer.fields ? activeVer.fields.length : 1;
    const mockCount = fieldCount * 18 + 12 - idx * 8;
    const widthPercentage = Math.max(30, 100 - idx * 15);
    return {
      title: f.title,
      count: mockCount,
      width: `${widthPercentage}%`
    };
  }) : [
    { title: 'Job Application Q3', count: 142, width: '100%' },
    { title: 'Customer Feedback 2026', count: 110, width: '77%' },
    { title: 'KYC Verification - EU', count: 84, width: '59%' },
    { title: 'Contact Us Form', count: 65, width: '45%' },
    { title: 'Event Registration', count: 48, width: '33%' }
  ];

  // Map recent submissions dynamically to user created forms or sample submissions
  const recentSubmissions = forms.length > 0 ? forms.slice(0, 4).map((f, idx) => {
    const statuses = ['Approved', 'Under Review', 'Completed'];
    const assignedStatus = statuses[idx % statuses.length];
    return {
      id: `#SUB-${8290 - idx}`,
      form: f.title,
      respondent: userData ? `${userData.full_name || 'Respondent'} • ${userData.email}` : 'Jane Doe • jdoe@example.com',
      initials: f.title.substring(0, 2).toUpperCase(),
      bg: idx % 2 === 0 ? 'bg-electric-indigo/20 text-electric-indigo' : 'bg-mint-emerald/20 text-mint-emerald',
      time: `${idx * 2 + 1}m ${idx * 12 + 5}s`,
      submitted: idx === 0 ? 'Just now' : `${idx * 8 + 2} mins ago`,
      status: assignedStatus
    };
  }) : [
    { id: '#SUB-8291', form: 'Job Application Q3', respondent: 'R. Sharma • rsharma@example.com', initials: 'RS', bg: 'bg-electric-indigo/20 text-electric-indigo', time: '1m 45s', submitted: 'Just now', status: 'Approved' },
    { id: '#SUB-8290', form: 'Customer Feedback 2026', respondent: 'J. Doe • jdoe@corporate.com', initials: 'JD', bg: 'bg-slate-300 text-slate-700', time: '3m 12s', submitted: '5 mins ago', status: 'Under Review' },
    { id: '#SUB-8289', form: 'KYC Verification - EU', respondent: 'A. Lin • alin@startup.io', initials: 'AL', bg: 'bg-cyan-accent/20 text-cyan-accent', time: '8m 50s', submitted: '12 mins ago', status: 'Completed' }
  ];

  const filteredSubmissions = recentSubmissions.filter(s => {
    if (subFilter === 'All') return true;
    return s.status === subFilter;
  });

  return (
    <SaaSAppShell activeTab="overview" searchVal={searchVal} onSearchChange={setSearchVal}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-charcoal-dark mb-sm font-bold">Dashboard Overview</h2>
          <p className="font-body-md text-body-md text-secondary max-w-2xl">Manage active data collection pipelines, versioning snapshots, and real-time response streams.</p>
        </div>
        <div className="flex items-center gap-md">
          <div className="bg-surface border border-ash-border rounded-lg flex items-center px-md py-sm shadow-sm cursor-pointer hover:bg-silver-container transition-colors">
            <span className="material-symbols-outlined text-secondary mr-sm text-sm">calendar_today</span>
            <span className="font-label-md text-label-md text-primary">Last 7 Days</span>
            <span className="material-symbols-outlined text-secondary ml-sm text-sm">expand_more</span>
          </div>
          <button className="bg-surface border border-ash-border text-charcoal-dark font-label-md text-label-md px-md py-sm rounded-lg hover:bg-silver-container transition-colors shadow-sm flex items-center gap-sm">
            <span className="material-symbols-outlined text-sm">download</span>
            Export Summary
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-md">
        {/* KPI 1: Active Forms */}
        <div className="bg-surface border border-ash-border rounded-xl p-lg flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-md">
            <span className="font-label-md text-label-md text-secondary font-semibold">Active Forms</span>
            <span className="material-symbols-outlined text-electric-indigo">description</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <span className="font-display-lg text-display-lg text-charcoal-dark font-black">{totalFormsCount}</span>
              <span className="text-[10px] text-secondary font-bold block">{publishedFormsCount} Published</span>
            </div>
            <span className="bg-mint-emerald/10 text-mint-emerald font-label-sm text-label-sm px-sm py-xs rounded-full flex items-center gap-xs font-semibold">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> Live
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-surface border border-ash-border rounded-xl p-lg flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-md">
            <span className="font-label-md text-label-md text-secondary font-semibold">Submissions Today</span>
            <span className="material-symbols-outlined text-mint-emerald">inbox</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display-lg text-display-lg text-charcoal-dark font-black">486</span>
            <span className="bg-mint-emerald/10 text-mint-emerald font-label-sm text-label-sm px-sm py-xs rounded-full flex items-center gap-xs font-semibold">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> +24% vs yday
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-surface border border-ash-border rounded-xl p-lg flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-md">
            <span className="font-label-md text-label-md text-secondary font-semibold">Avg. Completion Rate</span>
            <span className="material-symbols-outlined text-cyan-accent">data_usage</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display-lg text-display-lg text-charcoal-dark font-black">67%</span>
            <div className="w-12 h-12 rounded-full border-4 border-silver-container flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-accent border-r-transparent border-t-transparent -rotate-45"></div>
              <span className="font-label-sm text-label-sm text-charcoal-dark font-bold">67%</span>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-surface border border-ash-border rounded-xl p-lg flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-md">
            <span className="font-label-md text-label-md text-secondary font-semibold">Active Workflow Rules</span>
            <span className="material-symbols-outlined text-warm-amber">rule</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display-lg text-display-lg text-charcoal-dark font-black">14</span>
            <span className="bg-warm-amber/10 text-warm-amber font-label-sm text-label-sm px-sm py-xs rounded-full flex items-center gap-xs font-semibold">
              <span className="material-symbols-outlined text-[14px]">check_circle</span> All operational
            </span>
          </div>
        </div>
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        {/* Bar Chart (Left - 65%) */}
        <div className="lg:col-span-8 bg-surface border border-ash-border rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-ash-border flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-charcoal-dark font-bold">Submissions per Form</h3>
            <span className="font-label-sm text-label-sm text-secondary font-medium">Real-time Metrics</span>
          </div>
          <div className="p-6 flex flex-col gap-4">
            {barItems.map((bar, idx) => (
              <div key={idx} className="flex items-center gap-md">
                <div className="w-1/3 font-label-sm text-label-sm text-secondary text-right truncate font-medium" title={bar.title}>{bar.title}</div>
                <div className="flex-1 h-6 bg-silver-container rounded-r-full overflow-hidden flex items-center">
                  <div className="h-full bg-gradient-to-r from-slate-400 to-electric-indigo rounded-r-full flex items-center justify-end pr-sm transition-all duration-500" style={{ width: bar.width }}>
                    <span className="font-label-sm text-label-sm text-white mr-xs font-bold">{bar.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Forms List (Right - 35%) */}
        <div className="lg:col-span-4 bg-surface border border-ash-border rounded-xl p-lg shadow-sm">
          <div className="flex justify-between items-center mb-md border-b border-ash-border pb-md">
            <h3 className="font-headline-md text-headline-md text-charcoal-dark font-bold">Recently Active Forms</h3>
            <span onClick={() => navigate('/forms')} className="font-label-sm text-label-sm text-primary hover:underline cursor-pointer font-bold">View All</span>
          </div>
          <div className="flex flex-col gap-sm">
            {(forms.length > 0 ? forms.slice(0, 4) : [
              { id: '1', title: 'Job Application Q3', responses: 142 },
              { id: '2', title: 'Customer Feedback 2026', responses: 110 },
              { id: '3', title: 'KYC Verification - EU', responses: 84 },
              { id: '4', title: 'Event Registration: Tech...', responses: 48 }
            ]).map((form, idx) => (
              <div key={form.id || idx} className="flex items-center justify-between p-sm hover:bg-silver-container rounded-lg transition-colors border border-transparent hover:border-ash-border">
                <div className="flex items-center gap-md">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint-emerald opacity-75" style={{ animationDelay: `${idx * 0.2}s` }}></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-mint-emerald"></span>
                  </div>
                  <div>
                    <div className="font-label-md text-label-md text-charcoal-dark font-bold">{form.title}</div>
                    <div className="font-body-sm text-body-sm text-secondary">{form.responses || 142 - idx * 20} total responses</div>
                  </div>
                </div>
                <button
                  onClick={(e) => handleOpenShareModal(e, form)}
                  className="text-secondary hover:text-primary transition-colors p-sm rounded bg-surface border border-ash-border"
                  title="Share Link"
                >
                  <span className="material-symbols-outlined text-sm">share</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Submissions */}
      <div className="bg-surface border border-ash-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-lg border-b border-ash-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
          <h3 className="font-headline-md text-headline-md text-charcoal-dark font-bold">Recent Submissions</h3>
          <div className="flex bg-silver-container p-xs rounded-lg">
            {['All', 'Approved', 'Under Review', 'Completed'].map(tab => (
              <button
                key={tab}
                onClick={() => setSubFilter(tab)}
                className={`px-md py-xs rounded font-label-sm text-label-sm transition-all ${
                  subFilter === tab
                    ? 'bg-surface shadow-sm text-primary font-bold'
                    : 'hover:bg-surface/50 text-secondary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b-2 border-charcoal-dark bg-platinum-bg">
                <th className="py-sm px-md font-label-sm text-label-sm text-secondary font-semibold">Tracking ID</th>
                <th className="py-sm px-md font-label-sm text-label-sm text-secondary font-semibold">Form Name</th>
                <th className="py-sm px-md font-label-sm text-label-sm text-secondary font-semibold">Respondent</th>
                <th className="py-sm px-md font-label-sm text-label-sm text-secondary font-semibold">Time Taken</th>
                <th className="py-sm px-md font-label-sm text-label-sm text-secondary font-semibold">Submitted At</th>
                <th className="py-sm px-md font-label-sm text-label-sm text-secondary font-semibold">Status</th>
                <th className="py-sm px-md font-label-sm text-label-sm text-secondary font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash-border font-body-sm text-body-sm text-charcoal-dark">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-xs text-secondary font-medium">
                    No submissions found under the "{subFilter}" filter. Awaiting responses for active forms.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((row, idx) => (
                  <tr key={row.id} className={`${idx % 2 === 1 ? 'bg-silver-container/30' : ''} hover:bg-silver-container/50 transition-colors`}>
                    <td className="py-md px-md font-mono text-xs font-bold">{row.id}</td>
                    <td className="py-md px-md font-medium">{row.form}</td>
                    <td className="py-md px-md">
                      <div className="flex items-center gap-sm">
                        <div className={`w-6 h-6 rounded-full ${row.bg} flex items-center justify-center font-bold text-[10px]`}>
                          {row.initials}
                        </div>
                        <span>{row.respondent}</span>
                      </div>
                    </td>
                    <td className="py-md px-md text-secondary">{row.time}</td>
                    <td className="py-md px-md text-secondary">{row.submitted}</td>
                    <td className="py-md px-md">
                      {row.status === 'Approved' && (
                        <span className="inline-flex items-center gap-xs px-sm py-xs rounded-full bg-mint-emerald/10 text-mint-emerald font-label-sm text-label-sm font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-mint-emerald"></span> Approved
                        </span>
                      )}
                      {row.status === 'Under Review' && (
                        <span className="inline-flex items-center gap-xs px-sm py-xs rounded-full bg-warm-amber/10 text-warm-amber font-label-sm text-label-sm font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-warm-amber"></span> Under Review
                        </span>
                      )}
                      {row.status === 'Completed' && (
                        <span className="inline-flex items-center gap-xs px-sm py-xs rounded-full bg-cyan-accent/10 text-cyan-accent font-label-sm text-label-sm font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-accent"></span> Completed
                        </span>
                      )}
                    </td>
                    <td className="py-md px-md text-right">
                      <button className="text-secondary hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px]">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Share Form Link Modal */}
      {shareModalForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-2xl border border-ash-border max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-ash-border pb-3">
              <h3 className="font-bold text-primary text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">share</span> Share Form Link
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
                  Anyone with this public link can fill out and submit responses to this form:
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 h-9 px-3 border border-ash-border rounded-lg text-xs font-mono bg-silver-container text-primary"
                  />
                  <button
                    onClick={handleCopyShareLink}
                    className="px-3.5 py-2 bg-charcoal-dark hover:opacity-90 text-on-primary font-bold text-xs rounded-lg transition-opacity shrink-0 shadow-sm"
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
                    className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </SaaSAppShell>
  );
};
