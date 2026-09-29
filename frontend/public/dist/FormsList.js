(function() {
const FormsListView = () => {
  const {
    t
  } = typeof useLanguage === 'function' ? useLanguage() : {
    t: k => window.t ? window.t(k) : k
  };
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

  // Form Settings Modal state
  const [editingSettingsForm, setEditingSettingsForm] = React.useState(null);
  const [settingsMaxSubmissions, setSettingsMaxSubmissions] = React.useState('');
  const [settingsClosesAt, setSettingsClosesAt] = React.useState('');
  const [settingsClosedMessage, setSettingsClosedMessage] = React.useState('');
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [settingsError, setSettingsError] = React.useState('');
  const [settingsSuccess, setSettingsSuccess] = React.useState('');

  // Version History Modal state
  const [showVersionsModalForm, setShowVersionsModalForm] = React.useState(null);
  const [versionsList, setVersionsList] = React.useState([]);
  const [loadingVersions, setLoadingVersions] = React.useState(false);
  const [viewingVersionDetail, setViewingVersionDetail] = React.useState(null);

  // Bulk Selection & Delete state
  const [selectedFormIds, setSelectedFormIds] = React.useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [bulkDeleteError, setBulkDeleteError] = React.useState('');
  const [toastMessage, setToastMessage] = React.useState('');
  const fetchForms = React.useCallback(async (searchTerm = search, statusVal = statusFilter) => {
    setLoading(true);
    setError('');
    try {
      const data = await formsApi.listForms({
        search: searchTerm,
        status: statusVal
      });
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
  const handleStatusTabClick = newStatus => {
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
  const openSettingsModal = form => {
    setEditingSettingsForm(form);
    setSettingsMaxSubmissions(form.max_submissions ? String(form.max_submissions) : '');
    setSettingsClosesAt(form.closes_at ? form.closes_at.slice(0, 16) : '');
    setSettingsClosedMessage(form.closed_message || '');
    setSettingsError('');
    setSettingsSuccess('');
  };
  const handleSaveSettings = async () => {
    if (!editingSettingsForm) return;
    setSavingSettings(true);
    setSettingsError('');
    setSettingsSuccess('');
    try {
      const payload = {
        max_submissions: settingsMaxSubmissions !== '' ? parseInt(settingsMaxSubmissions, 10) : null,
        closes_at: settingsClosesAt ? new Date(settingsClosesAt).toISOString() : null,
        closed_message: settingsClosedMessage.trim() || null
      };
      await formsApi.updateForm(editingSettingsForm.id, payload);
      setSettingsSuccess('Settings saved successfully!');
      await fetchForms();
      setTimeout(() => {
        setEditingSettingsForm(null);
      }, 1000);
    } catch (err) {
      setSettingsError(err.message || 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
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
      setForms(prev => prev.filter(f => f.id !== targetFormId));
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

  // Reset selection when filter or search changes
  React.useEffect(() => {
    setSelectedFormIds([]);
  }, [search, statusFilter]);
  const allFormsSelected = forms.length > 0 && forms.every(f => selectedFormIds.includes(f.id));
  const someFormsSelected = forms.length > 0 && forms.some(f => selectedFormIds.includes(f.id));
  const toggleSelectAll = () => {
    if (allFormsSelected) {
      setSelectedFormIds([]);
    } else {
      setSelectedFormIds(forms.map(f => f.id));
    }
  };
  const toggleSelectForm = (e, formId) => {
    if (e) e.stopPropagation();
    setSelectedFormIds(prev => prev.includes(formId) ? prev.filter(id => id !== formId) : [...prev, formId]);
  };
  const handleConfirmBulkDelete = async () => {
    if (selectedFormIds.length === 0) return;
    setIsBulkDeleting(true);
    setBulkDeleteError('');
    try {
      const res = await formsApi.bulkDeleteForms(selectedFormIds);
      const count = selectedFormIds.length;
      setSelectedFormIds([]);
      setShowBulkDeleteModal(false);
      setToastMessage(res.message || `Successfully deleted ${count} forms`);
      setTimeout(() => setToastMessage(''), 3500);
      await fetchForms();
    } catch (err) {
      console.error('Bulk delete error:', err);
      setBulkDeleteError(err.message || 'Failed to delete selected forms');
    } finally {
      setIsBulkDeleting(false);
    }
  };
  const getStatusBadge = status => {
    switch (status) {
      case 'draft':
        return /*#__PURE__*/React.createElement("span", {
          className: "px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full"
        }, t('forms.drafts'));
      case 'published':
        return /*#__PURE__*/React.createElement("span", {
          className: "px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full"
        }, t('forms.published'));
      case 'archived':
        return /*#__PURE__*/React.createElement("span", {
          className: "px-2.5 py-0.5 text-[10px] font-bold bg-[#16181D] text-[#949089] border border-[#2A2D35] rounded-full"
        }, t('forms.archived'));
      default:
        return /*#__PURE__*/React.createElement("span", {
          className: "px-2.5 py-0.5 text-[10px] font-bold bg-[#16181D] text-[#F5F3EF] border border-[#2A2D35] rounded-full"
        }, status);
    }
  };
  return /*#__PURE__*/React.createElement(SaaSAppShell, {
    activeTab: "forms",
    searchVal: search,
    onSearchChange: v => {
      setSearch(v);
      fetchForms(v, statusFilter);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto space-y-6"
  }, toastMessage && /*#__PURE__*/React.createElement("div", {
    className: "fixed top-6 right-6 z-50 bg-[#16181D] text-[#F5F3EF] px-4 py-3 rounded-xl shadow-2xl border border-[#2A2D35] flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[#DFB257]"
  }, "\u2713"), /*#__PURE__*/React.createElement("span", null, toastMessage)), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#2A2D35] pb-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "font-headline-lg text-headline-lg font-bold text-white tracking-tight"
  }, t('forms.title') || "My Forms"), /*#__PURE__*/React.createElement("p", {
    className: "font-body-md text-body-md text-[#949089] mt-1"
  }, t('forms.subtitle') || "Create, edit, and share all your forms in one place.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-[#1A1D24] p-1 rounded-xl border border-[#2A2D35]"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPortfolioViewMode('grid'),
    className: `px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${portfolioViewMode === 'grid' ? 'bg-gradient-to-r from-[#C59B27] to-[#E2B858] text-[#2A1D00] shadow-sm' : 'text-[#949089] hover:text-[#F5F3EF] hover:bg-[#16181D]'}`
  }, "\uD83D\uDDC2\uFE0F ", t('forms.gridCards')), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPortfolioViewMode('table'),
    className: `px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${portfolioViewMode === 'table' ? 'bg-gradient-to-r from-[#C59B27] to-[#E2B858] text-[#2A1D00] shadow-sm' : 'text-[#949089] hover:text-[#F5F3EF] hover:bg-[#16181D]'}`
  }, "\uD83D\uDCCA ", t('forms.compactTable'))), /*#__PURE__*/React.createElement("button", {
    onClick: () => navigate('/forms/create'),
    className: "px-4 py-2.5 bg-gradient-to-r from-[#C59B27] to-[#E2B858] hover:brightness-110 text-[#2A1D00] font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", null, "+ ", t('forms.createButton'))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 border-b border-[#2A2D35] pb-3"
  }, [{
    id: '',
    label: t('forms.allForms')
  }, {
    id: 'published',
    label: t('forms.published')
  }, {
    id: 'draft',
    label: t('forms.drafts')
  }, {
    id: 'archived',
    label: t('forms.archived')
  }].map(tab => /*#__PURE__*/React.createElement("button", {
    key: tab.id,
    onClick: () => handleStatusTabClick(tab.id),
    className: `px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${statusFilter === tab.id ? 'bg-[#1A1D24] text-[#E2B858] border border-[#E2B858]/30 shadow-sm' : 'text-[#949089] hover:text-[#F5F3EF] hover:bg-[#1A1D24]'}`
  }, tab.label))), error && /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-error-container/40 border border-error/20 rounded-xl text-xs text-error font-medium"
  }, error), loading ? /*#__PURE__*/React.createElement("div", {
    className: "py-16 text-center text-xs text-secondary font-medium"
  }, "Loading forms portfolio...") : forms.length === 0 ?
  /*#__PURE__*/
  /* Empty State */
  React.createElement("div", {
    className: "bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-12 text-center my-6 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-14 h-14 rounded-2xl bg-[#16181D] text-[#E2B858] flex items-center justify-center text-2xl mx-auto mb-4 border border-[#2A2D35] shadow-inner"
  }, "\uD83D\uDCDD"), /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-[#F5F3EF] mb-1.5 tracking-tight"
  }, t('forms.emptyTitle')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089] max-w-sm mx-auto mb-6 leading-relaxed"
  }, search || statusFilter ? 'No forms match your current search or status filter criteria.' : t('forms.emptySubtitle')), !(search || statusFilter) && /*#__PURE__*/React.createElement("button", {
    onClick: () => navigate('/forms/create'),
    className: "px-5 py-2.5 bg-gradient-to-r from-[#C59B27] to-[#E2B858] hover:brightness-110 text-[#2A1D00] text-xs font-bold rounded-xl shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-sm"
  }, "add"), /*#__PURE__*/React.createElement("span", null, "Create First Form"))) : /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between bg-[#1A1D24] border border-[#2A2D35] rounded-xl px-4 py-2.5 text-xs shadow-sm"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2.5 cursor-pointer font-bold select-none text-[#F5F3EF]"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: allFormsSelected,
    ref: el => {
      if (el) el.indeterminate = someFormsSelected && !allFormsSelected;
    },
    onChange: toggleSelectAll,
    className: "rounded border-[#2A2D35] bg-[#16181D] text-[#E2B858] focus:ring-0 cursor-pointer w-4 h-4"
  }), /*#__PURE__*/React.createElement("span", null, "Select All Forms (", forms.length, ")")), selectedFormIds.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-[#DFB257]"
  }, selectedFormIds.length, " of ", forms.length, " selected")), portfolioViewMode === 'grid' ?
  /*#__PURE__*/
  /* View Mode 1: Grid Cards */
  React.createElement("div", {
    className: "grid grid-cols-1 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-3"
  }, forms.map(form => {
    const activeVersion = form.versions && form.versions.length > 0 ? form.versions[0] : null;
    const fieldCount = activeVersion && activeVersion.fields ? activeVersion.fields.length : 0;
    const isSelected = selectedFormIds.includes(form.id);
    return /*#__PURE__*/React.createElement("div", {
      key: form.id,
      onClick: () => navigate(`/forms/${form.id}`),
      className: `p-3.5 sm:p-5 rounded-xl border bg-[#1A1D24] transition-all shadow-md hover:shadow-xl cursor-pointer flex flex-col justify-between group ${isSelected ? 'border-[#E2B858] bg-[#E2B858]/5' : 'border-[#2A2D35] hover:border-[#E2B858]/50'}`
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2.5 min-w-0 flex-1",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: isSelected,
      onChange: e => toggleSelectForm(e, form.id),
      className: "rounded border-[#2A2D35] bg-[#16181D] text-[#E2B858] focus:ring-0 cursor-pointer w-4 h-4 shrink-0"
    }), /*#__PURE__*/React.createElement("h3", {
      className: "truncate text-base sm:text-lg font-semibold text-[#F5F3EF] group-hover:text-[#E2B858] transition-colors"
    }, form.title)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 shrink-0",
      onClick: e => e.stopPropagation()
    }, getStatusBadge(form.status), /*#__PURE__*/React.createElement("div", {
      className: "relative inline-block text-left"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(openMenuFormId === form.id ? null : form.id);
      },
      className: "w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-[#16181D] hover:bg-[#20232B] text-[#F5F3EF] hover:text-[#E2B858] font-black text-sm sm:text-base rounded-lg transition-all border border-[#2A2D35] shadow-sm cursor-pointer",
      title: t('forms.formActions')
    }, "\u22EE"), openMenuFormId === form.id && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 z-40",
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "absolute right-0 top-9 w-52 bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] z-50 p-2 space-y-1 text-left"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
        navigate(`/forms/${form.id}/edit`);
      },
      className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] hover:text-[#E2B858] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
    }, /*#__PURE__*/React.createElement("span", {
      className: "material-symbols-outlined text-sm"
    }, "edit"), /*#__PURE__*/React.createElement("span", null, "Edit Form")), /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
        openSettingsModal(form);
      },
      className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] hover:text-[#E2B858] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
    }, /*#__PURE__*/React.createElement("span", {
      className: "material-symbols-outlined text-sm"
    }, "settings"), /*#__PURE__*/React.createElement("span", null, "Settings")), /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
        handleOpenShareModal(e, form);
      },
      className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] hover:text-[#E2B858] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
    }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD17"), " Share Public Link"), /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
        handleOpenVersionsModal(e, form);
      },
      className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] hover:text-[#E2B858] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
    }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCDC"), " Version History"), form.status === 'archived' ? /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
        handleUnarchiveForm(e, form.id);
      },
      disabled: unarchivingId === form.id,
      className: "w-full text-left px-3 py-2 text-xs font-bold text-mint-emerald hover:bg-mint-emerald/10 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
    }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD04"), " ", unarchivingId === form.id ? 'Restoring...' : 'Unarchive Form') : /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
        setArchiveModalForm(form);
      },
      className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] hover:text-[#DFB257] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
    }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCE6"), " Archive Form"), /*#__PURE__*/React.createElement("div", {
      className: "border-t border-[#2A2D35] my-1"
    }), /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
        setDeleteModalForm(form);
      },
      className: "w-full text-left px-3 py-2 text-xs font-bold text-error hover:bg-error/20 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
    }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDDD1\uFE0F"), " Delete Form")))))), /*#__PURE__*/React.createElement("p", {
      className: "hidden sm:block text-xs text-[#949089] mt-2 line-clamp-2 min-h-[32px]"
    }, form.description || t('forms.noDesc')), /*#__PURE__*/React.createElement("div", {
      className: "hidden sm:flex items-center gap-3 text-[11px] text-[#949089] pt-2 border-t border-[#2A2D35] mt-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-[11px] text-[#DFB257] font-bold bg-[#16181D] px-2 py-0.5 rounded-lg border border-[#2A2D35]"
    }, "v", activeVersion ? activeVersion.version_number : 1), /*#__PURE__*/React.createElement("span", null, fieldCount, " ", fieldCount === 1 ? t('forms.fieldSingle') : t('forms.fieldsCount')), /*#__PURE__*/React.createElement("span", null, "\u2022"), /*#__PURE__*/React.createElement("span", null, t('forms.createdOn'), " ", new Date(form.created_at).toLocaleDateString()))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between text-xs text-[#8E929C] mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-[#2A2D35]/40"
    }, /*#__PURE__*/React.createElement("span", null, form.submissions_count !== undefined ? `${form.submissions_count} responses` : form.response_count !== undefined ? `${form.response_count} responses` : `${fieldCount} fields`), /*#__PURE__*/React.createElement("span", null, "Updated ", new Date(form.updated_at || form.created_at).toLocaleDateString())));
  })) :
  /*#__PURE__*/
  /* View Mode 2: Compact Data Table */
  React.createElement("div", {
    className: "bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-6 shadow-xl space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-left text-xs text-[#F5F3EF]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-b border-[#2A2D35] text-[#949089] uppercase tracking-wider text-[10px]"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-4 w-10 text-center"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: allFormsSelected,
    ref: el => {
      if (el) el.indeterminate = someFormsSelected && !allFormsSelected;
    },
    onChange: toggleSelectAll,
    className: "rounded border-[#2A2D35] bg-[#16181D] text-[#E2B858] focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4",
    title: "Select/Deselect all forms"
  })), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-4 font-bold"
  }, t('forms.colTitle')), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-4 font-bold"
  }, t('forms.colStatus')), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-4 font-bold"
  }, "Version"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-4 font-bold"
  }, t('forms.fieldsCount')), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-4 font-bold"
  }, t('forms.colCreated')), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-4 font-bold text-right"
  }, t('forms.colActions')))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-[#2A2D35]"
  }, forms.map(form => {
    const activeVersion = form.versions && form.versions.length > 0 ? form.versions[0] : null;
    const fieldCount = activeVersion && activeVersion.fields ? activeVersion.fields.length : 0;
    const isSelected = selectedFormIds.includes(form.id);
    return /*#__PURE__*/React.createElement("tr", {
      key: form.id,
      onClick: () => navigate(`/forms/${form.id}`),
      className: `transition-colors cursor-pointer ${isSelected ? 'bg-[#E2B858]/10 hover:bg-[#E2B858]/15' : 'hover:bg-[#20232B]/60'}`
    }, /*#__PURE__*/React.createElement("td", {
      className: "py-3.5 px-4 text-center",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: isSelected,
      onChange: e => toggleSelectForm(e, form.id),
      className: "rounded border-[#2A2D35] bg-[#16181D] text-[#E2B858] focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
    })), /*#__PURE__*/React.createElement("td", {
      className: "py-3.5 px-4 font-bold text-[#F5F3EF]"
    }, form.title, form.description && /*#__PURE__*/React.createElement("span", {
      className: "block text-[11px] font-normal text-[#949089] truncate max-w-xs"
    }, form.description)), /*#__PURE__*/React.createElement("td", {
      className: "py-3.5 px-4"
    }, getStatusBadge(form.status)), /*#__PURE__*/React.createElement("td", {
      className: "py-3.5 px-4 font-mono text-[#DFB257]"
    }, "v", activeVersion ? activeVersion.version_number : 1), /*#__PURE__*/React.createElement("td", {
      className: "py-3.5 px-4 font-semibold text-[#F5F3EF]"
    }, fieldCount, " ", fieldCount === 1 ? t('forms.fieldSingle') : t('forms.fieldsCount')), /*#__PURE__*/React.createElement("td", {
      className: "py-3.5 px-4 text-[#949089]"
    }, new Date(form.created_at).toLocaleDateString()), /*#__PURE__*/React.createElement("td", {
      className: "py-3.5 px-4 text-right"
    }, /*#__PURE__*/React.createElement("div", {
      className: "relative inline-block text-left",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(openMenuFormId === form.id ? null : form.id);
      },
      className: "w-8 h-8 flex items-center justify-center bg-[#16181D] hover:bg-[#20232B] text-[#F5F3EF] font-black text-base rounded-xl transition-all border border-[#2A2D35] shadow-sm ml-auto",
      title: t('forms.formActions')
    }, "\u22EE"), openMenuFormId === form.id && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 z-40",
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "absolute right-0 top-9 w-52 bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] z-50 p-2 space-y-1 text-left backdrop-blur-md"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
        navigate(`/forms/${form.id}/edit`);
      },
      className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
    }, /*#__PURE__*/React.createElement("span", {
      className: "material-symbols-outlined text-sm"
    }, "edit"), /*#__PURE__*/React.createElement("span", null, "Edit Form")), /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
        openSettingsModal(form);
      },
      className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
    }, /*#__PURE__*/React.createElement("span", {
      className: "material-symbols-outlined text-sm"
    }, "settings"), /*#__PURE__*/React.createElement("span", null, "Settings")), /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
        handleOpenShareModal(e, form);
      },
      className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] rounded-xl transition-colors flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD17"), " Share Public Link"), /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
        handleOpenVersionsModal(e, form);
      },
      className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] rounded-xl transition-colors flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCDC"), " Version History"), form.status === 'archived' ? /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
        handleUnarchiveForm(e, form.id);
      },
      disabled: unarchivingId === form.id,
      className: "w-full text-left px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-colors flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD04"), " ", unarchivingId === form.id ? 'Restoring...' : 'Unarchive Form') : /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
        setArchiveModalForm(form);
      },
      className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] rounded-xl transition-colors flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCE6"), " Archive Form"), /*#__PURE__*/React.createElement("div", {
      className: "border-t border-[#2A2D35] my-1"
    }), /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setOpenMenuFormId(null);
        setDeleteModalForm(form);
      },
      className: "w-full text-left px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDDD1\uFE0F"), " Delete Form"))))));
  }))))))), editingSettingsForm && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-md w-full p-6 text-left space-y-4 max-h-[90vh] overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between border-b border-[#2A2D35] pb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-base flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-[#E2B858] text-[20px]"
  }, "settings"), /*#__PURE__*/React.createElement("span", null, "Settings: ", editingSettingsForm.title)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditingSettingsForm(null),
    className: "text-[#949089] hover:text-[#F5F3EF] font-bold"
  }, "\u2715")), settingsError && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl"
  }, settingsError), settingsSuccess && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-[16px]"
  }, "check_circle"), /*#__PURE__*/React.createElement("span", null, settingsSuccess)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#949089] mb-1"
  }, "Max Submissions"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    name: "max_submissions",
    min: "1",
    placeholder: "Max Submissions",
    value: settingsMaxSubmissions,
    onChange: e => setSettingsMaxSubmissions(e.target.value),
    className: "w-full h-8 px-3 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#949089] mb-1"
  }, "Close Date & Time"), /*#__PURE__*/React.createElement("input", {
    type: "datetime-local",
    name: "closes_at",
    value: settingsClosesAt,
    onChange: e => setSettingsClosesAt(e.target.value),
    className: "w-full h-8 px-3 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#949089] mb-1"
  }, "Custom Closed Message"), /*#__PURE__*/React.createElement("textarea", {
    name: "closed_message",
    rows: 2,
    placeholder: "Custom closed message...",
    value: settingsClosedMessage,
    onChange: e => setSettingsClosedMessage(e.target.value),
    className: "w-full p-2 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858] resize-none"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-[#2A2D35] flex items-center justify-end gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setEditingSettingsForm(null),
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] font-semibold text-xs rounded-xl"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSaveSettings,
    disabled: savingSettings,
    className: "px-4 py-2 bg-gradient-to-r from-[#DFB257] to-[#E2B858] hover:brightness-110 text-[#121316] font-bold text-xs rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
  }, savingSettings ? 'Saving...' : 'Save Settings')))), Boolean(shareModalForm) && /*#__PURE__*/React.createElement(EmbedModal, {
    isOpen: Boolean(shareModalForm),
    form: shareModalForm,
    shareUrl: shareUrl,
    generating: generatingLink,
    onClose: () => setShareModalForm(null)
  }), archiveModalForm && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-sm w-full p-6 text-left space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-base"
  }, "Archive form: ", archiveModalForm.title, "?"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089] leading-relaxed"
  }, "Archiving will freeze this form permanently and reject any future public response submissions (returns HTTP 410 Gone). You can restore it anytime with Unarchive."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-3 pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setArchiveModalForm(null),
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] font-semibold text-xs rounded-xl border border-[#2A2D35]"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: handleConfirmArchive,
    disabled: archiving,
    className: "px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
  }, archiving ? 'Archiving...' : 'Archive Form')))), deleteModalForm && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-sm w-full p-6 text-left space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-base"
  }, "Delete form: ", deleteModalForm.title, "?"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089] leading-relaxed"
  }, "Are you sure you want to permanently delete this form? This cannot be undone."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-3 pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDeleteModalForm(null),
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] font-semibold text-xs rounded-xl border border-[#2A2D35]"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: handleConfirmDelete,
    disabled: deleting,
    className: "px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
  }, deleting ? 'Deleting...' : 'Delete Form')))), showVersionsModalForm && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-lg w-full p-6 text-left space-y-4 max-h-[85vh] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between border-b border-[#2A2D35] pb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-sm flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCDC"), " Version History: ", showVersionsModalForm.title), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowVersionsModalForm(null),
    className: "text-[#949089] hover:text-[#F5F3EF] font-bold"
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto space-y-3 pr-1"
  }, loadingVersions ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089] py-6 text-center"
  }, "Loading versions...") : versionsList.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089] py-6 text-center"
  }, "No version history found.") : versionsList.map(v => /*#__PURE__*/React.createElement("div", {
    key: v.id,
    className: "p-3.5 border border-[#2A2D35] rounded-xl bg-[#16181D] flex items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-xs text-[#F5F3EF]"
  }, "Version ", v.version_number), v.is_active && /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20"
  }, "Active"), !v.published_at && /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20"
  }, "Draft")), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-[#949089] mt-1"
  }, v.published_at ? `Published: ${new Date(v.published_at).toLocaleString()}` : 'Draft Snapshot (Unpublished)'), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-[#949089] mt-0.5"
  }, v.field_count, " Fields")), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleViewVersionDetail(showVersionsModalForm.id, v.id),
    className: "px-3 py-1 text-xs font-semibold bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] rounded-lg transition-colors"
  }, "View Fields"))), viewingVersionDetail && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 p-4 border border-[#DFB257]/30 rounded-xl bg-[#DFB257]/5 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-xs text-[#DFB257]"
  }, "Fields Snapshot for Version ", viewingVersionDetail.version_number), /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewingVersionDetail(null),
    className: "text-[11px] font-bold text-[#DFB257] hover:underline"
  }, "Close Snapshot")), viewingVersionDetail.fields.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089]"
  }, "No fields in this version.") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, viewingVersionDetail.fields.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: f.id,
    className: "text-xs bg-[#16181D] p-2 border border-[#2A2D35] rounded flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-[#F5F3EF]"
  }, i + 1, ". ", f.label), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-[#949089] uppercase"
  }, f.field_type)))))), /*#__PURE__*/React.createElement("div", {
    className: "pt-2 border-t border-[#2A2D35] flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowVersionsModalForm(null),
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] font-semibold text-xs rounded-xl border border-[#2A2D35]"
  }, "Close")))), selectedFormIds.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1A1D24] text-[#F5F3EF] px-5 py-3 rounded-2xl shadow-2xl border border-[#2A2D35] flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-full bg-[#E2B858] animate-pulse"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "text-[#F5F3EF]"
  }, selectedFormIds.length), " ", selectedFormIds.length === 1 ? 'form' : 'forms', " selected")), /*#__PURE__*/React.createElement("div", {
    className: "h-4 w-[1px] bg-[#2A2D35]"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowBulkDeleteModal(true),
    disabled: isBulkDeleting,
    className: "px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDDD1\uFE0F"), " Delete Selected"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedFormIds([]),
    disabled: isBulkDeleting,
    className: "px-3 py-1.5 bg-[#20232B] hover:bg-[#2A2D35] text-[#949089] hover:text-[#F5F3EF] text-xs font-medium rounded-xl transition-colors border border-[#2A2D35]"
  }, "Clear"))), showBulkDeleteModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-md w-full p-6 text-left space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xl text-red-400"
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-base"
  }, "Delete ", selectedFormIds.length, " ", selectedFormIds.length === 1 ? 'Form' : 'Forms', "?"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089] mt-1.5 leading-relaxed"
  }, "This will permanently delete the selected ", /*#__PURE__*/React.createElement("strong", {
    className: "text-[#F5F3EF]"
  }, selectedFormIds.length), " form", selectedFormIds.length === 1 ? '' : 's', ", including all form versions, fields, logic rules, collected responses, and submitted data. This action ", /*#__PURE__*/React.createElement("strong", {
    className: "text-red-400 font-semibold"
  }, "cannot be undone"), ".")), bulkDeleteError && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400"
  }, bulkDeleteError), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2 pt-2 border-t border-[#2A2D35]"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowBulkDeleteModal(false);
      setBulkDeleteError(null);
    },
    disabled: isBulkDeleting,
    className: "px-4 py-2 border border-[#2A2D35] bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] font-semibold text-xs rounded-xl"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: handleConfirmBulkDelete,
    disabled: isBulkDeleting,
    className: "px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5"
  }, isBulkDeleting ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"
  }), "Deleting ", selectedFormIds.length, " Forms...") : `Delete ${selectedFormIds.length} Forms`)))));
};
window.FormsListView = FormsListView;
  if (typeof FormsListView !== 'undefined') window.FormsListView = FormsListView;
})();
