const SubmissionsView = () => {
  const [viewMode, setViewMode] = React.useState('table'); // 'table' | 'cards'
  const [statusFilter, setStatusFilter] = React.useState('All');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedSubmission, setSelectedSubmission] = React.useState(null);

  // Production submissions data matching specification
  const submissionsData = [
    {
      id: 'SUB-90821',
      form_title: 'Employee Onboarding',
      respondent_name: 'Sarah Jenkins',
      respondent_email: 'sarah.jenkins@techfirm.io',
      completion_time: '2m 14s',
      completion_seconds: 134,
      submitted_at: '2026-08-30 18:42',
      status: 'Approved',
      answers: {
        'Full Name': 'Sarah Jenkins',
        'Email Address': 'sarah.jenkins@techfirm.io',
        'Role': 'Senior Frontend Engineer',
        'Domain': 'Engineering',
        'Work Mode': 'Hybrid',
        'Experience': '5 Years'
      }
    },
    {
      id: 'SUB-90822',
      form_title: 'Customer Feedback Survey',
      respondent_name: 'Michael Chen',
      respondent_email: 'm.chen@analytics-corp.com',
      completion_time: '1m 05s',
      completion_seconds: 65,
      submitted_at: '2026-08-30 17:15',
      status: 'Submitted',
      answers: {
        'Full Name': 'Michael Chen',
        'Email Address': 'm.chen@analytics-corp.com',
        'Overall Rating': '5 Stars (★ 5)',
        'Product Quality': 'Excellent',
        'Feedback': 'FormPilotX UI is extremely smooth and fast!'
      }
    },
    {
      id: 'SUB-90823',
      form_title: 'Event Registration',
      respondent_name: 'Amanda Ross',
      respondent_email: 'aross@designhub.org',
      completion_time: '45s',
      completion_seconds: 45,
      submitted_at: '2026-08-30 16:30',
      status: 'Under Review',
      answers: {
        'Full Name': 'Amanda Ross',
        'Email Address': 'aross@designhub.org',
        'Ticket Type': 'VIP Pass',
        'Dietary Requirements': 'Vegetarian',
        'Date of Attendance': '2026-09-15'
      }
    },
    {
      id: 'SUB-90824',
      form_title: 'Employee Onboarding',
      respondent_name: 'David Kim',
      respondent_email: 'dkim@enterprisesolutions.com',
      completion_time: '3m 10s',
      completion_seconds: 190,
      submitted_at: '2026-08-30 15:20',
      status: 'Approved',
      answers: {
        'Full Name': 'David Kim',
        'Email Address': 'dkim@enterprisesolutions.com',
        'Role': 'Product Designer',
        'Domain': 'Design',
        'Work Mode': 'Remote',
        'Experience': '4 Years'
      }
    },
    {
      id: 'SUB-90825',
      form_title: 'Customer Feedback Survey',
      respondent_name: 'Elena Rostova',
      respondent_email: 'elena.v@globalconsulting.net',
      completion_time: '1m 40s',
      completion_seconds: 100,
      submitted_at: '2026-08-30 14:05',
      status: 'Rejected',
      answers: {
        'Full Name': 'Elena Rostova',
        'Email Address': 'elena.v@globalconsulting.net',
        'Overall Rating': '2 Stars (★ 2)',
        'Product Quality': 'Needs Improvement',
        'Feedback': 'Missing export PDF button in summary view.'
      }
    }
  ];

  const filteredSubmissions = submissionsData.filter(sub => {
    const matchesStatus = statusFilter === 'All' || sub.status === statusFilter;
    const matchesSearch =
      sub.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.respondent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.respondent_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.form_title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-mint-emerald/10 text-mint-emerald border border-mint-emerald/20 rounded-full">Approved</span>;
      case 'Submitted':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-cyan-accent/10 text-cyan-accent border border-cyan-accent/20 rounded-full">Submitted</span>;
      case 'Under Review':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-warm-amber/10 text-warm-amber border border-warm-amber/20 rounded-full">Under Review</span>;
      case 'Rejected':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-error/10 text-error border border-error/20 rounded-full">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-silver-container text-primary rounded-full">{status}</span>;
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

        {/* Metric Summary Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-surface border border-ash-border rounded-2xl p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Total Submissions</span>
            <p className="font-display-lg text-display-lg font-black text-charcoal-dark">1,426</p>
            <p className="text-[11px] text-mint-emerald font-bold">↑ +24.8% from last week</p>
          </div>

          <div className="bg-surface border border-ash-border rounded-2xl p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Avg. Completion Time</span>
            <p className="font-display-lg text-display-lg font-black text-charcoal-dark">1m 38s</p>
            <p className="text-[11px] text-cyan-accent font-bold">Fast response rate</p>
          </div>

          <div className="bg-surface border border-ash-border rounded-2xl p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Approval Rate</span>
            <p className="font-display-lg text-display-lg font-black text-charcoal-dark">92.4%</p>
            <p className="text-[11px] text-electric-indigo font-bold">Optimal quality score</p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-ash-border pb-3 overflow-x-auto">
          {['All', 'Submitted', 'Under Review', 'Approved', 'Rejected'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-silver-container text-primary border border-ash-border'
                  : 'text-secondary hover:text-primary hover:bg-silver-container'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* View Mode 1: Spreadsheet Data Table */}
        {viewMode === 'table' ? (
          <div className="bg-surface border border-ash-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-charcoal-dark">
                <thead>
                  <tr className="border-b border-ash-border text-secondary uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-bold">Submission ID</th>
                    <th className="py-3 px-4 font-bold">Form Name</th>
                    <th className="py-3 px-4 font-bold">Respondent</th>
                    <th className="py-3 px-4 font-bold">Completion Time</th>
                    <th className="py-3 px-4 font-bold">Submitted At</th>
                    <th className="py-3 px-4 font-bold text-center">Status</th>
                    <th className="py-3 px-4 font-bold text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ash-border">
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-silver-container/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-electric-indigo">{sub.id}</td>
                      <td className="py-3.5 px-4 font-bold text-charcoal-dark">{sub.form_title}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-charcoal-dark block">{sub.respondent_name}</span>
                        <span className="text-[10px] text-secondary">{sub.respondent_email}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-secondary">{sub.completion_time}</td>
                      <td className="py-3.5 px-4 text-secondary">{sub.submitted_at}</td>
                      <td className="py-3.5 px-4 text-center">{getStatusBadge(sub.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedSubmission(sub)}
                          className="px-3 py-1 text-xs font-bold bg-charcoal-dark hover:opacity-90 text-on-primary rounded-lg transition-all"
                        >
                          View Answers
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* View Mode 2: Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredSubmissions.map((sub) => (
              <div key={sub.id} className="bg-surface border border-ash-border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-ash-border pb-3">
                  <div>
                    <span className="font-mono text-[11px] text-electric-indigo font-bold">{sub.id}</span>
                    <h3 className="font-bold text-sm text-charcoal-dark">{sub.form_title}</h3>
                  </div>
                  {getStatusBadge(sub.status)}
                </div>

                <div className="space-y-1 text-xs">
                  <p className="font-bold text-charcoal-dark">{sub.respondent_name}</p>
                  <p className="text-secondary text-[11px]">{sub.respondent_email}</p>
                  <p className="text-secondary text-[10px] pt-1">Time taken: {sub.completion_time} • Submitted: {sub.submitted_at}</p>
                </div>

                <div className="p-3.5 bg-silver-container rounded-xl border border-ash-border space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Response Summary</p>
                  <div className="space-y-1 text-xs">
                    {Object.entries(sub.answers).slice(0, 3).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-[11px]">
                        <span className="text-secondary">{key}:</span>
                        <span className="font-medium text-charcoal-dark truncate max-w-[180px]">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSubmission(sub)}
                  className="w-full py-2 bg-charcoal-dark hover:opacity-90 text-on-primary font-bold text-xs rounded-xl transition-all"
                >
                  Inspect Full Submission
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inspect Submission Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-lg w-full p-6 text-left space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-ash-border pb-3">
              <div>
                <span className="font-mono text-[11px] text-electric-indigo font-bold">{selectedSubmission.id}</span>
                <h3 className="font-bold text-charcoal-dark text-base">{selectedSubmission.form_title}</h3>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-secondary hover:text-primary text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-secondary bg-silver-container p-3 rounded-xl border border-ash-border">
              <div>
                <span className="font-bold text-charcoal-dark block">{selectedSubmission.respondent_name}</span>
                <span className="text-[11px]">{selectedSubmission.respondent_email}</span>
              </div>
              <div className="text-right">
                <span className="block font-bold text-charcoal-dark">{selectedSubmission.completion_time}</span>
                <span className="text-[10px] text-secondary">{selectedSubmission.submitted_at}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Submitted Answers</p>
              {Object.entries(selectedSubmission.answers).map(([q, ans]) => (
                <div key={q} className="p-3 bg-silver-container/50 border border-ash-border rounded-xl space-y-1">
                  <p className="text-xs font-bold text-secondary">{q}</p>
                  <p className="text-xs font-medium text-charcoal-dark">{ans}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-ash-border flex justify-end">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl"
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
