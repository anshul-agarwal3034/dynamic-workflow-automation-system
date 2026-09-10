const FormBuilderView = ({ id }) => {
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
    options: [
      { option_label: '', option_value: '' },
      { option_label: '', option_value: '' }
    ]
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
      const sortedVersions = data && data.versions && data.versions.length > 0
        ? [...data.versions].sort((a, b) => (b.version_number || 0) - (a.version_number || 0))
        : [];
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

  const handleSaveRule = async (e) => {
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

  const handleDeleteRule = async (ruleId) => {
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

  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/signin');
      return;
    }
    loadForm();
    loadRules();
  }, [loadForm, loadRules]);

  const sortedVersions = form && form.versions && form.versions.length > 0
    ? [...form.versions].sort((a, b) => (b.version_number || 0) - (a.version_number || 0))
    : [];
  const activeVersion = sortedVersions[0] || null;
  const isArchived = form && form.status === 'archived';

  const fieldTypesList = [
    { type: 'text', label: 'Text Input', icon: '🔤', desc: 'Short single line text question' },
    { type: 'number', label: 'Number Input', icon: '🔢', desc: 'Numeric metrics and counts' },
    { type: 'email', label: 'Email Address', icon: '✉️', desc: 'Validated email input' },
    { type: 'dropdown', label: 'Dropdown Select', icon: '🔽', desc: 'Single choice selection list' },
    { type: 'checkbox', label: 'Multiple Checkboxes', icon: '☑️', desc: 'Select multiple items' },
    { type: 'date', label: 'Date Picker', icon: '📅', desc: 'Calendar date selection' },
    { type: 'rating', label: 'Rating Scale', icon: '⭐', desc: '1 to 5 star rating scale' },
    { type: 'file', label: 'File Upload', icon: '📎', desc: 'File attachment dropzone' },
  ];

  // Refined 3 Templates (Clean and logical definitions)
  const templates = {
    customer_feedback: {
      title: 'Customer Feedback Survey',
      description: 'Collect customer satisfaction ratings and feedback',
      fields: [
        { label: 'Full Name', field_type: 'text', is_required: false, placeholder: 'e.g. John Doe' },
        { label: 'Email Address', field_type: 'email', is_required: false, placeholder: 'john@example.com' },
        { label: 'Overall Satisfaction Rating', field_type: 'rating', is_required: true },
        { label: 'Detailed Feedback / Suggestions', field_type: 'text', is_required: true, placeholder: 'Tell us what you liked or what we can improve...' }
      ]
    },
    event_registration: {
      title: 'Event Registration Form',
      description: 'Register attendees for upcoming events and conferences',
      fields: [
        { label: 'Full Name', field_type: 'text', is_required: true, placeholder: 'e.g. Sarah Connor' },
        { label: 'Email Address', field_type: 'email', is_required: true, placeholder: 'sarah@example.com' },
        { label: 'Phone Number', field_type: 'text', is_required: true, placeholder: '+91 9876543210' },
        {
          label: 'Ticket / Pass Type',
          field_type: 'dropdown',
          is_required: true,
          options: [
            { option_label: 'General Admission', option_value: 'general_admission' },
            { option_label: 'VIP Pass', option_value: 'vip_pass' },
            { option_label: 'Student Pass', option_value: 'student_pass' }
          ]
        },
        {
          label: 'Dietary Preferences',
          field_type: 'dropdown',
          is_required: false,
          options: [
            { option_label: 'No Special Diet', option_value: 'no_special_diet' },
            { option_label: 'Vegetarian', option_value: 'vegetarian' },
            { option_label: 'Vegan', option_value: 'vegan' },
            { option_label: 'Gluten-Free', option_value: 'gluten_free' }
          ]
        }
      ]
    },
    employee_onboarding: {
      title: 'Employee Onboarding Form',
      description: 'Standard onboarding questionnaire for new team members',
      fields: [
        { label: 'Full Name', field_type: 'text', is_required: true },
        { label: 'Personal Email Address', field_type: 'email', is_required: true },
        {
          label: 'Department / Domain',
          field_type: 'dropdown',
          is_required: true,
          options: [
            { option_label: 'Engineering', option_value: 'engineering' },
            { option_label: 'Design', option_value: 'design' },
            { option_label: 'Product', option_value: 'product' },
            { option_label: 'HR & Operations', option_value: 'hr_operations' }
          ]
        },
        {
          label: 'Work Mode',
          field_type: 'dropdown',
          is_required: true,
          options: [
            { option_label: 'Remote', option_value: 'remote' },
            { option_label: 'Hybrid', option_value: 'hybrid' },
            { option_label: 'On-site', option_value: 'onsite' }
          ]
        },
        { label: 'Date of Joining', field_type: 'date', is_required: true },
        { label: 'Emergency Contact Number', field_type: 'text', is_required: true }
      ]
    }
  };

  // Trigger Template Selection
  const handleSelectTemplate = (templateKey) => {
    setShowTemplateMenu(false);
    if (fields.length > 0) {
      setPendingTemplateKey(templateKey);
      setShowTemplateConfirmModal(true);
    } else {
      executeApplyTemplate(templateKey);
    }
  };

  // Execute Template Application (Clean Replace)
  const executeApplyTemplate = async (templateKey) => {
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

  const handleOpenAddFieldModal = (ft) => {
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
      options: (ft.type === 'dropdown' || ft.type === 'checkbox' || ft.type === 'radio')
        ? [{ option_label: '', option_value: '' }, { option_label: '', option_value: '' }]
        : []
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
        parsedOptions = newFieldData.options
          .filter(o => o.option_label.trim() !== '')
          .map((o, idx) => ({
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

  const handleStartEditField = (field) => {
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
      options: field.options && field.options.length > 0
        ? field.options.map(o => ({ option_label: o.option_label, option_value: o.option_value }))
        : [{ option_label: '', option_value: '' }]
    });
  };

  const handleSaveFieldEdit = async (fieldId) => {
    setActionError('');
    if (!editFieldState.label.trim()) {
      setActionError('Question label cannot be empty.');
      return;
    }
    setSavingField(true);
    try {
      const parsedOptions = (editFieldState.options && editFieldState.options.length > 0)
        ? editFieldState.options
            .filter(o => o.option_label.trim() !== '')
            .map((o, idx) => ({
              option_label: o.option_label.trim(),
              option_value: o.option_value.trim() || o.option_label.trim().toLowerCase().replace(/\s+/g, '_'),
              display_order: idx + 1
            }))
        : undefined;

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
          setPublishedShareUrl(`http://127.0.0.1:8000/app/public/index.html#/public/forms/${published.share_slug}`);
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

  const handleViewVersionDetail = async (versionId) => {
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

  if (loading) {
    return (
      <SaaSAppShell activeTab="forms">
        <div className="py-16 text-center text-xs font-semibold text-secondary">Loading FormPilotX Builder Studio...</div>
      </SaaSAppShell>
    );
  }

  if (error || !form) {
    return (
      <SaaSAppShell activeTab="forms">
        <div className="p-5 bg-error-container/40 border border-error/20 rounded-2xl text-xs text-error font-medium mb-4">
          {error || 'Form not found'}
        </div>
        <button onClick={() => navigate('/forms')} className="px-4 py-2 bg-charcoal-dark text-on-primary text-xs font-bold rounded-xl">
          ← Back to Portfolio
        </button>
      </SaaSAppShell>
    );
  }

  return (
    <SaaSAppShell activeTab="forms">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Studio Header Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ash-border pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/forms')}
              className="text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center gap-1"
            >
              ← Portfolio
            </button>
            <span className="text-ash-border">|</span>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-charcoal-dark">{form.title}</h1>
              <span className="font-mono text-[10px] text-secondary bg-silver-container px-2 py-0.5 rounded-lg border border-ash-border">
                v{activeVersion ? activeVersion.version_number : 1}
              </span>
              {getStatusBadge(form.status)}
            </div>
          </div>

          <div className="flex items-center gap-2.5 relative">
            {/* ⚡ 1-Click Templates Dropdown */}
            {!isArchived && (
              <div className="relative">
                <button
                  onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                  disabled={applyingTemplate}
                  className="px-3.5 py-1.5 bg-charcoal-dark hover:opacity-90 text-on-primary font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>{applyingTemplate ? 'Applying...' : '1-Click Templates'}</span>
                  <span>▼</span>
                </button>

                {showTemplateMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowTemplateMenu(false)} />
                    <div className="absolute right-0 top-10 w-72 bg-surface rounded-2xl shadow-2xl border border-ash-border z-50 p-2 space-y-1">
                      <div className="px-3 py-2 text-[10px] font-bold text-secondary uppercase tracking-wider border-b border-ash-border">
                        Pre-built Form Templates
                      </div>
                      
                      <button
                        onClick={() => handleSelectTemplate('customer_feedback')}
                        className="w-full text-left p-2.5 hover:bg-silver-container rounded-xl transition-colors space-y-0.5"
                      >
                        <p className="font-bold text-xs text-charcoal-dark">⭐ Customer Feedback Survey</p>
                        <p className="text-[10px] text-secondary">4 fields (Name, Email, Rating 1-5, Feedback)</p>
                      </button>

                      <button
                        onClick={() => handleSelectTemplate('event_registration')}
                        className="w-full text-left p-2.5 hover:bg-silver-container rounded-xl transition-colors space-y-0.5"
                      >
                        <p className="font-bold text-xs text-charcoal-dark">🎟️ Event Registration</p>
                        <p className="text-[10px] text-secondary">5 fields (Name, Email, Phone, Pass Type, Dietary)</p>
                      </button>

                      <button
                        onClick={() => handleSelectTemplate('employee_onboarding')}
                        className="w-full text-left p-2.5 hover:bg-silver-container rounded-xl transition-colors space-y-0.5"
                      >
                        <p className="font-bold text-xs text-charcoal-dark">🏢 Employee Onboarding</p>
                        <p className="text-[10px] text-secondary">6 fields (Name, Email, Dept, Mode, Date of Joining, Emergency)</p>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 🗑️ Clear All Fields Button */}
            {!isArchived && (
              <button
                onClick={() => setShowClearCanvasModal(true)}
                disabled={clearingCanvas || fields.length === 0}
                className="px-3.5 py-1.5 bg-silver-container hover:bg-ash-border text-charcoal-dark font-bold text-xs rounded-xl transition-all border border-ash-border shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                title="Clear all questions from canvas"
              >
                <span>🗑️</span>
                <span>{clearingCanvas ? 'Clearing...' : 'Clear All Fields'}</span>
              </button>
            )}

            {!isArchived && (
              <button
                onClick={() => setShowPublishModal(true)}
                className="px-4 py-1.5 bg-charcoal-dark hover:opacity-90 text-on-primary font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>🚀</span> Publish Form
              </button>
            )}

            {/* 3-Dot Action Menu */}
            <div className="relative">
              <button
                onClick={() => setShowThreeDotMenu(!showThreeDotMenu)}
                className="w-8 h-8 flex items-center justify-center bg-surface hover:bg-silver-container text-charcoal-dark font-black text-base rounded-xl transition-all border border-ash-border shadow-sm"
                title="Form Actions"
              >
                ⋮
              </button>

              {showThreeDotMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowThreeDotMenu(false)} />
                  <div className="absolute right-0 top-10 w-56 bg-surface rounded-2xl shadow-2xl border border-ash-border z-50 p-2 space-y-1">
                    <button
                      onClick={() => {
                        setShowThreeDotMenu(false);
                        navigate(`/forms/${form.id}/edit`);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-charcoal-dark hover:bg-silver-container rounded-xl transition-colors flex items-center gap-2"
                    >
                      <span>🎨</span> Open Form Builder
                    </button>

                    <button
                      onClick={() => {
                        setShowThreeDotMenu(false);
                        handleOpenShareModal();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-charcoal-dark hover:bg-silver-container rounded-xl transition-colors flex items-center gap-2"
                    >
                      <span>🔗</span> Share Public Link
                    </button>

                    <button
                      onClick={() => {
                        setShowThreeDotMenu(false);
                        handleOpenVersionsModal();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-charcoal-dark hover:bg-silver-container rounded-xl transition-colors flex items-center gap-2"
                    >
                      <span>📜</span> Version History
                    </button>

                    {isArchived ? (
                      <button
                        onClick={() => {
                          setShowThreeDotMenu(false);
                          handleUnarchiveForm();
                        }}
                        disabled={unarchiving}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-mint-emerald hover:bg-mint-emerald/10 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <span>🔄</span> Unarchive Form
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowThreeDotMenu(false);
                          setShowArchiveModal(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-charcoal-dark hover:bg-silver-container rounded-xl transition-colors flex items-center gap-2"
                      >
                        <span>📦</span> Archive Form
                      </button>
                    )}

                    <div className="border-t border-ash-border my-1" />

                    <button
                      onClick={() => {
                        setShowThreeDotMenu(false);
                        setShowDeleteFormModal(true);
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

        {actionError && (
          <div className="p-4 bg-error-container/40 border border-error/20 rounded-xl text-xs text-error font-medium">
            {actionError}
          </div>
        )}

        {/* Header Metadata Details Card */}
        <div className="bg-surface border border-ash-border rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Form Metadata Specification</span>
            {!isArchived && (
              <button
                onClick={() => setIsEditingHeader(!isEditingHeader)}
                className="text-xs font-bold text-electric-indigo hover:underline transition-colors"
              >
                {isEditingHeader ? 'Cancel Edit' : '✏️ Edit Title & Description'}
              </button>
            )}
          </div>

          {isEditingHeader && !isArchived ? (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-charcoal-dark mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface border border-ash-border rounded-xl text-xs font-bold text-charcoal-dark focus:outline-none focus:border-charcoal-dark"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-charcoal-dark mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full p-3.5 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark focus:outline-none focus:border-charcoal-dark resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveHeader}
                  disabled={savingHeader}
                  className="px-4 py-2 bg-charcoal-dark text-on-primary text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {savingHeader ? 'Saving Details...' : 'Save Details'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-black text-charcoal-dark">{form.title}</h2>
              <p className="text-xs text-secondary mt-1">{form.description || 'No description provided.'}</p>
            </div>
          )}
        </div>

        {/* 2-Column Builder Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Palette (w-72) */}
          {!isArchived && (
            <div className="lg:col-span-4 bg-surface border border-ash-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="border-b border-ash-border pb-3">
                <h3 className="font-bold text-sm text-charcoal-dark flex items-center gap-2">
                  <span>🛠️</span> Field Type Palette
                </h3>
                <p className="text-[11px] text-secondary mt-1">Click a field card to append it to your canvas:</p>
              </div>

              {/* Clickable Quick Field Cards */}
              <div className="grid grid-cols-1 gap-2">
                {fieldTypesList.map(ft => (
                  <button
                    key={ft.type}
                    type="button"
                    onClick={() => handleOpenAddFieldModal(ft)}
                    className="p-3 rounded-xl border border-ash-border bg-surface hover:bg-silver-container/80 text-left text-xs transition-all flex items-center justify-between group shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{ft.icon}</span>
                      <div>
                        <p className="font-bold text-charcoal-dark group-hover:text-primary">{ft.label}</p>
                        <p className="text-[10px] text-secondary">{ft.desc}</p>
                      </div>
                    </div>
                    <span className="text-xs text-secondary group-hover:text-charcoal-dark font-bold">+ Add</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Center Canvas: Interactive Question List */}
          <div className={`${isArchived ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-4`}>
            <div className="bg-surface border border-ash-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-ash-border flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveStudioTab('fields')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeStudioTab === 'fields'
                        ? 'bg-charcoal-dark text-on-primary shadow-sm'
                        : 'bg-silver-container/60 hover:bg-silver-container text-secondary'
                    }`}
                  >
                    <span>📄</span> Questions ({fields.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStudioTab('rules')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeStudioTab === 'rules'
                        ? 'bg-charcoal-dark text-on-primary shadow-sm'
                        : 'bg-silver-container/60 hover:bg-silver-container text-secondary'
                    }`}
                  >
                    <span>🔀</span> Conditional Logic ({rules.length})
                  </button>
                </div>
                <span className="text-[11px] text-secondary">
                  {activeStudioTab === 'fields'
                    ? 'Click any card to edit question details'
                    : 'Show, hide, or require questions dynamically'}
                </span>
              </div>

              {/* Tab 1: Form Questions Canvas */}
              {activeStudioTab === 'fields' && (
                <>
                  {fields.length === 0 ? (
                    <div className="p-12 text-center bg-silver-container/30 border border-dashed border-ash-border rounded-2xl space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-silver-container text-secondary flex items-center justify-center text-xl mx-auto border border-ash-border">
                        ✍️
                      </div>
                      <p className="text-xs font-bold text-charcoal-dark">Form Canvas is Empty</p>
                      <p className="text-[11px] text-secondary">Select a field type from the left palette or use ⚡ 1-Click Templates to populate questions.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fields.map((field, idx) => {
                        const isEditing = editingFieldId === field.id;

                        return (
                          <div
                            key={field.id}
                            onClick={() => {
                              if (!isEditing && !isArchived) {
                                handleStartEditField(field);
                              }
                            }}
                            className={`p-5 border rounded-2xl transition-all shadow-sm flex flex-col gap-4 cursor-pointer ${
                              isEditing
                                ? 'bg-surface border-charcoal-dark ring-2 ring-silver-container'
                                : 'bg-surface border-ash-border hover:border-charcoal-dark/40 hover:shadow-md'
                            }`}
                          >
                            {/* Question Card Top Action Bar */}
                            <div className="flex items-center justify-between gap-2 border-b border-ash-border pb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-charcoal-dark">{idx + 1}. {field.label}</span>
                                {field.is_required && (
                                  <span className="text-[10px] font-bold text-error bg-error-container/40 px-2 py-0.5 rounded border border-error/20">
                                    Required
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold text-secondary bg-silver-container px-2 py-0.5 rounded-full uppercase border border-ash-border">
                                  {field.field_type}
                                </span>
                              </div>

                              {!isArchived && (
                                <div className="flex items-center gap-2">
                                  {/* Reorder Arrows */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleMoveField(idx, 'up'); }}
                                    disabled={idx === 0}
                                    title="Move Up"
                                    className="w-6 h-6 rounded-md bg-silver-container border border-ash-border text-xs text-charcoal-dark hover:bg-ash-border disabled:opacity-30 flex items-center justify-center font-bold"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleMoveField(idx, 'down'); }}
                                    disabled={idx === fields.length - 1}
                                    title="Move Down"
                                    className="w-6 h-6 rounded-md bg-silver-container border border-ash-border text-xs text-charcoal-dark hover:bg-ash-border disabled:opacity-30 flex items-center justify-center font-bold"
                                  >
                                    ▼
                                  </button>

                                  {/* Edit Toggle */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); isEditing ? setEditingFieldId(null) : handleStartEditField(field); }}
                                    className="px-3 py-1 text-xs font-bold text-electric-indigo bg-silver-container hover:bg-ash-border rounded-lg transition-colors"
                                  >
                                    {isEditing ? 'Close' : '✏️ Edit'}
                                  </button>

                                  {/* Delete Action */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteFieldId(field.id); }}
                                    className="px-2.5 py-1 text-xs font-bold text-error hover:bg-error-container/40 rounded-lg transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* In-Place Question Editor Form */}
                            {isEditing ? (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="space-y-4 pt-1 bg-silver-container/30 p-4 rounded-xl border border-ash-border cursor-default"
                              >
                                <div>
                                  <label className="block text-xs font-bold text-charcoal-dark mb-1">
                                    Question Label <span className="text-error">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={editFieldState.label}
                                    onChange={(e) => setEditFieldState({ ...editFieldState, label: e.target.value })}
                                    className="w-full h-9 px-3 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark font-bold focus:outline-none focus:border-charcoal-dark"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-charcoal-dark mb-1">Placeholder & Help Text</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Enter response here..."
                                    value={editFieldState.placeholder}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setEditFieldState({ ...editFieldState, placeholder: e.target.value })}
                                    className="w-full h-9 px-3 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark focus:outline-none focus:border-charcoal-dark"
                                  />
                                </div>

                                <div className="flex items-center gap-2.5 pt-1">
                                  <input
                                    type="checkbox"
                                    id={`req_${field.id}`}
                                    checked={editFieldState.is_required}
                                    onChange={(e) => setEditFieldState({ ...editFieldState, is_required: e.target.checked })}
                                    className="w-4 h-4 text-charcoal-dark border-ash-border rounded"
                                  />
                                  <label htmlFor={`req_${field.id}`} className="text-xs font-bold text-charcoal-dark cursor-pointer">
                                    Required Toggle Switch
                                  </label>
                                </div>

                                {/* Dropdown & Checkbox Choices Editor */}
                                {(field.field_type === 'dropdown' || field.field_type === 'checkbox') && (
                                  <div className="pt-3 border-t border-ash-border space-y-3">
                                    <div className="flex items-center justify-between">
                                      <label className="block text-xs font-bold text-charcoal-dark">
                                        Choices Options Editor
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => setEditFieldState({
                                          ...editFieldState,
                                          options: [...editFieldState.options, { option_label: '', option_value: '' }]
                                        })}
                                        className="text-[11px] font-bold text-electric-indigo hover:underline"
                                      >
                                        + Add Choice
                                      </button>
                                    </div>

                                    {editFieldState.options.map((opt, oIdx) => (
                                      <div key={oIdx} className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          placeholder="Enter option name..."
                                          value={opt.option_label}
                                          onFocus={(e) => e.target.select()}
                                          onChange={(e) => {
                                            const updatedOpts = [...editFieldState.options];
                                            updatedOpts[oIdx].option_label = e.target.value;
                                            updatedOpts[oIdx].option_value = e.target.value.toLowerCase().replace(/\s+/g, '_');
                                            setEditFieldState({ ...editFieldState, options: updatedOpts });
                                          }}
                                          className="flex-1 h-8 px-2.5 bg-surface border border-ash-border rounded-lg text-xs text-charcoal-dark"
                                        />
                                        {editFieldState.options.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updatedOpts = editFieldState.options.filter((_, i) => i !== oIdx);
                                              setEditFieldState({ ...editFieldState, options: updatedOpts });
                                            }}
                                            className="w-7 h-7 text-error hover:bg-error-container/40 rounded flex items-center justify-center font-bold text-xs"
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Validation Constraints for Text */}
                                {field.field_type === 'text' && (
                                  <div className="pt-3 border-t border-ash-border space-y-2">
                                    <label className="block text-xs font-bold text-charcoal-dark">
                                      Validation Constraints (Length)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="block text-[10px] text-secondary font-semibold mb-1">Min Length</label>
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="e.g. 0"
                                          value={editFieldState.validation_config?.min_length ?? ''}
                                          onChange={(e) => setEditFieldState({
                                            ...editFieldState,
                                            validation_config: { ...editFieldState.validation_config, min_length: e.target.value }
                                          })}
                                          className="w-full h-8 px-2.5 bg-surface border border-ash-border rounded-lg text-xs text-charcoal-dark"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-secondary font-semibold mb-1">Max Length</label>
                                        <input
                                          type="number"
                                          min="1"
                                          placeholder="e.g. 255"
                                          value={editFieldState.validation_config?.max_length ?? ''}
                                          onChange={(e) => setEditFieldState({
                                            ...editFieldState,
                                            validation_config: { ...editFieldState.validation_config, max_length: e.target.value }
                                          })}
                                          className="w-full h-8 px-2.5 bg-surface border border-ash-border rounded-lg text-xs text-charcoal-dark"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Validation Constraints for Number */}
                                {field.field_type === 'number' && (
                                  <div className="pt-3 border-t border-ash-border space-y-2">
                                    <label className="block text-xs font-bold text-charcoal-dark">
                                      Validation Constraints (Range)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="block text-[10px] text-secondary font-semibold mb-1">Min Value</label>
                                        <input
                                          type="number"
                                          placeholder="e.g. 0"
                                          value={editFieldState.validation_config?.min_value ?? ''}
                                          onChange={(e) => setEditFieldState({
                                            ...editFieldState,
                                            validation_config: { ...editFieldState.validation_config, min_value: e.target.value }
                                          })}
                                          className="w-full h-8 px-2.5 bg-surface border border-ash-border rounded-lg text-xs text-charcoal-dark"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-secondary font-semibold mb-1">Max Value</label>
                                        <input
                                          type="number"
                                          placeholder="e.g. 100"
                                          value={editFieldState.validation_config?.max_value ?? ''}
                                          onChange={(e) => setEditFieldState({
                                            ...editFieldState,
                                            validation_config: { ...editFieldState.validation_config, max_value: e.target.value }
                                          })}
                                          className="w-full h-8 px-2.5 bg-surface border border-ash-border rounded-lg text-xs text-charcoal-dark"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Validation Constraints for File */}
                                {field.field_type === 'file' && (
                                  <div className="pt-3 border-t border-ash-border space-y-2">
                                    <label className="block text-xs font-bold text-charcoal-dark">
                                      Validation Constraints (File Upload)
                                    </label>
                                    <div className="space-y-2">
                                      <div>
                                        <label className="block text-[10px] text-secondary font-semibold mb-1">Allowed Extensions (comma-separated)</label>
                                        <input
                                          type="text"
                                          placeholder=".pdf, .png, .jpg"
                                          value={editFieldState.validation_config?.allowed_extensions ?? ''}
                                          onChange={(e) => setEditFieldState({
                                            ...editFieldState,
                                            validation_config: { ...editFieldState.validation_config, allowed_extensions: e.target.value }
                                          })}
                                          className="w-full h-8 px-2.5 bg-surface border border-ash-border rounded-lg text-xs text-charcoal-dark font-mono"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-secondary font-semibold mb-1">Max Size (MB)</label>
                                        <input
                                          type="number"
                                          min="1"
                                          max="50"
                                          placeholder="5"
                                          value={editFieldState.validation_config?.max_size_mb ?? ''}
                                          onChange={(e) => setEditFieldState({
                                            ...editFieldState,
                                            validation_config: { ...editFieldState.validation_config, max_size_mb: e.target.value }
                                          })}
                                          className="w-full h-8 px-2.5 bg-surface border border-ash-border rounded-lg text-xs text-charcoal-dark"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-ash-border">
                                  <button
                                    type="button"
                                    onClick={() => setEditingFieldId(null)}
                                    className="px-3.5 py-1.5 bg-silver-container text-primary text-xs font-semibold rounded-xl"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveFieldEdit(field.id)}
                                    disabled={savingField}
                                    className="px-4 py-1.5 bg-charcoal-dark text-on-primary text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                                  >
                                    {savingField ? 'Saving...' : 'Save Changes'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Preview-Only Canvas Inputs (pointer-events-none, disabled, readOnly) */
                              <div className="space-y-2 pointer-events-none select-none cursor-default">
                                {field.field_type === 'text' && (
                                  <input
                                    type="text"
                                    disabled
                                    readOnly
                                    placeholder={field.placeholder || 'Enter text response...'}
                                    className="w-full h-10 px-3.5 bg-silver-container/30 border border-ash-border rounded-xl text-xs text-secondary transition-all"
                                  />
                                )}

                                {field.field_type === 'email' && (
                                  <input
                                    type="email"
                                    disabled
                                    readOnly
                                    placeholder={field.placeholder || 'name@company.com'}
                                    className="w-full h-10 px-3.5 bg-silver-container/30 border border-ash-border rounded-xl text-xs text-secondary transition-all"
                                  />
                                )}

                                {field.field_type === 'number' && (
                                  <input
                                    type="number"
                                    disabled
                                    readOnly
                                    placeholder={field.placeholder || 'e.g. 10'}
                                    className="w-full h-10 px-3.5 bg-silver-container/30 border border-ash-border rounded-xl text-xs text-secondary transition-all"
                                  />
                                )}

                                {field.field_type === 'date' && (
                                  <input
                                    type="date"
                                    disabled
                                    readOnly
                                    className="w-full h-10 px-3.5 bg-silver-container/30 border border-ash-border rounded-xl text-xs text-secondary transition-all"
                                  />
                                )}

                                {/* Dropdown Preview */}
                                {field.field_type === 'dropdown' && (
                                  <select
                                    disabled
                                    className="w-full h-10 px-3.5 bg-silver-container/30 border border-ash-border rounded-xl text-xs text-secondary font-semibold transition-all"
                                  >
                                    <option value="">Select option...</option>
                                    {field.options && field.options.map(opt => (
                                      <option key={opt.id || opt.option_value} value={opt.option_value}>
                                        {opt.option_label}
                                      </option>
                                    ))}
                                  </select>
                                )}

                                {/* Checkbox List Preview */}
                                {field.field_type === 'checkbox' && (
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {field.options && field.options.map(opt => (
                                      <label
                                        key={opt.id || opt.option_value}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-silver-container/40 border border-ash-border rounded-xl text-xs font-semibold text-secondary transition-colors"
                                      >
                                        <input type="checkbox" disabled className="w-3.5 h-3.5 text-secondary rounded border-ash-border" />
                                        <span>{opt.option_label}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}

                                {field.field_type === 'rating' && (
                                  <div className="flex gap-2 pt-1">
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <button
                                        key={s}
                                        type="button"
                                        disabled
                                        className="px-3 py-1.5 bg-silver-container/40 border border-ash-border rounded-xl text-xs text-secondary font-bold transition-all"
                                      >
                                        ★ {s}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {field.field_type === 'file' && (
                                  <div className="p-4 bg-silver-container/20 border border-dashed border-ash-border rounded-xl text-xs text-secondary text-center">
                                    📎 File attachment dropzone
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Tab 2: Conditional Logic Rules Studio */}
              {activeStudioTab === 'rules' && (
                <div className="space-y-6">
                  {/* Create New Rule Form Card */}
                  {!isArchived && (
                    <div className="p-5 bg-silver-container/20 border border-ash-border rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-charcoal-dark uppercase tracking-wider flex items-center gap-1.5">
                          <span>➕</span> Add New Conditional Rule
                        </h4>
                        <span className="text-[10px] text-secondary">Dynamically branch your form flow</span>
                      </div>

                      {fields.length < 2 ? (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400">
                          ⚠️ You need at least 2 questions in your form to configure conditional rules (one trigger and one target question).
                        </div>
                      ) : (
                        <form onSubmit={handleSaveRule} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Trigger Question */}
                            <div>
                              <label className="block text-xs font-bold text-charcoal-dark mb-1">
                                If this question... <span className="text-error">*</span>
                              </label>
                              <select
                                value={newRuleData.trigger_field_id}
                                onChange={(e) => setNewRuleData({
                                  ...newRuleData,
                                  trigger_field_id: e.target.value,
                                  comparison_value: ''
                                })}
                                className="w-full h-9 px-3 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark font-medium focus:outline-none focus:border-charcoal-dark cursor-pointer"
                              >
                                <option value="">Select trigger question...</option>
                                {fields.map((f, idx) => (
                                  <option key={f.id} value={f.id}>
                                    {idx + 1}. {f.label} ({f.field_type})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Operator */}
                            <div>
                              <label className="block text-xs font-bold text-charcoal-dark mb-1">
                                Operator <span className="text-error">*</span>
                              </label>
                              <select
                                value={newRuleData.operator}
                                onChange={(e) => setNewRuleData({ ...newRuleData, operator: e.target.value })}
                                className="w-full h-9 px-3 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark font-medium focus:outline-none focus:border-charcoal-dark cursor-pointer"
                              >
                                <option value="equals">Equals (==)</option>
                                <option value="not_equals">Not Equals (!=)</option>
                                <option value="contains">Contains</option>
                                <option value="greater_than">Greater Than (&gt;)</option>
                                <option value="is_empty">Is Empty</option>
                              </select>
                            </div>

                            {/* Comparison Value */}
                            <div>
                              <label className="block text-xs font-bold text-charcoal-dark mb-1">
                                Comparison Value {newRuleData.operator !== 'is_empty' && <span className="text-error">*</span>}
                              </label>
                              {newRuleData.operator === 'is_empty' ? (
                                <div className="h-9 px-3 bg-silver-container/30 border border-ash-border rounded-xl text-xs text-secondary flex items-center italic">
                                  Not needed for "Is Empty"
                                </div>
                              ) : (() => {
                                const trigField = fields.find(f => f.id === newRuleData.trigger_field_id);
                                if (trigField && trigField.options && trigField.options.length > 0) {
                                  return (
                                    <select
                                      value={newRuleData.comparison_value}
                                      onChange={(e) => setNewRuleData({ ...newRuleData, comparison_value: e.target.value })}
                                      className="w-full h-9 px-3 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark font-medium focus:outline-none focus:border-charcoal-dark cursor-pointer"
                                    >
                                      <option value="">Select option value...</option>
                                      {trigField.options.map(opt => (
                                        <option key={opt.id || opt.option_value} value={opt.option_value}>
                                          {opt.option_label} ({opt.option_value})
                                        </option>
                                      ))}
                                    </select>
                                  );
                                }
                                return (
                                  <input
                                    type={trigField && trigField.field_type === 'number' ? 'number' : 'text'}
                                    value={newRuleData.comparison_value}
                                    onChange={(e) => setNewRuleData({ ...newRuleData, comparison_value: e.target.value })}
                                    placeholder="Enter expected value..."
                                    className="w-full h-9 px-3 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark font-medium focus:outline-none focus:border-charcoal-dark"
                                  />
                                );
                              })()}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {/* Action */}
                            <div>
                              <label className="block text-xs font-bold text-charcoal-dark mb-1">
                                Then Action <span className="text-error">*</span>
                              </label>
                              <select
                                value={newRuleData.action}
                                onChange={(e) => setNewRuleData({ ...newRuleData, action: e.target.value })}
                                className="w-full h-9 px-3 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark font-medium focus:outline-none focus:border-charcoal-dark cursor-pointer"
                              >
                                <option value="show">Show question</option>
                                <option value="hide">Hide question</option>
                                <option value="show_and_require">Show and make question required</option>
                                <option value="require">Make question required</option>
                              </select>
                            </div>

                            {/* Target Question */}
                            <div>
                              <label className="block text-xs font-bold text-charcoal-dark mb-1">
                                Target Question <span className="text-error">*</span>
                              </label>
                              <select
                                value={newRuleData.target_field_id}
                                onChange={(e) => setNewRuleData({ ...newRuleData, target_field_id: e.target.value })}
                                className="w-full h-9 px-3 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark font-medium focus:outline-none focus:border-charcoal-dark cursor-pointer"
                              >
                                <option value="">Select target question...</option>
                                {fields
                                  .filter(f => f.id !== newRuleData.trigger_field_id)
                                  .map((f, idx) => (
                                    <option key={f.id} value={f.id}>
                                      {f.label} ({f.field_type})
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>

                          {/* Rule error/success inline alerts */}
                          {rulesError && (
                            <div className="p-3 bg-error-container/40 border border-error/20 rounded-xl text-xs text-error font-medium">
                              {rulesError}
                            </div>
                          )}

                          {ruleSuccessMsg && (
                            <div className="p-3 bg-mint-emerald/10 border border-mint-emerald/30 rounded-xl text-xs text-mint-emerald font-semibold">
                              {ruleSuccessMsg}
                            </div>
                          )}

                          <div className="flex items-center justify-end pt-2">
                            <button
                              type="submit"
                              disabled={savingRule || !newRuleData.trigger_field_id || !newRuleData.target_field_id}
                              className="px-4 py-2 bg-charcoal-dark hover:opacity-90 text-on-primary font-bold text-xs rounded-xl shadow-sm disabled:opacity-40 transition-all flex items-center gap-1.5"
                            >
                              <span>➕</span> {savingRule ? 'Saving Rule...' : 'Save Conditional Rule'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Configured Rules List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-charcoal-dark uppercase tracking-wider flex items-center gap-2">
                        <span>📜</span> Configured Conditional Rules ({rules.length})
                      </h4>
                      <button
                        type="button"
                        onClick={loadRules}
                        disabled={loadingRules}
                        className="text-[11px] font-semibold text-secondary hover:text-charcoal-dark transition-colors"
                      >
                        {loadingRules ? 'Refreshing...' : '↻ Refresh Rules'}
                      </button>
                    </div>

                    {loadingRules ? (
                      <div className="p-8 text-center bg-silver-container/20 border border-ash-border rounded-xl text-xs text-secondary">
                        Loading conditional rules...
                      </div>
                    ) : rules.length === 0 ? (
                      <div className="p-8 text-center bg-silver-container/20 border border-dashed border-ash-border rounded-2xl space-y-2">
                        <div className="text-2xl">🔀</div>
                        <p className="text-xs font-bold text-charcoal-dark">No Conditional Rules Configured</p>
                        <p className="text-[11px] text-secondary max-w-sm mx-auto">
                          Create dynamic branching logic to show, hide, or require questions based on what respondents select.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {rules.map((rule) => {
                          const trig = fields.find(f => f.id === rule.trigger_field_id);
                          const targ = fields.find(f => f.id === rule.target_field_id);
                          const trigName = trig ? trig.label : (rule.trigger_field_id ? `Field (${String(rule.trigger_field_id).slice(0, 8)}...)` : 'Unknown Field');
                          const targName = targ ? targ.label : (rule.target_field_id ? `Field (${String(rule.target_field_id).slice(0, 8)}...)` : 'Unknown Field');

                          let actionBadge = (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-mint-emerald/20 text-mint-emerald border border-mint-emerald/30">
                              SHOW
                            </span>
                          );
                          if (rule.action === 'hide') {
                            actionBadge = (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-error-container/60 text-error border border-error/30">
                                HIDE
                              </span>
                            );
                          } else if (rule.action === 'require') {
                            actionBadge = (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-warm-amber/20 text-warm-amber border border-warm-amber/30">
                                REQUIRE
                              </span>
                            );
                          } else if (rule.action === 'show_and_require') {
                            actionBadge = (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-cyan-accent/20 text-cyan-accent border border-cyan-accent/30">
                                SHOW & REQUIRE
                              </span>
                            );
                          }

                          return (
                            <div
                              key={rule.id}
                              className="p-4 bg-surface border border-ash-border rounded-xl shadow-sm flex items-center justify-between gap-4 hover:border-charcoal-dark/40 transition-all"
                            >
                              <div className="flex-1 text-xs space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-secondary text-[11px] uppercase tracking-wider">IF</span>
                                  <span className="font-bold text-charcoal-dark bg-silver-container/60 px-2 py-0.5 rounded-lg border border-ash-border">
                                    {trigName}
                                  </span>
                                  <span className="text-secondary font-mono text-[11px]">{rule.operator}</span>
                                  {rule.operator !== 'is_empty' && (
                                    <span className="font-bold text-primary bg-silver-container px-2 py-0.5 rounded-lg border border-ash-border">
                                      "{rule.comparison_value}"
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 pt-1 flex-wrap">
                                  <span className="font-bold text-secondary text-[11px] uppercase tracking-wider">THEN</span>
                                  {actionBadge}
                                  <span className="font-bold text-charcoal-dark bg-silver-container/60 px-2 py-0.5 rounded-lg border border-ash-border">
                                    {targName}
                                  </span>
                                </div>
                              </div>

                              {!isArchived && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRule(rule.id)}
                                  disabled={deletingRuleId === rule.id}
                                  title="Delete Rule"
                                  className="w-8 h-8 rounded-lg bg-silver-container/60 hover:bg-error-container/60 text-secondary hover:text-error border border-ash-border flex items-center justify-center text-xs transition-colors shrink-0 disabled:opacity-40"
                                >
                                  {deletingRuleId === rule.id ? '...' : '🗑️'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Template Clean Replace Confirmation Modal */}
      {showTemplateConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-sm w-full p-6 text-left space-y-4">
            <h3 className="font-bold text-charcoal-dark text-base">Replace existing questions?</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Applying this template will clean replace the {fields.length} existing question{fields.length === 1 ? '' : 's'} on this draft canvas. Continue?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowTemplateConfirmModal(false);
                  setPendingTemplateKey(null);
                }}
                className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => executeApplyTemplate(pendingTemplateKey)}
                disabled={applyingTemplate}
                className="px-4 py-2 bg-charcoal-dark hover:opacity-90 text-on-primary font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
              >
                {applyingTemplate ? 'Applying Template...' : 'Replace & Apply Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Question Configuration Modal */}
      {showAddFieldModal && selectedFieldType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-md w-full p-6 text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-ash-border pb-3">
              <h3 className="font-bold text-charcoal-dark text-base flex items-center gap-2">
                <span>{selectedFieldType.icon}</span> Add New {selectedFieldType.label} Question
              </h3>
              <button
                onClick={() => setShowAddFieldModal(false)}
                className="text-secondary hover:text-primary font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {fieldModalError && (
              <div className="p-3 bg-error-container/40 border border-error/20 rounded-xl text-xs text-error font-medium">
                {fieldModalError}
              </div>
            )}

            <div className="space-y-4">
              {/* Question Title / Label (Required, Auto-focused) */}
              <div>
                <label className="block text-xs font-bold text-charcoal-dark mb-1">
                  Question Title / Label <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. What is your full name?"
                  value={newFieldData.label}
                  onChange={(e) => setNewFieldData({ ...newFieldData, label: e.target.value })}
                  className="w-full h-10 px-3.5 bg-surface border border-ash-border rounded-xl text-xs font-bold text-charcoal-dark focus:outline-none focus:border-charcoal-dark"
                />
              </div>

              {/* Placeholder / Help Text (Optional) */}
              {(selectedFieldType.type === 'text' || selectedFieldType.type === 'email' || selectedFieldType.type === 'number' || selectedFieldType.type === 'date' || selectedFieldType.type === 'file') && (
                <div>
                  <label className="block text-xs font-bold text-charcoal-dark mb-1">
                    Placeholder / Help Text <span className="text-secondary font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Enter response here..."
                    value={newFieldData.placeholder}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewFieldData({ ...newFieldData, placeholder: e.target.value })}
                    className="w-full h-9 px-3 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark focus:outline-none focus:border-charcoal-dark"
                  />
                </div>
              )}

              {/* Required Field Toggle */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="modal_field_required"
                  checked={newFieldData.is_required}
                  onChange={(e) => setNewFieldData({ ...newFieldData, is_required: e.target.checked })}
                  className="w-4 h-4 text-charcoal-dark border-ash-border rounded cursor-pointer"
                />
                <label htmlFor="modal_field_required" className="text-xs font-bold text-charcoal-dark cursor-pointer">
                  Required Question
                </label>
              </div>

              {/* Choice Options Manager (Dropdown, Radio, Checkbox) */}
              {(selectedFieldType.type === 'dropdown' || selectedFieldType.type === 'checkbox' || selectedFieldType.type === 'radio') && (
                <div className="pt-3 border-t border-ash-border space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-charcoal-dark">
                      Choice Options Manager
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewFieldData({
                        ...newFieldData,
                        options: [...newFieldData.options, { option_label: '', option_value: '' }]
                      })}
                      className="text-xs font-bold text-electric-indigo hover:underline"
                    >
                      + Add Option
                    </button>
                  </div>

                  {newFieldData.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter option name..."
                        value={opt.option_label}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const updatedOpts = [...newFieldData.options];
                          updatedOpts[oIdx].option_label = e.target.value;
                          updatedOpts[oIdx].option_value = e.target.value.toLowerCase().replace(/\s+/g, '_');
                          setNewFieldData({ ...newFieldData, options: updatedOpts });
                        }}
                        className="flex-1 h-9 px-3 bg-surface border border-ash-border rounded-xl text-xs text-charcoal-dark"
                      />
                      {newFieldData.options.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updatedOpts = newFieldData.options.filter((_, i) => i !== oIdx);
                            setNewFieldData({ ...newFieldData, options: updatedOpts });
                          }}
                          className="w-7 h-7 text-error hover:bg-error-container/40 rounded flex items-center justify-center font-bold text-xs"
                          title="Remove option"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Rating Limits (Rating Scale) */}
              {selectedFieldType.type === 'rating' && (
                <div className="pt-3 border-t border-ash-border space-y-2">
                  <label className="block text-xs font-bold text-charcoal-dark mb-1">
                    Max Rating Limit
                  </label>
                  <select
                    value={newFieldData.max_rating}
                    onChange={(e) => setNewFieldData({ ...newFieldData, max_rating: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-surface border border-ash-border rounded-xl text-xs font-bold text-charcoal-dark focus:outline-none focus:border-charcoal-dark cursor-pointer"
                  >
                    <option value={5}>5 Stars (1 to 5 scale)</option>
                    <option value={10}>10 Stars (1 to 10 scale)</option>
                  </select>
                </div>
              )}

              {/* Validation Constraints for Text */}
              {selectedFieldType.type === 'text' && (
                <div className="pt-3 border-t border-ash-border space-y-2">
                  <label className="block text-xs font-bold text-charcoal-dark">
                    Validation Constraints (Length)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-secondary font-semibold mb-1">Min Length</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 0"
                        value={newFieldData.validation_config?.min_length ?? ''}
                        onChange={(e) => setNewFieldData({
                          ...newFieldData,
                          validation_config: { ...newFieldData.validation_config, min_length: e.target.value }
                        })}
                        className="w-full h-8 px-2.5 bg-surface border border-ash-border rounded-lg text-xs text-charcoal-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-secondary font-semibold mb-1">Max Length</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 255"
                        value={newFieldData.validation_config?.max_length ?? ''}
                        onChange={(e) => setNewFieldData({
                          ...newFieldData,
                          validation_config: { ...newFieldData.validation_config, max_length: e.target.value }
                        })}
                        className="w-full h-8 px-2.5 bg-surface border border-ash-border rounded-lg text-xs text-charcoal-dark"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Constraints for Number */}
              {selectedFieldType.type === 'number' && (
                <div className="pt-3 border-t border-ash-border space-y-2">
                  <label className="block text-xs font-bold text-charcoal-dark">
                    Validation Constraints (Range)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-secondary font-semibold mb-1">Min Value</label>
                      <input
                        type="number"
                        placeholder="e.g. 0"
                        value={newFieldData.validation_config?.min_value ?? ''}
                        onChange={(e) => setNewFieldData({
                          ...newFieldData,
                          validation_config: { ...newFieldData.validation_config, min_value: e.target.value }
                        })}
                        className="w-full h-8 px-2.5 bg-surface border border-ash-border rounded-lg text-xs text-charcoal-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-secondary font-semibold mb-1">Max Value</label>
                      <input
                        type="number"
                        placeholder="e.g. 100"
                        value={newFieldData.validation_config?.max_value ?? ''}
                        onChange={(e) => setNewFieldData({
                          ...newFieldData,
                          validation_config: { ...newFieldData.validation_config, max_value: e.target.value }
                        })}
                        className="w-full h-8 px-2.5 bg-surface border border-ash-border rounded-lg text-xs text-charcoal-dark"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Constraints for File */}
              {selectedFieldType.type === 'file' && (
                <div className="pt-3 border-t border-ash-border space-y-2">
                  <label className="block text-xs font-bold text-charcoal-dark">
                    Validation Constraints (File Upload)
                  </label>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] text-secondary font-semibold mb-1">Allowed Extensions (comma-separated)</label>
                      <input
                        type="text"
                        placeholder=".pdf, .png, .jpg"
                        value={newFieldData.validation_config?.allowed_extensions ?? ''}
                        onChange={(e) => setNewFieldData({
                          ...newFieldData,
                          validation_config: { ...newFieldData.validation_config, allowed_extensions: e.target.value }
                        })}
                        className="w-full h-8 px-2.5 bg-surface border border-ash-border rounded-lg text-xs text-charcoal-dark font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-secondary font-semibold mb-1">Max Size (MB)</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        placeholder="5"
                        value={newFieldData.validation_config?.max_size_mb ?? ''}
                        onChange={(e) => setNewFieldData({
                          ...newFieldData,
                          validation_config: { ...newFieldData.validation_config, max_size_mb: e.target.value }
                        })}
                        className="w-full h-8 px-2.5 bg-surface border border-ash-border rounded-lg text-xs text-charcoal-dark"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dialog Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-ash-border">
              <button
                type="button"
                onClick={() => setShowAddFieldModal(false)}
                className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddField}
                disabled={addingField}
                className="px-4 py-2 bg-charcoal-dark hover:opacity-90 text-on-primary font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
              >
                {addingField ? 'Adding Question...' : 'Add Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Fields / Reset Canvas Confirmation Modal */}
      {showClearCanvasModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-sm w-full p-6 text-left space-y-4">
            <h3 className="font-bold text-charcoal-dark text-base flex items-center gap-2">
              <span>🗑️</span> Clear All Fields?
            </h3>
            <p className="text-xs text-secondary leading-relaxed">
              Are you sure you want to remove all questions and start from scratch?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearCanvasModal(false)}
                className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={executeClearCanvas}
                disabled={clearingCanvas}
                className="px-4 py-2 bg-error hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
              >
                {clearingCanvas ? 'Clearing...' : 'Clear All Fields'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-ash-border pb-3">
              <h3 className="font-bold text-charcoal-dark text-base flex items-center gap-2">
                <span>⚙️</span> Form Settings & Configurations
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-secondary hover:text-primary font-bold">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Form ID</label>
                <input type="text" readOnly value={form.id} className="w-full h-8 px-3 bg-silver-container border border-ash-border rounded-lg text-xs font-mono text-primary" />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Form Status</label>
                <div className="flex items-center justify-between p-2.5 bg-silver-container/50 border border-ash-border rounded-lg">
                  <span className="text-xs font-bold text-charcoal-dark">Current State:</span>
                  {getStatusBadge(form.status)}
                </div>
              </div>

              {isArchived ? (
                <div className="pt-3 border-t border-ash-border">
                  <label className="block text-xs font-bold text-mint-emerald mb-1">Restore Form</label>
                  <button
                    onClick={handleUnarchiveForm}
                    disabled={unarchiving}
                    className="w-full py-2 bg-mint-emerald/10 hover:bg-mint-emerald/20 text-mint-emerald border border-mint-emerald/20 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span>🔄</span> {unarchiving ? 'Restoring...' : 'Unarchive Form'}
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-ash-border">
                  <label className="block text-xs font-bold text-error mb-1">Danger Zone</label>
                  <button
                    onClick={() => setShowArchiveModal(true)}
                    className="w-full py-2 bg-error/10 hover:bg-error/20 text-error border border-error/20 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>📦</span> Archive Form
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-ash-border flex justify-end">
              <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal Confirmation */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-sm w-full p-6 text-left space-y-4">
            <h3 className="font-bold text-charcoal-dark text-base">Archive this form?</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Archiving will freeze this form permanently and reject any future public response submissions (returns HTTP 410 Gone). You can unarchive it anytime.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchiveForm}
                disabled={archiving}
                className="px-4 py-2 bg-error hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
              >
                {archiving ? 'Archiving...' : 'Archive Form'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal Confirmation */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-sm w-full p-6 text-left space-y-4">
            <h3 className="font-bold text-charcoal-dark text-base">Publish this form?</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Publishing will freeze the active version and make it available for public responses. Subsequent edits will branch into a new draft version.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmPublishForm}
                disabled={publishing}
                className="px-4 py-2 bg-charcoal-dark hover:opacity-90 text-on-primary font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
              >
                {publishing ? 'Publishing...' : 'Publish Form'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Published Successfully Modal */}
      {showPublishSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-md w-full p-6 text-left space-y-5">
            {/* Header & Green Checkmark Icon */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-mint-emerald/10 border border-mint-emerald/20 text-mint-emerald flex items-center justify-center text-2xl mx-auto shadow-sm">
                ✓
              </div>
              <h3 className="font-bold text-charcoal-dark text-lg flex items-center justify-center gap-2">
                <span>🚀</span> Form Published Successfully!
              </h3>
              <p className="text-xs text-secondary leading-relaxed max-w-xs mx-auto">
                Your form is now live and ready to accept responses.
              </p>
            </div>

            {/* Shareable Link Box */}
            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider">
                Public Shareable Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publishedShareUrl}
                  className="flex-1 h-10 px-3.5 border border-ash-border rounded-xl text-xs font-mono bg-silver-container text-primary focus:outline-none"
                />
                <button
                  onClick={handleCopyPublishLink}
                  className="px-4 py-2.5 bg-charcoal-dark hover:opacity-90 text-on-primary font-bold text-xs rounded-xl transition-all shrink-0 shadow-sm flex items-center gap-1.5"
                >
                  {copiedPublishLink ? (
                    <span className="text-mint-emerald font-bold">✓ Copied!</span>
                  ) : (
                    <span>📋 Copy Link</span>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-ash-border flex items-center justify-between gap-3">
              <a
                href={publishedShareUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-electric-indigo/10 hover:bg-electric-indigo/20 text-electric-indigo border border-electric-indigo/20 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <span>🔗</span> Open Public Form
              </a>

              <button
                onClick={() => {
                  setShowPublishSuccessModal(false);
                  navigate('/forms');
                }}
                className="px-5 py-2.5 bg-silver-container hover:bg-ash-border text-primary font-bold text-xs rounded-xl transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Field Modal */}
      {deleteFieldId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-sm w-full p-6 text-left space-y-4">
            <h3 className="font-bold text-charcoal-dark text-base">Delete this question?</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Are you sure you want to delete this question from the draft form?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteFieldId(null)}
                className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteField}
                className="px-4 py-2 bg-error hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Delete Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-lg w-full p-6 text-left space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-ash-border pb-3">
              <h3 className="font-bold text-charcoal-dark text-sm flex items-center gap-2">
                <span>📜</span> Version History
              </h3>
              <button onClick={() => setShowVersionsModal(false)} className="text-secondary hover:text-primary font-bold">✕</button>
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
                      onClick={() => handleViewVersionDetail(v.id)}
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
              <button onClick={() => setShowVersionsModal(false)} className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Form Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-ash-border pb-3">
              <h3 className="font-bold text-charcoal-dark text-sm flex items-center gap-2">
                <span>🔗</span> Share Form Link
              </h3>
              <button onClick={() => setShowShareModal(false)} className="text-secondary hover:text-primary font-bold">✕</button>
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
                  <a href={shareUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-electric-indigo hover:underline flex items-center gap-1">
                    <span>↗</span> Open Public Form
                  </a>

                  <button onClick={() => setShowShareModal(false)} className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Form Modal Confirmation */}
      {showDeleteFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border border-ash-border max-w-sm w-full p-6 text-left space-y-4">
            <h3 className="font-bold text-charcoal-dark text-base">Delete this form?</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Are you sure you want to permanently delete this form? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteFormModal(false)}
                className="px-4 py-2 bg-silver-container hover:bg-ash-border text-primary font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteForm}
                disabled={deletingForm}
                className="px-4 py-2 bg-error hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
              >
                {deletingForm ? 'Deleting...' : 'Delete Form'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SaaSAppShell>
  );
};
