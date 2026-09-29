(function() {
const FormBuilderView = ({
  id
}) => {
  const [form, setForm] = React.useState(null);
  const [fields, setFields] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [actionError, setActionError] = React.useState('');

  // Inline Form Metadata Editing (Title & Description)
  const [isEditingHeader, setIsEditingHeader] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [savingHeader, setSavingHeader] = React.useState(false);

  // In-Place Question Editing state on Canvas
  const [editingFieldId, setEditingFieldId] = React.useState(null);
  const [editFieldState, setEditFieldState] = React.useState({
    label: '',
    placeholder: '',
    is_required: false,
    options: []
  });
  const [savingField, setSavingField] = React.useState(false);

  // Modals & Menu State
  const [showSettingsModal, setShowSettingsModal] = React.useState(false);
  const [settingsMaxSubmissions, setSettingsMaxSubmissions] = React.useState('');
  const [settingsClosesAt, setSettingsClosesAt] = React.useState('');
  const [settingsClosedMessage, setSettingsClosedMessage] = React.useState('');
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [settingsSuccess, setSettingsSuccess] = React.useState('');
  const [settingsError, setSettingsError] = React.useState('');
  const [showTemplateMenu, setShowTemplateMenu] = React.useState(false);
  const [pendingTemplateKey, setPendingTemplateKey] = React.useState(null);
  const [showTemplateConfirmModal, setShowTemplateConfirmModal] = React.useState(false);
  const [applyingTemplate, setApplyingTemplate] = React.useState(false);
  const [showClearCanvasModal, setShowClearCanvasModal] = React.useState(false);
  const [clearingCanvas, setClearingCanvas] = React.useState(false);

  // Add Question Configuration Modal State
  const [showAddFieldModal, setShowAddFieldModal] = React.useState(false);
  const [selectedFieldType, setSelectedFieldType] = React.useState(null);
  const [newFieldData, setNewFieldData] = React.useState({
    label: '',
    placeholder: '',
    is_required: false,
    max_rating: 5,
    options: [{
      option_label: '',
      option_value: ''
    }, {
      option_label: '',
      option_value: ''
    }]
  });
  const [addingField, setAddingField] = React.useState(false);
  const [fieldModalError, setFieldModalError] = React.useState('');

  // Studio Tab State ('fields' | 'rules')
  const [activeStudioTab, setActiveStudioTab] = React.useState('fields');
  const [rules, setRules] = React.useState([]);
  const [loadingRules, setLoadingRules] = React.useState(false);
  const [rulesError, setRulesError] = React.useState('');
  const [ruleSuccessMsg, setRuleSuccessMsg] = React.useState('');
  const [newRuleData, setNewRuleData] = React.useState({
    trigger_field_id: '',
    operator: 'equals',
    comparison_value: '',
    action: 'show',
    target_field_id: ''
  });
  const [savingRule, setSavingRule] = React.useState(false);
  const [deletingRuleId, setDeletingRuleId] = React.useState(null);
  const [deleteFieldId, setDeleteFieldId] = React.useState(null);
  const [showArchiveModal, setShowArchiveModal] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);
  const [unarchiving, setUnarchiving] = React.useState(false);
  const [showPublishModal, setShowPublishModal] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [showPublishSuccessModal, setShowPublishSuccessModal] = React.useState(false);
  const [publishedShareUrl, setPublishedShareUrl] = React.useState('');
  const [copiedPublishLink, setCopiedPublishLink] = React.useState(false);

  // Version History Modal state
  const [showVersionsModal, setShowVersionsModal] = React.useState(false);
  const [versionsList, setVersionsList] = React.useState([]);
  const [loadingVersions, setLoadingVersions] = React.useState(false);
  const [viewingVersionDetail, setViewingVersionDetail] = React.useState(null);

  // Share Link Modal state
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState('');
  const [generatingLink, setGeneratingLink] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // 3-Dot Action Menu & Delete Form Modal state
  const [showThreeDotMenu, setShowThreeDotMenu] = React.useState(false);
  const [showDeleteFormModal, setShowDeleteFormModal] = React.useState(false);
  const [deletingForm, setDeletingForm] = React.useState(false);
  const loadForm = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await formsApi.getForm(id);
      setForm(data);
      setEditTitle(data.title);
      setEditDescription(data.description || '');
      if (data) {
        setSettingsMaxSubmissions(data.max_submissions ? String(data.max_submissions) : '');
        setSettingsClosesAt(data.closes_at ? data.closes_at.slice(0, 16) : '');
        setSettingsClosedMessage(data.closed_message || '');
      }
      const sortedVersions = data && data.versions && data.versions.length > 0 ? [...data.versions].sort((a, b) => (b.version_number || 0) - (a.version_number || 0)) : [];
      const activeVer = sortedVersions[0];
      if (activeVer && activeVer.fields) {
        setFields([...activeVer.fields].sort((a, b) => a.display_order - b.display_order));
      } else {
        setFields([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load form details.');
    } finally {
      setLoading(false);
    }
  }, [id]);
  const loadRules = React.useCallback(async () => {
    if (!id) return;
    setLoadingRules(true);
    setRulesError('');
    try {
      const data = await formsApi.getRules(id);
      setRules(data || []);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoadingRules(false);
    }
  }, [id]);
  const handleSaveRule = async e => {
    if (e) e.preventDefault();
    setRulesError('');
    setRuleSuccessMsg('');
    if (!newRuleData.trigger_field_id) {
      setRulesError('Please select a Trigger Field.');
      return;
    }
    if (!newRuleData.target_field_id) {
      setRulesError('Please select a Target Field.');
      return;
    }
    if (newRuleData.trigger_field_id === newRuleData.target_field_id) {
      setRulesError('Trigger and Target fields cannot be the same field.');
      return;
    }
    if (newRuleData.operator !== 'is_empty' && !String(newRuleData.comparison_value || '').trim()) {
      setRulesError('Please specify a Comparison Value for this operator.');
      return;
    }
    setSavingRule(true);
    try {
      await formsApi.createRule(id, {
        trigger_field_id: newRuleData.trigger_field_id,
        target_field_id: newRuleData.target_field_id,
        operator: newRuleData.operator,
        comparison_value: newRuleData.operator === 'is_empty' ? null : String(newRuleData.comparison_value).trim(),
        action: newRuleData.action
      });
      setRuleSuccessMsg('Conditional rule created successfully!');
      setNewRuleData({
        trigger_field_id: '',
        operator: 'equals',
        comparison_value: '',
        action: 'show',
        target_field_id: ''
      });
      await loadRules();
      setTimeout(() => setRuleSuccessMsg(''), 3500);
    } catch (err) {
      setRulesError(err.message || 'Failed to save conditional rule.');
    } finally {
      setSavingRule(false);
    }
  };
  const handleDeleteRule = async ruleId => {
    setDeletingRuleId(ruleId);
    setRulesError('');
    try {
      await formsApi.deleteRule(ruleId);
      await loadRules();
    } catch (err) {
      setRulesError(err.message || 'Failed to delete rule.');
    } finally {
      setDeletingRuleId(null);
    }
  };
  const openSettingsModal = () => {
    if (form) {
      setSettingsMaxSubmissions(form.max_submissions ? String(form.max_submissions) : '');
      setSettingsClosesAt(form.closes_at ? form.closes_at.slice(0, 16) : '');
      setSettingsClosedMessage(form.closed_message || '');
    }
    setSettingsError('');
    setSettingsSuccess('');
    setShowSettingsModal(true);
  };
  const handleSaveSettings = async () => {
    setSettingsError('');
    setSettingsSuccess('');
    setSavingSettings(true);
    try {
      const payload = {
        max_submissions: settingsMaxSubmissions !== '' ? parseInt(settingsMaxSubmissions, 10) : null,
        closes_at: settingsClosesAt ? new Date(settingsClosesAt).toISOString() : null,
        closed_message: settingsClosedMessage.trim() || null
      };
      const updated = await formsApi.updateForm(form.id, payload);
      setForm(updated);
      setSettingsSuccess('Settings saved successfully!');
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err) {
      setSettingsError(err.message || 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };
  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/signin');
      return;
    }
    loadForm();
    loadRules();
  }, [loadForm, loadRules]);
  const sortedVersions = form && form.versions && form.versions.length > 0 ? [...form.versions].sort((a, b) => (b.version_number || 0) - (a.version_number || 0)) : [];
  const activeVersion = sortedVersions[0] || null;
  const isArchived = form && form.status === 'archived';
  const fieldTypesList = [{
    type: 'text',
    label: 'Text Input',
    icon: '🔤',
    desc: 'Short single line text question'
  }, {
    type: 'number',
    label: 'Number Input',
    icon: '🔢',
    desc: 'Numeric metrics and counts'
  }, {
    type: 'email',
    label: 'Email Address',
    icon: '✉️',
    desc: 'Validated email input'
  }, {
    type: 'dropdown',
    label: 'Dropdown Select',
    icon: '🔽',
    desc: 'Single choice selection list'
  }, {
    type: 'checkbox',
    label: 'Multiple Checkboxes',
    icon: '☑️',
    desc: 'Select multiple items'
  }, {
    type: 'date',
    label: 'Date Picker',
    icon: '📅',
    desc: 'Calendar date selection'
  }, {
    type: 'rating',
    label: 'Rating Scale',
    icon: '⭐',
    desc: '1 to 5 star rating scale'
  }, {
    type: 'file',
    label: 'File Upload',
    icon: '📎',
    desc: 'File attachment dropzone'
  }];

  // Refined 3 Templates (Clean and logical definitions)
  const templates = {
    customer_feedback: {
      title: 'Customer Feedback Survey',
      description: 'Collect customer satisfaction ratings and feedback',
      fields: [{
        label: 'Full Name',
        field_type: 'text',
        is_required: false,
        placeholder: 'e.g. John Doe'
      }, {
        label: 'Email Address',
        field_type: 'email',
        is_required: false,
        placeholder: 'john@example.com'
      }, {
        label: 'Overall Satisfaction Rating',
        field_type: 'rating',
        is_required: true
      }, {
        label: 'Detailed Feedback / Suggestions',
        field_type: 'text',
        is_required: true,
        placeholder: 'Tell us what you liked or what we can improve...'
      }]
    },
    event_registration: {
      title: 'Event Registration Form',
      description: 'Register attendees for upcoming events and conferences',
      fields: [{
        label: 'Full Name',
        field_type: 'text',
        is_required: true,
        placeholder: 'e.g. Sarah Connor'
      }, {
        label: 'Email Address',
        field_type: 'email',
        is_required: true,
        placeholder: 'sarah@example.com'
      }, {
        label: 'Phone Number',
        field_type: 'text',
        is_required: true,
        placeholder: '+91 9876543210'
      }, {
        label: 'Ticket / Pass Type',
        field_type: 'dropdown',
        is_required: true,
        options: [{
          option_label: 'General Admission',
          option_value: 'general_admission'
        }, {
          option_label: 'VIP Pass',
          option_value: 'vip_pass'
        }, {
          option_label: 'Student Pass',
          option_value: 'student_pass'
        }]
      }, {
        label: 'Dietary Preferences',
        field_type: 'dropdown',
        is_required: false,
        options: [{
          option_label: 'No Special Diet',
          option_value: 'no_special_diet'
        }, {
          option_label: 'Vegetarian',
          option_value: 'vegetarian'
        }, {
          option_label: 'Vegan',
          option_value: 'vegan'
        }, {
          option_label: 'Gluten-Free',
          option_value: 'gluten_free'
        }]
      }]
    },
    employee_onboarding: {
      title: 'Employee Onboarding Form',
      description: 'Standard onboarding questionnaire for new team members',
      fields: [{
        label: 'Full Name',
        field_type: 'text',
        is_required: true
      }, {
        label: 'Personal Email Address',
        field_type: 'email',
        is_required: true
      }, {
        label: 'Department / Domain',
        field_type: 'dropdown',
        is_required: true,
        options: [{
          option_label: 'Engineering',
          option_value: 'engineering'
        }, {
          option_label: 'Design',
          option_value: 'design'
        }, {
          option_label: 'Product',
          option_value: 'product'
        }, {
          option_label: 'HR & Operations',
          option_value: 'hr_operations'
        }]
      }, {
        label: 'Work Mode',
        field_type: 'dropdown',
        is_required: true,
        options: [{
          option_label: 'Remote',
          option_value: 'remote'
        }, {
          option_label: 'Hybrid',
          option_value: 'hybrid'
        }, {
          option_label: 'On-site',
          option_value: 'onsite'
        }]
      }, {
        label: 'Date of Joining',
        field_type: 'date',
        is_required: true
      }, {
        label: 'Emergency Contact Number',
        field_type: 'text',
        is_required: true
      }]
    }
  };

  // Trigger Template Selection
  const handleSelectTemplate = templateKey => {
    setShowTemplateMenu(false);
    if (fields.length > 0) {
      setPendingTemplateKey(templateKey);
      setShowTemplateConfirmModal(true);
    } else {
      executeApplyTemplate(templateKey);
    }
  };

  // Execute Template Application (Clean Replace)
  const executeApplyTemplate = async templateKey => {
    setShowTemplateConfirmModal(false);
    setActionError('');
    setApplyingTemplate(true);
    const tmpl = templates[templateKey];
    if (!tmpl) return;
    try {
      // 1. Update form title and description
      await formsApi.updateForm(form.id, {
        title: tmpl.title,
        description: tmpl.description
      });

      // 2. Clean replace: Delete all existing fields from current draft version
      if (fields.length > 0) {
        for (const f of fields) {
          try {
            await formsApi.deleteField(f.id);
          } catch (e) {}
        }
      }

      // 3. Sequentially populate template fields attached with Bearer token
      for (let i = 0; i < tmpl.fields.length; i++) {
        const f = tmpl.fields[i];
        await formsApi.addField(form.id, {
          label: f.label,
          field_type: f.field_type,
          placeholder: f.placeholder,
          is_required: f.is_required,
          display_order: i + 1,
          options: f.options
        });
      }
      await loadForm();
    } catch (err) {
      setActionError(err.message || 'Failed to populate template fields.');
    } finally {
      setApplyingTemplate(false);
      setPendingTemplateKey(null);
    }
  };

  // Execute Canvas Reset / Clear All Fields
  const executeClearCanvas = async () => {
    setShowClearCanvasModal(false);
    setActionError('');
    setClearingCanvas(true);
    try {
      if (fields.length > 0) {
        for (const f of fields) {
          try {
            await formsApi.deleteField(f.id);
          } catch (e) {}
        }
      }
      await loadForm();
    } catch (err) {
      setActionError(err.message || 'Failed to clear questions from canvas.');
    } finally {
      setClearingCanvas(false);
    }
  };
  const handleOpenAddFieldModal = ft => {
    if (isArchived) return;
    setSelectedFieldType(ft);
    setFieldModalError('');
    setNewFieldData({
      label: '',
      placeholder: '',
      is_required: false,
      max_rating: 5,
      validation_config: {
        min_length: '',
        max_length: '',
        min_value: '',
        max_value: '',
        allowed_extensions: '.pdf, .png, .jpg',
        max_size_mb: 5
      },
      options: ft.type === 'dropdown' || ft.type === 'checkbox' || ft.type === 'radio' ? [{
        option_label: '',
        option_value: ''
      }, {
        option_label: '',
        option_value: ''
      }] : []
    });
    setShowAddFieldModal(true);
  };
  const handleConfirmAddField = async () => {
    if (!newFieldData.label.trim()) {
      setFieldModalError('Question Title / Label is required.');
      return;
    }
    setFieldModalError('');
    setAddingField(true);
    try {
      let parsedOptions = undefined;
      if (selectedFieldType.type === 'dropdown' || selectedFieldType.type === 'checkbox' || selectedFieldType.type === 'radio') {
        parsedOptions = newFieldData.options.filter(o => o.option_label.trim() !== '').map((o, idx) => ({
          option_label: o.option_label.trim(),
          option_value: o.option_value.trim() || o.option_label.trim().toLowerCase().replace(/\s+/g, '_'),
          display_order: idx + 1
        }));
      }
      let validationConfig = {};
      const fType = selectedFieldType.type;
      const vc = newFieldData.validation_config || {};
      if (fType === 'rating') {
        validationConfig.max_rating = Number(newFieldData.max_rating) || 5;
      } else if (fType === 'text') {
        if (vc.min_length !== '' && vc.min_length !== null && !isNaN(Number(vc.min_length))) {
          validationConfig.min_length = parseInt(vc.min_length, 10);
        }
        if (vc.max_length !== '' && vc.max_length !== null && !isNaN(Number(vc.max_length))) {
          validationConfig.max_length = parseInt(vc.max_length, 10);
        }
      } else if (fType === 'number') {
        if (vc.min_value !== '' && vc.min_value !== null && !isNaN(Number(vc.min_value))) {
          validationConfig.min_value = Number(vc.min_value);
        }
        if (vc.max_value !== '' && vc.max_value !== null && !isNaN(Number(vc.max_value))) {
          validationConfig.max_value = Number(vc.max_value);
        }
      } else if (fType === 'file') {
        if (vc.allowed_extensions) {
          const exts = String(vc.allowed_extensions).split(',').map(s => s.trim()).filter(Boolean);
          validationConfig.allowed_extensions = exts;
        }
        if (vc.max_size_mb !== '' && vc.max_size_mb !== null && !isNaN(Number(vc.max_size_mb))) {
          validationConfig.max_size_mb = Number(vc.max_size_mb);
        }
      }
      const createdField = await formsApi.addField(form.id, {
        label: newFieldData.label.trim(),
        field_type: selectedFieldType.type,
        placeholder: newFieldData.placeholder.trim() || undefined,
        is_required: newFieldData.is_required,
        display_order: fields.length + 1,
        options: parsedOptions,
        validation_config: validationConfig
      });
      if (createdField) {
        setFields(prev => [...prev, createdField]);
      }
      setActionError('');
      setFieldModalError('');
      setShowAddFieldModal(false);
      await loadForm();
    } catch (err) {
      setFieldModalError(err.message || 'Failed to add question to canvas.');
    } finally {
      setAddingField(false);
    }
  };
  const handleSaveHeader = async () => {
    setActionError('');
    if (!editTitle.trim()) {
      setActionError('Form title cannot be empty.');
      return;
    }
    setSavingHeader(true);
    try {
      const updated = await formsApi.updateForm(form.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined
      });
      setForm(updated);
      setIsEditingHeader(false);
    } catch (err) {
      setActionError(err.message || 'Failed to update form metadata.');
    } finally {
      setSavingHeader(false);
    }
  };
  const handleStartEditField = field => {
    setEditingFieldId(field.id);
    const vc = field.validation_config || {};
    let allowedExtStr = '.pdf, .png, .jpg';
    if (vc.allowed_extensions) {
      if (Array.isArray(vc.allowed_extensions)) {
        allowedExtStr = vc.allowed_extensions.join(', ');
      } else {
        allowedExtStr = String(vc.allowed_extensions);
      }
    }
    setEditFieldState({
      label: field.label,
      placeholder: field.placeholder || '',
      is_required: field.is_required,
      field_type: field.field_type,
      validation_config: {
        min_length: vc.min_length !== undefined && vc.min_length !== null ? vc.min_length : '',
        max_length: vc.max_length !== undefined && vc.max_length !== null ? vc.max_length : '',
        min_value: vc.min_value !== undefined && vc.min_value !== null ? vc.min_value : '',
        max_value: vc.max_value !== undefined && vc.max_value !== null ? vc.max_value : '',
        allowed_extensions: allowedExtStr,
        max_size_mb: vc.max_size_mb !== undefined && vc.max_size_mb !== null ? vc.max_size_mb : 5
      },
      options: field.options && field.options.length > 0 ? field.options.map(o => ({
        option_label: o.option_label,
        option_value: o.option_value
      })) : [{
        option_label: '',
        option_value: ''
      }]
    });
  };
  const handleSaveFieldEdit = async fieldId => {
    setActionError('');
    if (!editFieldState.label.trim()) {
      setActionError('Question label cannot be empty.');
      return;
    }
    setSavingField(true);
    try {
      const parsedOptions = editFieldState.options && editFieldState.options.length > 0 ? editFieldState.options.filter(o => o.option_label.trim() !== '').map((o, idx) => ({
        option_label: o.option_label.trim(),
        option_value: o.option_value.trim() || o.option_label.trim().toLowerCase().replace(/\s+/g, '_'),
        display_order: idx + 1
      })) : undefined;
      let validationConfig = {};
      const fType = editFieldState.field_type;
      const vc = editFieldState.validation_config || {};
      if (fType === 'text') {
        if (vc.min_length !== '' && vc.min_length !== null && !isNaN(Number(vc.min_length))) {
          validationConfig.min_length = parseInt(vc.min_length, 10);
        }
        if (vc.max_length !== '' && vc.max_length !== null && !isNaN(Number(vc.max_length))) {
          validationConfig.max_length = parseInt(vc.max_length, 10);
        }
      } else if (fType === 'number') {
        if (vc.min_value !== '' && vc.min_value !== null && !isNaN(Number(vc.min_value))) {
          validationConfig.min_value = Number(vc.min_value);
        }
        if (vc.max_value !== '' && vc.max_value !== null && !isNaN(Number(vc.max_value))) {
          validationConfig.max_value = Number(vc.max_value);
        }
      } else if (fType === 'file') {
        if (vc.allowed_extensions) {
          const exts = String(vc.allowed_extensions).split(',').map(s => s.trim()).filter(Boolean);
          validationConfig.allowed_extensions = exts;
        }
        if (vc.max_size_mb !== '' && vc.max_size_mb !== null && !isNaN(Number(vc.max_size_mb))) {
          validationConfig.max_size_mb = Number(vc.max_size_mb);
        }
      }
      const updatedField = await formsApi.updateField(fieldId, {
        label: editFieldState.label.trim(),
        placeholder: editFieldState.placeholder.trim() || undefined,
        is_required: editFieldState.is_required,
        options: parsedOptions,
        validation_config: validationConfig
      });
      if (updatedField) {
        setFields(prev => prev.map(f => f.id === fieldId ? updatedField : f));
      }
      setEditingFieldId(null);
      setActionError('');
      await loadForm();
    } catch (err) {
      setActionError(err.message || 'Failed to update question details.');
    } finally {
      setSavingField(false);
    }
  };
  const confirmDeleteField = async () => {
    if (!deleteFieldId) return;
    const targetFieldId = deleteFieldId;
    setDeleteFieldId(null);
    setActionError('');
    try {
      await formsApi.deleteField(targetFieldId);
      setFields(prev => prev.filter(f => f.id !== targetFieldId));
      setActionError('');
      await loadForm();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to delete question.';
      alert("Delete failed: " + errorMsg);
    }
  };
  const handleMoveField = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const reorderedList = [...fields];
    const temp = reorderedList[index];
    reorderedList[index] = reorderedList[targetIndex];
    reorderedList[targetIndex] = temp;
    setFields(reorderedList);
    const items = reorderedList.map((f, idx) => ({
      field_id: f.id,
      display_order: idx + 1
    }));
    setActionError('');
    try {
      const updatedForm = await formsApi.reorderFields(form.id, items);
      setForm(updatedForm);
    } catch (err) {
      setActionError(err.message || 'Failed to reorder fields.');
    }
  };
  const confirmPublishForm = async () => {
    if (fields.length === 0) return;
    setActionError('');
    setPublishing(true);
    try {
      const published = await formsApi.publishForm(form.id);
      setForm(published);
      setShowPublishModal(false);
      try {
        const linkData = await formsApi.generateShareLink(published.id);
        setPublishedShareUrl(linkData.share_url);
      } catch (linkErr) {
        if (published.share_slug) {
          const origin = typeof window !== 'undefined' && window.location && window.location.origin ? window.location.origin : window.API_BASE_URL || 'http://localhost:8000';
          setPublishedShareUrl(`${origin}/app/public/index.html#/public/forms/${published.share_slug}`);
        }
      }

      // Immediately refresh version history
      try {
        const versions = await formsApi.getFormVersions(published.id);
        setVersionsList(versions);
      } catch (vErr) {
        console.error('Failed to refresh versions:', vErr);
      }
      setCopiedPublishLink(false);
      setShowPublishSuccessModal(true);
    } catch (err) {
      setActionError(err.message || 'Failed to publish form.');
    } finally {
      setPublishing(false);
    }
  };
  const handleCopyPublishLink = () => {
    if (publishedShareUrl) {
      navigator.clipboard.writeText(publishedShareUrl);
      setCopiedPublishLink(true);
      setTimeout(() => setCopiedPublishLink(false), 3000);
    }
  };
  const confirmArchiveForm = async () => {
    setActionError('');
    setArchiving(true);
    try {
      const archived = await formsApi.archiveForm(form.id);
      setForm(archived);
      setShowArchiveModal(false);
      setShowSettingsModal(false);
    } catch (err) {
      setActionError(err.message || 'Failed to archive form.');
    } finally {
      setArchiving(false);
    }
  };
  const handleUnarchiveForm = async () => {
    setActionError('');
    setUnarchiving(true);
    try {
      const unarchived = await formsApi.unarchiveForm(form.id);
      setForm(unarchived);
      setShowSettingsModal(false);
    } catch (err) {
      setActionError(err.message || 'Failed to unarchive form.');
    } finally {
      setUnarchiving(false);
    }
  };
  const confirmDeleteForm = async () => {
    if (!form) return;
    setShowDeleteFormModal(false);
    setActionError('');
    setDeletingForm(true);
    try {
      await formsApi.deleteForm(form.id);
      if (typeof window !== 'undefined') {
        window.location.hash = '#/forms';
      }
      if (typeof navigate === 'function') {
        navigate('/forms');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to delete form.';
      alert("Delete failed: " + errorMsg);
    } finally {
      setDeletingForm(false);
    }
  };
  const handleOpenVersionsModal = async () => {
    setShowVersionsModal(true);
    setLoadingVersions(true);
    setViewingVersionDetail(null);
    try {
      const versions = await formsApi.getFormVersions(form.id);
      setVersionsList(versions);
    } catch (err) {
      setActionError(err.message || 'Failed to fetch version history.');
    } finally {
      setLoadingVersions(false);
    }
  };
  const handleViewVersionDetail = async versionId => {
    try {
      const detail = await formsApi.getFormVersionDetail(form.id, versionId);
      setViewingVersionDetail(detail);
    } catch (err) {
      setActionError(err.message || 'Failed to load version details.');
    }
  };
  const handleOpenShareModal = async () => {
    setShowShareModal(true);
    setGeneratingLink(true);
    setCopiedLink(false);
    try {
      const data = await formsApi.generateShareLink(form.id);
      setShareUrl(data.share_url);
    } catch (err) {
      setActionError(err.message || 'Failed to generate share link.');
    } finally {
      setGeneratingLink(false);
    }
  };
  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };
  const getStatusBadge = status => {
    switch (status) {
      case 'draft':
        return /*#__PURE__*/React.createElement("span", {
          className: "px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full"
        }, "Draft");
      case 'published':
        return /*#__PURE__*/React.createElement("span", {
          className: "px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full"
        }, "Published");
      case 'archived':
        return /*#__PURE__*/React.createElement("span", {
          className: "px-2.5 py-0.5 text-[10px] font-bold bg-[#20232B] text-[#949089] border border-[#2A2D35] rounded-full"
        }, "Archived");
      default:
        return /*#__PURE__*/React.createElement("span", {
          className: "px-2.5 py-0.5 text-[10px] font-bold bg-[#20232B] text-[#F5F3EF] rounded-full border border-[#2A2D35]"
        }, status);
    }
  };
  if (loading) {
    return /*#__PURE__*/React.createElement(SaaSAppShell, {
      activeTab: "forms"
    }, /*#__PURE__*/React.createElement("div", {
      className: "py-16 text-center text-xs font-semibold text-[#949089]"
    }, "Loading FormPilotX Builder Studio..."));
  }
  if (error || !form) {
    return /*#__PURE__*/React.createElement(SaaSAppShell, {
      activeTab: "forms"
    }, /*#__PURE__*/React.createElement("div", {
      className: "p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 font-medium mb-4"
    }, error || 'Form not found'), /*#__PURE__*/React.createElement("button", {
      onClick: () => navigate('/forms'),
      className: "px-4 py-2 bg-gradient-to-r from-[#DFB257] to-[#E2B858] text-[#121316] text-xs font-bold rounded-xl cursor-pointer"
    }, "\u2190 Back to Portfolio"));
  }
  return /*#__PURE__*/React.createElement(SaaSAppShell, {
    activeTab: "forms"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 sm:p-6 w-full max-w-7xl mx-auto space-y-4 sm:space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 sm:px-6 sm:py-3.5 border-b border-[#2A2D35] flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 sm:gap-3 min-w-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => navigate('/forms'),
    className: "text-xs font-bold text-[#949089] hover:text-[#F5F3EF] transition-colors flex items-center gap-1 cursor-pointer shrink-0"
  }, "\u2190 Portfolio"), /*#__PURE__*/React.createElement("span", {
    className: "text-[#2A2D35]"
  }, "|"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 min-w-0"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-sm sm:text-lg font-semibold bg-transparent border-none focus:ring-0 max-w-[140px] sm:max-w-xs truncate text-[#F5F3EF]"
  }, form.title), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[10px] text-[#949089] bg-[#16181D] px-2 py-0.5 rounded-lg border border-[#2A2D35] shrink-0"
  }, "v", activeVersion ? activeVersion.version_number : 1), /*#__PURE__*/React.createElement("span", {
    className: "shrink-0"
  }, getStatusBadge(form.status)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 sm:gap-2.5 relative shrink-0"
  }, !isArchived && /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowTemplateMenu(!showTemplateMenu),
    disabled: applyingTemplate,
    className: "px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] font-bold rounded-xl border border-[#2A2D35] shadow-sm transition-all flex items-center gap-1 sm:gap-2 cursor-pointer disabled:opacity-50"
  }, /*#__PURE__*/React.createElement("span", null, "\u26A1"), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, applyingTemplate ? 'Applying...' : '1-Click Templates'), /*#__PURE__*/React.createElement("span", null, "\u25BC")), showTemplateMenu && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-40",
    onClick: () => setShowTemplateMenu(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute right-0 top-10 w-72 bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] z-50 p-2 space-y-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 text-[10px] font-bold text-[#949089] uppercase tracking-wider border-b border-[#2A2D35]"
  }, "Pre-built Form Templates"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleSelectTemplate('customer_feedback'),
    className: "w-full text-left p-2.5 hover:bg-[#20232B] rounded-xl transition-colors space-y-0.5 cursor-pointer"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-xs text-[#F5F3EF]"
  }, "\u2B50 Customer Feedback Survey"), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-[#949089]"
  }, "4 fields (Name, Email, Rating 1-5, Feedback)")), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleSelectTemplate('event_registration'),
    className: "w-full text-left p-2.5 hover:bg-[#20232B] rounded-xl transition-colors space-y-0.5 cursor-pointer"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-xs text-[#F5F3EF]"
  }, "\uD83C\uDF9F\uFE0F Event Registration"), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-[#949089]"
  }, "5 fields (Name, Email, Phone, Pass Type, Dietary)")), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleSelectTemplate('employee_onboarding'),
    className: "w-full text-left p-2.5 hover:bg-[#20232B] rounded-xl transition-colors space-y-0.5 cursor-pointer"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-xs text-[#F5F3EF]"
  }, "\uD83C\uDFE2 Employee Onboarding"), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-[#949089]"
  }, "6 fields (Name, Email, Dept, Mode, Date of Joining, Emergency)"))))), !isArchived && /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowClearCanvasModal(true),
    disabled: clearingCanvas || fields.length === 0,
    className: "hidden sm:flex px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] font-bold rounded-xl transition-all border border-[#2A2D35] shadow-sm items-center gap-1 sm:gap-2 disabled:opacity-50 cursor-pointer",
    title: "Clear all questions from canvas"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDDD1\uFE0F"), /*#__PURE__*/React.createElement("span", null, clearingCanvas ? 'Clearing...' : 'Clear All Fields')), !isArchived && /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowPublishModal(true),
    className: "px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-[#DFB257] to-[#E2B858] hover:brightness-110 text-[#121316] font-bold rounded-xl transition-all shadow-sm flex items-center gap-1 sm:gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDE80"), " ", /*#__PURE__*/React.createElement("span", null, "Publish")), /*#__PURE__*/React.createElement("button", {
    onClick: openSettingsModal,
    className: "px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] font-bold rounded-xl transition-all border border-[#2A2D35] shadow-sm flex items-center gap-1 sm:gap-2 cursor-pointer",
    title: "Form Settings & Availability"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-[16px] text-[#E2B858]"
  }, "tune"), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, "Settings")), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowThreeDotMenu(!showThreeDotMenu),
    className: "w-8 h-8 flex items-center justify-center bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] font-black text-sm sm:text-base rounded-xl transition-all border border-[#2A2D35] shadow-sm cursor-pointer",
    title: "Form Actions"
  }, "\u22EE"), showThreeDotMenu && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-40",
    onClick: () => setShowThreeDotMenu(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute right-0 top-10 w-56 bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] z-50 p-2 space-y-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowThreeDotMenu(false);
      openSettingsModal();
    },
    className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", null, "\u2699\uFE0F"), " Form Settings"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowThreeDotMenu(false);
      navigate(`/forms/${form.id}/edit`);
    },
    className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83C\uDFA8"), " Open Form Builder"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowThreeDotMenu(false);
      handleOpenShareModal();
    },
    className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD17"), " Share Public Link"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowThreeDotMenu(false);
      handleOpenVersionsModal();
    },
    className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCDC"), " Version History"), isArchived ? /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowThreeDotMenu(false);
      handleUnarchiveForm();
    },
    disabled: unarchiving,
    className: "w-full text-left px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD04"), " Unarchive Form") : /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowThreeDotMenu(false);
      setShowArchiveModal(true);
    },
    className: "w-full text-left px-3 py-2 text-xs font-bold text-[#F5F3EF] hover:bg-[#20232B] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCE6"), " Archive Form"), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-[#2A2D35] my-1"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowThreeDotMenu(false);
      setShowDeleteFormModal(true);
    },
    className: "w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDDD1\uFE0F"), " Delete Form")))))), actionError && /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-medium"
  }, actionError), /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-6 shadow-sm space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold text-[#949089] uppercase tracking-wider"
  }, "Form Metadata Specification"), !isArchived && /*#__PURE__*/React.createElement("button", {
    onClick: () => setIsEditingHeader(!isEditingHeader),
    className: "text-xs font-bold text-[#E2B858] hover:underline transition-colors cursor-pointer"
  }, isEditingHeader ? 'Cancel Edit' : '✏️ Edit Title & Description')), isEditingHeader && !isArchived ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 pt-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF] mb-1"
  }, "Title"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: editTitle,
    onChange: e => setEditTitle(e.target.value),
    className: "w-full px-3.5 py-2 bg-[#16181D] border border-[#2A2D35] rounded-xl text-xs font-bold text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF] mb-1"
  }, "Description"), /*#__PURE__*/React.createElement("textarea", {
    value: editDescription,
    onChange: e => setEditDescription(e.target.value),
    rows: 2,
    className: "w-full p-3.5 bg-[#16181D] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858] resize-none"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveHeader,
    disabled: savingHeader,
    className: "px-4 py-2 bg-gradient-to-r from-[#DFB257] to-[#E2B858] hover:brightness-110 text-[#121316] text-xs font-bold rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
  }, savingHeader ? 'Saving Details...' : 'Save Details'))) : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-black text-[#F5F3EF]"
  }, form.title), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089] mt-1"
  }, form.description || 'No description provided.'))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
  }, !isArchived && /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-4 bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-6 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-b border-[#2A2D35] pb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-[#F5F3EF] flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDEE0\uFE0F"), " Field Type Palette"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-[#949089] mt-1"
  }, "Click a field card to append it to your canvas:")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-2"
  }, fieldTypesList.map(ft => /*#__PURE__*/React.createElement("button", {
    key: ft.type,
    type: "button",
    onClick: () => handleOpenAddFieldModal(ft),
    className: "p-3 rounded-xl border border-[#2A2D35] bg-[#16181D] hover:bg-[#20232B] hover:border-[#E2B858]/40 text-left text-xs transition-all flex items-center justify-between group shadow-sm cursor-pointer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base"
  }, ft.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-[#F5F3EF] group-hover:text-[#E2B858] transition-colors"
  }, ft.label), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-[#949089]"
  }, ft.desc))), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-[#949089] group-hover:text-[#E2B858] font-bold transition-colors"
  }, "+ Add"))))), /*#__PURE__*/React.createElement("div", {
    className: `${isArchived ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-4`
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-6 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-5 pb-3 border-b border-[#2A2D35] flex-wrap gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setActiveStudioTab('fields'),
    className: `px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeStudioTab === 'fields' ? 'bg-gradient-to-r from-[#DFB257] to-[#E2B858] text-[#121316] shadow-sm' : 'bg-[#20232B] hover:bg-[#2A2D35] text-[#949089] hover:text-[#F5F3EF] border border-[#2A2D35]'}`
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC4"), " Questions (", fields.length, ")"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setActiveStudioTab('rules'),
    className: `px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeStudioTab === 'rules' ? 'bg-gradient-to-r from-[#DFB257] to-[#E2B858] text-[#121316] shadow-sm' : 'bg-[#20232B] hover:bg-[#2A2D35] text-[#949089] hover:text-[#F5F3EF] border border-[#2A2D35]'}`
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD00"), " Conditional Logic (", rules.length, ")")), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-[#949089]"
  }, activeStudioTab === 'fields' ? 'Click any card to edit question details' : 'Show, hide, or require questions dynamically')), activeStudioTab === 'fields' && /*#__PURE__*/React.createElement(React.Fragment, null, fields.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "p-12 text-center bg-[#1A1D24] border border-dashed border-[#2A2D35] rounded-2xl space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-2xl bg-[#20232B] text-[#949089] flex items-center justify-center text-xl mx-auto border border-[#2A2D35]"
  }, "\u270D\uFE0F"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-[#F5F3EF]"
  }, "Form Canvas is Empty"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-[#949089]"
  }, "Select a field type from the left palette or use \u26A1 1-Click Templates to populate questions.")) : /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, fields.map((field, idx) => {
    const isEditing = editingFieldId === field.id;
    return /*#__PURE__*/React.createElement("div", {
      key: field.id,
      onClick: () => {
        if (!isEditing && !isArchived) {
          handleStartEditField(field);
        }
      },
      className: `p-3.5 sm:p-5 rounded-xl mb-3 sm:mb-4 border transition-all shadow-sm flex flex-col gap-3 sm:gap-4 cursor-pointer ${isEditing ? 'bg-[#1A1D24] border-[#E2B858] ring-2 ring-[#E2B858]/20' : 'bg-[#1A1D24] border-[#2A2D35] hover:border-[#E2B858]/50 hover:shadow-md'}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2 border-b border-[#2A2D35] pb-2 sm:pb-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 sm:gap-2 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold text-[#F5F3EF]"
    }, idx + 1, ". ", field.label), field.is_required && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 sm:px-2 py-0.5 rounded border border-rose-500/20"
    }, "Required"), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-semibold text-[#949089] bg-[#20232B] px-1.5 sm:px-2 py-0.5 rounded-full uppercase border border-[#2A2D35]"
    }, field.field_type)), !isArchived && /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 sm:gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        handleMoveField(idx, 'up');
      },
      disabled: idx === 0,
      title: "Move Up",
      className: "p-1.5 rounded-md bg-[#20232B] border border-[#2A2D35] text-xs text-[#F5F3EF] hover:bg-[#2A2D35] disabled:opacity-30 flex items-center justify-center font-bold"
    }, "\u25B2"), /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        handleMoveField(idx, 'down');
      },
      disabled: idx === fields.length - 1,
      title: "Move Down",
      className: "p-1.5 rounded-md bg-[#20232B] border border-[#2A2D35] text-xs text-[#F5F3EF] hover:bg-[#2A2D35] disabled:opacity-30 flex items-center justify-center font-bold"
    }, "\u25BC"), /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        isEditing ? setEditingFieldId(null) : handleStartEditField(field);
      },
      className: "p-1.5 px-2.5 sm:px-3 text-xs font-bold text-[#E2B858] bg-[#20232B] hover:bg-[#2A2D35] border border-[#2A2D35] rounded-lg transition-colors"
    }, isEditing ? 'Close' : '✏️ Edit'), /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setDeleteFieldId(field.id);
      },
      className: "p-1.5 px-2 sm:px-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
    }, "Delete"))), isEditing ? /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      className: "space-y-4 pt-1 bg-[#16181D] p-3.5 sm:p-4 rounded-xl border border-[#2A2D35] cursor-default"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-xs font-bold text-[#F5F3EF] mb-1"
    }, "Question Label ", /*#__PURE__*/React.createElement("span", {
      className: "text-rose-400"
    }, "*")), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: editFieldState.label,
      onChange: e => setEditFieldState({
        ...editFieldState,
        label: e.target.value
      }),
      className: "w-full text-xs sm:text-sm font-medium py-1.5 px-2.5 bg-[#20232B] border border-[#2A2D35] rounded-xl text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-xs font-bold text-[#F5F3EF] mb-1"
    }, "Placeholder & Help Text"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: "e.g. Enter response here...",
      value: editFieldState.placeholder,
      onFocus: e => e.target.select(),
      onChange: e => setEditFieldState({
        ...editFieldState,
        placeholder: e.target.value
      }),
      className: "w-full h-9 px-3 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2.5 pt-1"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      id: `req_${field.id}`,
      checked: editFieldState.is_required,
      onChange: e => setEditFieldState({
        ...editFieldState,
        is_required: e.target.checked
      }),
      className: "w-4 h-4 text-[#E2B858] bg-[#20232B] border-[#2A2D35] rounded focus:ring-0"
    }), /*#__PURE__*/React.createElement("label", {
      htmlFor: `req_${field.id}`,
      className: "text-xs font-bold text-[#F5F3EF] cursor-pointer"
    }, "Required Toggle Switch")), (field.field_type === 'dropdown' || field.field_type === 'checkbox') && /*#__PURE__*/React.createElement("div", {
      className: "pt-3 border-t border-[#2A2D35] space-y-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("label", {
      className: "block text-xs font-bold text-[#F5F3EF]"
    }, "Choices Options Editor"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setEditFieldState({
        ...editFieldState,
        options: [...editFieldState.options, {
          option_label: '',
          option_value: ''
        }]
      }),
      className: "text-[11px] font-bold text-[#E2B858] hover:underline"
    }, "+ Add Choice")), editFieldState.options.map((opt, oIdx) => /*#__PURE__*/React.createElement("div", {
      key: oIdx,
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: "Enter option name...",
      value: opt.option_label,
      onFocus: e => e.target.select(),
      onChange: e => {
        const updatedOpts = [...editFieldState.options];
        updatedOpts[oIdx].option_label = e.target.value;
        updatedOpts[oIdx].option_value = e.target.value.toLowerCase().replace(/\s+/g, '_');
        setEditFieldState({
          ...editFieldState,
          options: updatedOpts
        });
      },
      className: "flex-1 h-8 px-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
    }), editFieldState.options.length > 1 && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        const updatedOpts = editFieldState.options.filter((_, i) => i !== oIdx);
        setEditFieldState({
          ...editFieldState,
          options: updatedOpts
        });
      },
      className: "w-7 h-7 text-rose-400 hover:bg-rose-500/20 rounded flex items-center justify-center font-bold text-xs"
    }, "\u2715")))), field.field_type === 'text' && /*#__PURE__*/React.createElement("div", {
      className: "pt-3 border-t border-[#2A2D35] space-y-2"
    }, /*#__PURE__*/React.createElement("label", {
      className: "block text-xs font-bold text-[#F5F3EF]"
    }, "Validation Constraints (Length)"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 gap-2"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-[10px] text-[#949089] font-semibold mb-1"
    }, "Min Length"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      placeholder: "e.g. 0",
      value: editFieldState.validation_config?.min_length ?? '',
      onChange: e => setEditFieldState({
        ...editFieldState,
        validation_config: {
          ...editFieldState.validation_config,
          min_length: e.target.value
        }
      }),
      className: "w-full h-8 px-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-[10px] text-[#949089] font-semibold mb-1"
    }, "Max Length"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      placeholder: "e.g. 255",
      value: editFieldState.validation_config?.max_length ?? '',
      onChange: e => setEditFieldState({
        ...editFieldState,
        validation_config: {
          ...editFieldState.validation_config,
          max_length: e.target.value
        }
      }),
      className: "w-full h-8 px-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
    })))), field.field_type === 'number' && /*#__PURE__*/React.createElement("div", {
      className: "pt-3 border-t border-[#2A2D35] space-y-2"
    }, /*#__PURE__*/React.createElement("label", {
      className: "block text-xs font-bold text-[#F5F3EF]"
    }, "Validation Constraints (Range)"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 gap-2"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-[10px] text-[#949089] font-semibold mb-1"
    }, "Min Value"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      placeholder: "e.g. 0",
      value: editFieldState.validation_config?.min_value ?? '',
      onChange: e => setEditFieldState({
        ...editFieldState,
        validation_config: {
          ...editFieldState.validation_config,
          min_value: e.target.value
        }
      }),
      className: "w-full h-8 px-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-[10px] text-[#949089] font-semibold mb-1"
    }, "Max Value"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      placeholder: "e.g. 100",
      value: editFieldState.validation_config?.max_value ?? '',
      onChange: e => setEditFieldState({
        ...editFieldState,
        validation_config: {
          ...editFieldState.validation_config,
          max_value: e.target.value
        }
      }),
      className: "w-full h-8 px-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
    })))), field.field_type === 'file' && /*#__PURE__*/React.createElement("div", {
      className: "pt-3 border-t border-[#2A2D35] space-y-2"
    }, /*#__PURE__*/React.createElement("label", {
      className: "block text-xs font-bold text-[#F5F3EF]"
    }, "Validation Constraints (File Upload)"), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-[10px] text-[#949089] font-semibold mb-1"
    }, "Allowed Extensions (comma-separated)"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: ".pdf, .png, .jpg",
      value: editFieldState.validation_config?.allowed_extensions ?? '',
      onChange: e => setEditFieldState({
        ...editFieldState,
        validation_config: {
          ...editFieldState.validation_config,
          allowed_extensions: e.target.value
        }
      }),
      className: "w-full h-8 px-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] font-mono focus:outline-none focus:border-[#E2B858]"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-[10px] text-[#949089] font-semibold mb-1"
    }, "Max Size (MB)"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      max: "50",
      placeholder: "5",
      value: editFieldState.validation_config?.max_size_mb ?? '',
      onChange: e => setEditFieldState({
        ...editFieldState,
        validation_config: {
          ...editFieldState.validation_config,
          max_size_mb: e.target.value
        }
      }),
      className: "w-full h-8 px-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
    })))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-end gap-2 pt-2 border-t border-[#2A2D35]"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setEditingFieldId(null),
      className: "px-3.5 py-1.5 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] text-xs font-semibold rounded-xl"
    }, "Cancel"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => handleSaveFieldEdit(field.id),
      disabled: savingField,
      className: "px-4 py-1.5 bg-gradient-to-r from-[#DFB257] to-[#E2B858] hover:brightness-110 text-[#121316] text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
    }, savingField ? 'Saving...' : 'Save Changes'))) :
    /*#__PURE__*/
    /* Preview-Only Canvas Inputs (pointer-events-none, disabled, readOnly) */
    React.createElement("div", {
      className: "space-y-2 pointer-events-none select-none cursor-default"
    }, field.field_type === 'text' && /*#__PURE__*/React.createElement("input", {
      type: "text",
      disabled: true,
      readOnly: true,
      placeholder: field.placeholder || 'Enter text response...',
      className: "w-full h-10 px-3.5 bg-[#16181D] border border-[#2A2D35] rounded-xl text-xs text-[#949089] transition-all"
    }), field.field_type === 'email' && /*#__PURE__*/React.createElement("input", {
      type: "email",
      disabled: true,
      readOnly: true,
      placeholder: field.placeholder || 'name@company.com',
      className: "w-full h-10 px-3.5 bg-[#16181D] border border-[#2A2D35] rounded-xl text-xs text-[#949089] transition-all"
    }), field.field_type === 'number' && /*#__PURE__*/React.createElement("input", {
      type: "number",
      disabled: true,
      readOnly: true,
      placeholder: field.placeholder || 'e.g. 10',
      className: "w-full h-10 px-3.5 bg-[#16181D] border border-[#2A2D35] rounded-xl text-xs text-[#949089] transition-all"
    }), field.field_type === 'date' && /*#__PURE__*/React.createElement("input", {
      type: "date",
      disabled: true,
      readOnly: true,
      className: "w-full h-10 px-3.5 bg-[#16181D] border border-[#2A2D35] rounded-xl text-xs text-[#949089] transition-all"
    }), field.field_type === 'dropdown' && /*#__PURE__*/React.createElement("select", {
      disabled: true,
      className: "w-full h-10 px-3.5 bg-[#16181D] border border-[#2A2D35] rounded-xl text-xs text-[#949089] font-semibold transition-all"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Select option..."), field.options && field.options.map(opt => /*#__PURE__*/React.createElement("option", {
      key: opt.id || opt.option_value,
      value: opt.option_value
    }, opt.option_label))), field.field_type === 'checkbox' && /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-2 pt-1"
    }, field.options && field.options.map(opt => /*#__PURE__*/React.createElement("label", {
      key: opt.id || opt.option_value,
      className: "flex items-center gap-2 px-3 py-1.5 bg-[#16181D] border border-[#2A2D35] rounded-xl text-xs font-semibold text-[#949089] transition-colors"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      disabled: true,
      className: "w-3.5 h-3.5 text-[#949089] rounded border-[#2A2D35] bg-[#20232B]"
    }), /*#__PURE__*/React.createElement("span", null, opt.option_label)))), field.field_type === 'rating' && /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 pt-1"
    }, [1, 2, 3, 4, 5].map(s => /*#__PURE__*/React.createElement("button", {
      key: s,
      type: "button",
      disabled: true,
      className: "px-3 py-1.5 bg-[#16181D] border border-[#2A2D35] rounded-xl text-xs text-[#949089] font-bold transition-all"
    }, "\u2605 ", s))), field.field_type === 'file' && /*#__PURE__*/React.createElement("div", {
      className: "p-4 bg-[#16181D] border border-dashed border-[#2A2D35] rounded-xl text-xs text-[#949089] text-center"
    }, "\uD83D\uDCCE File attachment dropzone")));
  }), !isArchived && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleOpenAddFieldModal(fieldTypesList[0]),
    className: "w-full py-2.5 text-xs sm:text-sm rounded-xl border border-dashed border-[#E2B858]/50 text-[#E2B858] hover:bg-[#E2B858]/10 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-sm"
  }, "add"), /*#__PURE__*/React.createElement("span", null, "Add Question")))), activeStudioTab === 'rules' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, !isArchived && /*#__PURE__*/React.createElement("div", {
    className: "p-5 bg-[#16181D] border border-[#2A2D35] rounded-2xl space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-xs text-[#F5F3EF] uppercase tracking-wider flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "\u2795"), " Add New Conditional Rule"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-[#949089]"
  }, "Dynamically branch your form flow")), fields.length < 2 ? /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400"
  }, "\u26A0\uFE0F You need at least 2 questions in your form to configure conditional rules (one trigger and one target question).") : /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSaveRule,
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF] mb-1"
  }, "If this question... ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-400"
  }, "*")), /*#__PURE__*/React.createElement("select", {
    value: newRuleData.trigger_field_id,
    onChange: e => setNewRuleData({
      ...newRuleData,
      trigger_field_id: e.target.value,
      comparison_value: ''
    }),
    className: "w-full h-9 px-3 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] font-medium focus:outline-none focus:border-[#E2B858] cursor-pointer"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select trigger question..."), fields.map((f, idx) => /*#__PURE__*/React.createElement("option", {
    key: f.id,
    value: f.id
  }, idx + 1, ". ", f.label, " (", f.field_type, ")")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF] mb-1"
  }, "Operator ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-400"
  }, "*")), /*#__PURE__*/React.createElement("select", {
    value: newRuleData.operator,
    onChange: e => setNewRuleData({
      ...newRuleData,
      operator: e.target.value
    }),
    className: "w-full h-9 px-3 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] font-medium focus:outline-none focus:border-[#E2B858] cursor-pointer"
  }, /*#__PURE__*/React.createElement("option", {
    value: "equals"
  }, "Equals (==)"), /*#__PURE__*/React.createElement("option", {
    value: "not_equals"
  }, "Not Equals (!=)"), /*#__PURE__*/React.createElement("option", {
    value: "contains"
  }, "Contains"), /*#__PURE__*/React.createElement("option", {
    value: "greater_than"
  }, "Greater Than (>)"), /*#__PURE__*/React.createElement("option", {
    value: "is_empty"
  }, "Is Empty"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF] mb-1"
  }, "Comparison Value ", newRuleData.operator !== 'is_empty' && /*#__PURE__*/React.createElement("span", {
    className: "text-rose-400"
  }, "*")), newRuleData.operator === 'is_empty' ? /*#__PURE__*/React.createElement("div", {
    className: "h-9 px-3 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#949089] flex items-center italic"
  }, "Not needed for \"Is Empty\"") : (() => {
    const trigField = fields.find(f => f.id === newRuleData.trigger_field_id);
    if (trigField && trigField.options && trigField.options.length > 0) {
      return /*#__PURE__*/React.createElement("select", {
        value: newRuleData.comparison_value,
        onChange: e => setNewRuleData({
          ...newRuleData,
          comparison_value: e.target.value
        }),
        className: "w-full h-9 px-3 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] font-medium focus:outline-none focus:border-[#E2B858] cursor-pointer"
      }, /*#__PURE__*/React.createElement("option", {
        value: ""
      }, "Select option value..."), trigField.options.map(opt => /*#__PURE__*/React.createElement("option", {
        key: opt.id || opt.option_value,
        value: opt.option_value
      }, opt.option_label, " (", opt.option_value, ")")));
    }
    return /*#__PURE__*/React.createElement("input", {
      type: trigField && trigField.field_type === 'number' ? 'number' : 'text',
      value: newRuleData.comparison_value,
      onChange: e => setNewRuleData({
        ...newRuleData,
        comparison_value: e.target.value
      }),
      placeholder: "Enter expected value...",
      className: "w-full h-9 px-3 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] font-medium focus:outline-none focus:border-[#E2B858]"
    });
  })())), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-3 pt-1"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF] mb-1"
  }, "Then Action ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-400"
  }, "*")), /*#__PURE__*/React.createElement("select", {
    value: newRuleData.action,
    onChange: e => setNewRuleData({
      ...newRuleData,
      action: e.target.value
    }),
    className: "w-full h-9 px-3 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] font-medium focus:outline-none focus:border-[#E2B858] cursor-pointer"
  }, /*#__PURE__*/React.createElement("option", {
    value: "show"
  }, "Show question"), /*#__PURE__*/React.createElement("option", {
    value: "hide"
  }, "Hide question"), /*#__PURE__*/React.createElement("option", {
    value: "show_and_require"
  }, "Show and make question required"), /*#__PURE__*/React.createElement("option", {
    value: "require"
  }, "Make question required"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF] mb-1"
  }, "Target Question ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-400"
  }, "*")), /*#__PURE__*/React.createElement("select", {
    value: newRuleData.target_field_id,
    onChange: e => setNewRuleData({
      ...newRuleData,
      target_field_id: e.target.value
    }),
    className: "w-full h-9 px-3 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] font-medium focus:outline-none focus:border-[#E2B858] cursor-pointer"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select target question..."), fields.filter(f => f.id !== newRuleData.trigger_field_id).map((f, idx) => /*#__PURE__*/React.createElement("option", {
    key: f.id,
    value: f.id
  }, f.label, " (", f.field_type, ")"))))), rulesError && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-medium"
  }, rulesError), ruleSuccessMsg && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-semibold"
  }, ruleSuccessMsg), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: savingRule || !newRuleData.trigger_field_id || !newRuleData.target_field_id,
    className: "px-4 py-2 bg-gradient-to-r from-[#DFB257] to-[#E2B858] hover:brightness-110 text-[#121316] font-bold text-xs rounded-xl shadow-sm disabled:opacity-40 transition-all flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "\u2795"), " ", savingRule ? 'Saving Rule...' : 'Save Conditional Rule')))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-xs text-[#F5F3EF] uppercase tracking-wider flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCDC"), " Configured Conditional Rules (", rules.length, ")"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: loadRules,
    disabled: loadingRules,
    className: "text-[11px] font-semibold text-[#949089] hover:text-[#E2B858] transition-colors"
  }, loadingRules ? 'Refreshing...' : '↻ Refresh Rules')), loadingRules ? /*#__PURE__*/React.createElement("div", {
    className: "p-8 text-center bg-[#16181D] border border-[#2A2D35] rounded-xl text-xs text-[#949089]"
  }, "Loading conditional rules...") : rules.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "p-8 text-center bg-[#16181D] border border-dashed border-[#2A2D35] rounded-2xl space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl"
  }, "\uD83D\uDD00"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-[#F5F3EF]"
  }, "No Conditional Rules Configured"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-[#949089] max-w-sm mx-auto"
  }, "Create dynamic branching logic to show, hide, or require questions based on what respondents select.")) : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, rules.map(rule => {
    const trig = fields.find(f => f.id === rule.trigger_field_id);
    const targ = fields.find(f => f.id === rule.target_field_id);
    const trigName = trig ? trig.label : rule.trigger_field_id ? `Field (${String(rule.trigger_field_id).slice(0, 8)}...)` : 'Unknown Field';
    const targName = targ ? targ.label : rule.target_field_id ? `Field (${String(rule.target_field_id).slice(0, 8)}...)` : 'Unknown Field';
    let actionBadge = /*#__PURE__*/React.createElement("span", {
      className: "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
    }, "SHOW");
    if (rule.action === 'hide') {
      actionBadge = /*#__PURE__*/React.createElement("span", {
        className: "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30"
      }, "HIDE");
    } else if (rule.action === 'require') {
      actionBadge = /*#__PURE__*/React.createElement("span", {
        className: "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30"
      }, "REQUIRE");
    } else if (rule.action === 'show_and_require') {
      actionBadge = /*#__PURE__*/React.createElement("span", {
        className: "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
      }, "SHOW & REQUIRE");
    }
    return /*#__PURE__*/React.createElement("div", {
      key: rule.id,
      className: "p-4 bg-[#16181D] border border-[#2A2D35] rounded-xl shadow-sm flex items-center justify-between gap-4 hover:border-[#E2B858]/40 transition-all"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex-1 text-xs space-y-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-[#949089] text-[11px] uppercase tracking-wider"
    }, "IF"), /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-[#F5F3EF] bg-[#20232B] px-2 py-0.5 rounded-lg border border-[#2A2D35]"
    }, trigName), /*#__PURE__*/React.createElement("span", {
      className: "text-[#949089] font-mono text-[11px]"
    }, rule.operator), rule.operator !== 'is_empty' && /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-[#E2B858] bg-[#20232B] px-2 py-0.5 rounded-lg border border-[#2A2D35]"
    }, "\"", rule.comparison_value, "\"")), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 pt-1 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-[#949089] text-[11px] uppercase tracking-wider"
    }, "THEN"), actionBadge, /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-[#F5F3EF] bg-[#20232B] px-2 py-0.5 rounded-lg border border-[#2A2D35]"
    }, targName))), !isArchived && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => handleDeleteRule(rule.id),
      disabled: deletingRuleId === rule.id,
      title: "Delete Rule",
      className: "w-8 h-8 rounded-lg bg-[#20232B] hover:bg-rose-500/20 text-[#949089] hover:text-rose-400 border border-[#2A2D35] flex items-center justify-center text-xs transition-colors shrink-0 disabled:opacity-40"
    }, deletingRuleId === rule.id ? '...' : '🗑️'));
  })))))))), showTemplateConfirmModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-sm w-full p-6 text-left space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-base"
  }, "Replace existing questions?"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089] leading-relaxed"
  }, "Applying this template will clean replace the ", fields.length, " existing question", fields.length === 1 ? '' : 's', " on this draft canvas. Continue?"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-3 pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowTemplateConfirmModal(false);
      setPendingTemplateKey(null);
    },
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] font-semibold text-xs rounded-xl"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: () => executeApplyTemplate(pendingTemplateKey),
    disabled: applyingTemplate,
    className: "px-4 py-2 bg-gradient-to-r from-[#DFB257] to-[#E2B858] hover:brightness-110 text-[#121316] font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
  }, applyingTemplate ? 'Applying Template...' : 'Replace & Apply Template')))), showAddFieldModal && selectedFieldType && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-md w-full p-6 text-left space-y-4 max-h-[90vh] overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between border-b border-[#2A2D35] pb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-base flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, selectedFieldType.icon), " Add New ", selectedFieldType.label, " Question"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAddFieldModal(false),
    className: "text-[#949089] hover:text-[#F5F3EF] font-bold text-sm"
  }, "\u2715")), fieldModalError && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-medium"
  }, fieldModalError), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF] mb-1"
  }, "Question Title / Label ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-400"
  }, "*")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    autoFocus: true,
    placeholder: "e.g. What is your full name?",
    value: newFieldData.label,
    onChange: e => setNewFieldData({
      ...newFieldData,
      label: e.target.value
    }),
    className: "w-full h-10 px-3.5 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs font-bold text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
  })), (selectedFieldType.type === 'text' || selectedFieldType.type === 'email' || selectedFieldType.type === 'number' || selectedFieldType.type === 'date' || selectedFieldType.type === 'file') && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF] mb-1"
  }, "Placeholder / Help Text ", /*#__PURE__*/React.createElement("span", {
    className: "text-[#949089] font-normal"
  }, "(Optional)")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "e.g. Enter response here...",
    value: newFieldData.placeholder,
    onFocus: e => e.target.select(),
    onChange: e => setNewFieldData({
      ...newFieldData,
      placeholder: e.target.value
    }),
    className: "w-full h-9 px-3 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5 pt-1"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    id: "modal_field_required",
    checked: newFieldData.is_required,
    onChange: e => setNewFieldData({
      ...newFieldData,
      is_required: e.target.checked
    }),
    className: "w-4 h-4 text-[#E2B858] bg-[#20232B] border-[#2A2D35] rounded cursor-pointer"
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "modal_field_required",
    className: "text-xs font-bold text-[#F5F3EF] cursor-pointer"
  }, "Required Question")), (selectedFieldType.type === 'dropdown' || selectedFieldType.type === 'checkbox' || selectedFieldType.type === 'radio') && /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-[#2A2D35] space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF]"
  }, "Choice Options Manager"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setNewFieldData({
      ...newFieldData,
      options: [...newFieldData.options, {
        option_label: '',
        option_value: ''
      }]
    }),
    className: "text-xs font-bold text-[#E2B858] hover:underline"
  }, "+ Add Option")), newFieldData.options.map((opt, oIdx) => /*#__PURE__*/React.createElement("div", {
    key: oIdx,
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Enter option name...",
    value: opt.option_label,
    onFocus: e => e.target.select(),
    onChange: e => {
      const updatedOpts = [...newFieldData.options];
      updatedOpts[oIdx].option_label = e.target.value;
      updatedOpts[oIdx].option_value = e.target.value.toLowerCase().replace(/\s+/g, '_');
      setNewFieldData({
        ...newFieldData,
        options: updatedOpts
      });
    },
    className: "flex-1 h-9 px-3 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
  }), newFieldData.options.length > 1 && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      const updatedOpts = newFieldData.options.filter((_, i) => i !== oIdx);
      setNewFieldData({
        ...newFieldData,
        options: updatedOpts
      });
    },
    className: "w-7 h-7 text-rose-400 hover:bg-rose-500/20 rounded flex items-center justify-center font-bold text-xs",
    title: "Remove option"
  }, "\u2715")))), selectedFieldType.type === 'rating' && /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-[#2A2D35] space-y-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF] mb-1"
  }, "Max Rating Limit"), /*#__PURE__*/React.createElement("select", {
    value: newFieldData.max_rating,
    onChange: e => setNewFieldData({
      ...newFieldData,
      max_rating: Number(e.target.value)
    }),
    className: "w-full h-9 px-3 bg-[#20232B] border border-[#2A2D35] rounded-xl text-xs font-bold text-[#F5F3EF] focus:outline-none focus:border-[#E2B858] cursor-pointer"
  }, /*#__PURE__*/React.createElement("option", {
    value: 5
  }, "5 Stars (1 to 5 scale)"), /*#__PURE__*/React.createElement("option", {
    value: 10
  }, "10 Stars (1 to 10 scale)"))), selectedFieldType.type === 'text' && /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-[#2A2D35] space-y-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF]"
  }, "Validation Constraints (Length)"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10px] text-[#949089] font-semibold mb-1"
  }, "Min Length"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    placeholder: "e.g. 0",
    value: newFieldData.validation_config?.min_length ?? '',
    onChange: e => setNewFieldData({
      ...newFieldData,
      validation_config: {
        ...newFieldData.validation_config,
        min_length: e.target.value
      }
    }),
    className: "w-full h-8 px-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10px] text-[#949089] font-semibold mb-1"
  }, "Max Length"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    placeholder: "e.g. 255",
    value: newFieldData.validation_config?.max_length ?? '',
    onChange: e => setNewFieldData({
      ...newFieldData,
      validation_config: {
        ...newFieldData.validation_config,
        max_length: e.target.value
      }
    }),
    className: "w-full h-8 px-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
  })))), selectedFieldType.type === 'number' && /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-[#2A2D35] space-y-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF]"
  }, "Validation Constraints (Range)"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10px] text-[#949089] font-semibold mb-1"
  }, "Min Value"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    placeholder: "e.g. 0",
    value: newFieldData.validation_config?.min_value ?? '',
    onChange: e => setNewFieldData({
      ...newFieldData,
      validation_config: {
        ...newFieldData.validation_config,
        min_value: e.target.value
      }
    }),
    className: "w-full h-8 px-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10px] text-[#949089] font-semibold mb-1"
  }, "Max Value"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    placeholder: "e.g. 100",
    value: newFieldData.validation_config?.max_value ?? '',
    onChange: e => setNewFieldData({
      ...newFieldData,
      validation_config: {
        ...newFieldData.validation_config,
        max_value: e.target.value
      }
    }),
    className: "w-full h-8 px-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
  })))), selectedFieldType.type === 'file' && /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-[#2A2D35] space-y-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#F5F3EF]"
  }, "Validation Constraints (File Upload)"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10px] text-[#949089] font-semibold mb-1"
  }, "Allowed Extensions (comma-separated)"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: ".pdf, .png, .jpg",
    value: newFieldData.validation_config?.allowed_extensions ?? '',
    onChange: e => setNewFieldData({
      ...newFieldData,
      validation_config: {
        ...newFieldData.validation_config,
        allowed_extensions: e.target.value
      }
    }),
    className: "w-full h-8 px-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] font-mono focus:outline-none focus:border-[#E2B858]"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10px] text-[#949089] font-semibold mb-1"
  }, "Max Size (MB)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "50",
    placeholder: "5",
    value: newFieldData.validation_config?.max_size_mb ?? '',
    onChange: e => setNewFieldData({
      ...newFieldData,
      validation_config: {
        ...newFieldData.validation_config,
        max_size_mb: e.target.value
      }
    }),
    className: "w-full h-8 px-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs text-[#F5F3EF] focus:outline-none focus:border-[#E2B858]"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-3 pt-3 border-t border-[#2A2D35]"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowAddFieldModal(false),
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] font-semibold text-xs rounded-xl"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleConfirmAddField,
    disabled: addingField,
    className: "px-4 py-2 bg-gradient-to-r from-[#DFB257] to-[#E2B858] hover:brightness-110 text-[#121316] font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
  }, addingField ? 'Adding Question...' : 'Add Question')))), showClearCanvasModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-sm w-full p-6 text-left space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-base flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDDD1\uFE0F"), " Clear All Fields?"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089] leading-relaxed"
  }, "Are you sure you want to remove all questions and start from scratch?"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-3 pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowClearCanvasModal(false),
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] font-semibold text-xs rounded-xl"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: executeClearCanvas,
    disabled: clearingCanvas,
    className: "px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
  }, clearingCanvas ? 'Clearing...' : 'Clear All Fields')))), showSettingsModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-md w-full p-6 text-left space-y-4 max-h-[90vh] overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between border-b border-[#2A2D35] pb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-base flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-[#E2B858] text-[20px]"
  }, "tune"), /*#__PURE__*/React.createElement("span", null, "Form Settings & Auto-Close")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowSettingsModal(false),
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
  }, "Form ID"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    readOnly: true,
    value: form.id,
    className: "w-full h-8 px-3 bg-[#20232B] border border-[#2A2D35] rounded-lg text-xs font-mono text-[#F5F3EF]"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-[#949089] mb-1"
  }, "Form Status"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between p-2.5 bg-[#20232B] border border-[#2A2D35] rounded-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-[#F5F3EF]"
  }, "Current State:"), getStatusBadge(form.status))), /*#__PURE__*/React.createElement("div", {
    className: "pt-2 border-t border-[#2A2D35] space-y-3"
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
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSaveSettings,
    disabled: savingSettings,
    className: "px-4 py-2 bg-gradient-to-r from-[#DFB257] to-[#E2B858] hover:brightness-110 text-[#121316] font-bold text-xs rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
  }, savingSettings ? 'Saving...' : 'Save Settings'))), isArchived ? /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-[#2A2D35]"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-emerald-400 mb-1"
  }, "Restore Form"), /*#__PURE__*/React.createElement("button", {
    onClick: handleUnarchiveForm,
    disabled: unarchiving,
    className: "w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD04"), " ", unarchiving ? 'Restoring...' : 'Unarchive Form')) : /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-[#2A2D35]"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-rose-400 mb-1"
  }, "Danger Zone"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowArchiveModal(true),
    className: "w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCE6"), " Archive Form"))), /*#__PURE__*/React.createElement("div", {
    className: "pt-2 border-t border-[#2A2D35] flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowSettingsModal(false),
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] font-semibold text-xs rounded-xl"
  }, "Done")))), showArchiveModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-sm w-full p-6 text-left space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-base"
  }, "Archive this form?"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089] leading-relaxed"
  }, "Archiving will freeze this form permanently and reject any future public response submissions (returns HTTP 410 Gone). You can unarchive it anytime."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-3 pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowArchiveModal(false),
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] font-semibold text-xs rounded-xl"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: confirmArchiveForm,
    disabled: archiving,
    className: "px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
  }, archiving ? 'Archiving...' : 'Archive Form')))), showPublishModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-sm w-full p-6 text-left space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-base"
  }, "Publish this form?"), fields.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-500/10 border border-amber-500/40 text-amber-300 p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-medium"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined text-amber-400 text-sm"
  }, "warning"), /*#__PURE__*/React.createElement("span", null, "Cannot publish an empty form. Please add at least one question.")) : /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089] leading-relaxed"
  }, "Publishing will freeze the active version and make it available for public responses. Subsequent edits will branch into a new draft version."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-3 pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowPublishModal(false),
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] font-semibold text-xs rounded-xl"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: confirmPublishForm,
    disabled: publishing || fields.length === 0,
    className: "px-4 py-2 bg-gradient-to-r from-[#DFB257] to-[#E2B858] hover:brightness-110 text-[#121316] font-bold text-xs rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
  }, publishing ? 'Publishing...' : 'Publish Form')))), showPublishSuccessModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-md w-full p-6 text-left space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mx-auto shadow-sm"
  }, "\u2713"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-lg flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDE80"), " Form Published Successfully!"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089] leading-relaxed max-w-xs mx-auto"
  }, "Your form is now live and ready to accept responses.")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 pt-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] font-bold text-[#949089] uppercase tracking-wider"
  }, "Public Shareable Link"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    readOnly: true,
    value: publishedShareUrl,
    className: "flex-1 h-10 px-3.5 border border-[#2A2D35] rounded-xl text-xs font-mono bg-[#20232B] text-[#F5F3EF] focus:outline-none"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleCopyPublishLink,
    className: "px-4 py-2.5 bg-gradient-to-r from-[#DFB257] to-[#E2B858] hover:brightness-110 text-[#121316] font-bold text-xs rounded-xl transition-all shrink-0 shadow-sm flex items-center gap-1.5"
  }, copiedPublishLink ? /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-900 font-bold"
  }, "\u2713 Copied!") : /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCCB Copy Link")))), /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-[#2A2D35] flex items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("a", {
    href: publishedShareUrl,
    target: "_blank",
    rel: "noreferrer",
    className: "px-4 py-2.5 bg-[#E2B858]/10 hover:bg-[#E2B858]/20 text-[#E2B858] border border-[#E2B858]/20 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD17"), " Open Public Form"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowPublishSuccessModal(false);
      navigate('/forms');
    },
    className: "px-5 py-2.5 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] font-bold text-xs rounded-xl transition-all"
  }, "Done")))), deleteFieldId && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-sm w-full p-6 text-left space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-base"
  }, "Delete this question?"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089] leading-relaxed"
  }, "Are you sure you want to delete this question from the draft form?"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-3 pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDeleteFieldId(null),
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] font-semibold text-xs rounded-xl"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: confirmDeleteField,
    className: "px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-sm"
  }, "Delete Question")))), showVersionsModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-lg w-full p-6 text-left space-y-4 max-h-[85vh] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between border-b border-[#2A2D35] pb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-sm flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCDC"), " Version History"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowVersionsModal(false),
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
    onClick: () => handleViewVersionDetail(v.id),
    className: "px-3 py-1 text-xs font-semibold bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] rounded-lg transition-colors"
  }, "View Fields"))), viewingVersionDetail && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 p-4 border border-[#E2B858]/30 rounded-xl bg-[#E2B858]/10 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-xs text-[#E2B858]"
  }, "Fields Snapshot for Version ", viewingVersionDetail.version_number), /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewingVersionDetail(null),
    className: "text-[11px] font-bold text-[#E2B858] hover:underline"
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
    onClick: () => setShowVersionsModal(false),
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] font-semibold text-xs rounded-xl"
  }, "Close")))), showShareModal && /*#__PURE__*/React.createElement(EmbedModal, {
    isOpen: showShareModal,
    form: form,
    shareUrl: shareUrl,
    generating: generatingLink,
    onClose: () => setShowShareModal(false)
  }), showDeleteFormModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#1A1D24] rounded-2xl shadow-2xl border border-[#2A2D35] max-w-sm w-full p-6 text-left space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-[#F5F3EF] text-base"
  }, "Delete this form?"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#949089] leading-relaxed"
  }, "Are you sure you want to permanently delete this form? This cannot be undone."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-3 pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDeleteFormModal(false),
    className: "px-4 py-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#F5F3EF] border border-[#2A2D35] font-semibold text-xs rounded-xl"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: confirmDeleteForm,
    disabled: deletingForm,
    className: "px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
  }, deletingForm ? 'Deleting...' : 'Delete Form')))));
};
  if (typeof FormBuilderView !== 'undefined') window.FormBuilderView = FormBuilderView;
})();
