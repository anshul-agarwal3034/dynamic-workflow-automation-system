const PublicFormView = ({ slug }) => {
  const [form, setForm] = React.useState(null);
  const [rules, setRules] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [isArchived, setIsArchived] = React.useState(false);
  const [formResponses, setFormResponses] = React.useState({});
  const [submitted, setSubmitted] = React.useState(false);
  const [submittedResponseId, setSubmittedResponseId] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [submitError, setSubmitError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadingFields, setUploadingFields] = React.useState({});
  const [uploadedFileInfo, setUploadedFileInfo] = React.useState({});
  const [startTime] = React.useState(Date.now());
  const [completionSeconds, setCompletionSeconds] = React.useState(0);
  const [sessionId, setSessionId] = React.useState(null);

  // UX Improvement States
  const [touched, setTouched] = React.useState({});
  const [prefilledFields, setPrefilledFields] = React.useState(new Set());

  const initSession = React.useCallback(async (slugToUse) => {
    if (!slugToUse) return;
    try {
      const res = await formsApi.startFormSession(slugToUse);
      if (res && res.session_id) {
        setSessionId(res.session_id);
      }
    } catch (e) {
      console.warn('Session start handshake skipped or failed:', e);
    }
  }, []);

  React.useEffect(() => {
    if (slug) {
      initSession(slug);
    }
  }, [slug, initSession]);

  React.useEffect(() => {
    const fetchForm = async () => {
      setLoading(true);
      setError('');
      setIsArchived(false);
      try {
        const data = await formsApi.getPublicForm(slug);
        setForm(data);
        setRules(data.rules || []);
      } catch (err) {
        if (err.message && err.message.includes('archived')) {
          setIsArchived(true);
        } else {
          setError(err.message || 'Form not found or link is invalid.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchForm();
    }
  }, [slug]);

  // Dynamic Browser Title
  React.useEffect(() => {
    if (form && form.title) {
      const originalTitle = document.title;
      document.title = `${form.title} | FormPilotX`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [form]);

  // Feature 4: Pre-fill Authenticated Respondent Data on load
  React.useEffect(() => {
    if (!form || !form.fields) return;

    let currentUser = null;
    try {
      const stored = localStorage.getItem('user_info') || localStorage.getItem('user');
      if (stored) {
        currentUser = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read stored user for prefill:', e);
    }

    if (currentUser) {
      const prefillMap = {};
      const prefillSet = new Set();

      form.fields.forEach(f => {
        const typeLower = (f.field_type || '').toLowerCase();
        const labelLower = (f.label || '').toLowerCase();

        // Only prefill if response is currently empty
        if (formResponses[f.id] !== undefined && formResponses[f.id] !== '') return;

        if ((typeLower === 'email' || labelLower.includes('email')) && currentUser.email) {
          prefillMap[f.id] = currentUser.email;
          prefillSet.add(f.id);
        } else if (
          (labelLower === 'name' || labelLower.includes('full name') || labelLower.includes('your name')) &&
          (currentUser.full_name || currentUser.name)
        ) {
          prefillMap[f.id] = currentUser.full_name || currentUser.name;
          prefillSet.add(f.id);
        }
      });

      if (Object.keys(prefillMap).length > 0) {
        setFormResponses(prev => ({ ...prefillMap, ...prev }));
        setPrefilledFields(prefillSet);
      }
    }
  }, [form]);

  // Evaluates conditional rules and calculates visibility and requirement states
  const evaluateFieldStates = React.useCallback((rulesList, responses, fieldsList) => {
    if (!fieldsList || fieldsList.length === 0) {
      return { visibleMap: {}, requiredMap: {} };
    }

    const showTargetFieldIds = new Set();
    (rulesList || []).forEach(rule => {
      if (rule.action === 'show' || rule.action === 'show_and_require') {
        showTargetFieldIds.add(rule.target_field_id);
      }
    });

    const visibleMap = {};
    const requiredMap = {};

    fieldsList.forEach(f => {
      visibleMap[f.id] = !showTargetFieldIds.has(f.id);
      requiredMap[f.id] = !!f.is_required;
    });

    const isConditionMet = (rule) => {
      const triggerVal = responses[rule.trigger_field_id];
      const compVal = rule.comparison_value;
      const op = (rule.operator || '').toLowerCase();

      switch (op) {
        case 'equals': {
          if (triggerVal === undefined || triggerVal === null) return false;
          if (compVal === undefined || compVal === null) return false;
          const numTrigger = Number(triggerVal);
          const numComp = Number(compVal);
          if (!isNaN(numTrigger) && !isNaN(numComp) && String(triggerVal).trim() !== '' && String(compVal).trim() !== '') {
            return numTrigger === numComp;
          }
          return String(triggerVal).trim().toLowerCase() === String(compVal).trim().toLowerCase();
        }
        case 'not_equals': {
          if (triggerVal === undefined || triggerVal === null || triggerVal === '') return true;
          const numTrigger = Number(triggerVal);
          const numComp = Number(compVal);
          if (!isNaN(numTrigger) && !isNaN(numComp) && String(triggerVal).trim() !== '' && String(compVal).trim() !== '') {
            return numTrigger !== numComp;
          }
          return String(triggerVal).trim().toLowerCase() !== String(compVal).trim().toLowerCase();
        }
        case 'contains': {
          if (triggerVal === undefined || triggerVal === null) return false;
          const compStr = String(compVal !== undefined && compVal !== null ? compVal : '').trim().toLowerCase();
          if (Array.isArray(triggerVal)) {
            return triggerVal.some(v => String(v).trim().toLowerCase() === compStr || String(v).toLowerCase().includes(compStr));
          }
          return String(triggerVal).toLowerCase().includes(compStr);
        }
        case 'greater_than': {
          const numTrigger = parseFloat(triggerVal);
          const numComp = parseFloat(compVal);
          if (isNaN(numTrigger) || isNaN(numComp)) return false;
          return numTrigger > numComp;
        }
        case 'is_empty': {
          if (triggerVal === undefined || triggerVal === null || triggerVal === '') return true;
          if (Array.isArray(triggerVal) && triggerVal.length === 0) return true;
          return false;
        }
        default:
          return false;
      }
    };

    (rulesList || []).forEach(rule => {
      const met = isConditionMet(rule);
      const targetId = rule.target_field_id;

      if (rule.action === 'show') {
        if (met) {
          visibleMap[targetId] = true;
        }
      } else if (rule.action === 'hide') {
        if (met) {
          visibleMap[targetId] = false;
        }
      } else if (rule.action === 'require') {
        if (met) {
          requiredMap[targetId] = true;
        }
      } else if (rule.action === 'show_and_require') {
        if (met) {
          visibleMap[targetId] = true;
          requiredMap[targetId] = true;
        }
      }
    });

    return { visibleMap, requiredMap };
  }, []);

  const fieldStates = React.useMemo(() => {
    if (!form || !form.fields) return { visibleMap: {}, requiredMap: {} };
    return evaluateFieldStates(rules, formResponses, form.fields);
  }, [rules, formResponses, form, evaluateFieldStates]);

  // Clear values of fields that become hidden
  React.useEffect(() => {
    if (!form || !form.fields) return;
    let hasCleared = false;
    const nextResponses = { ...formResponses };

    Object.keys(nextResponses).forEach(fieldId => {
      if (fieldStates.visibleMap[fieldId] === false && nextResponses[fieldId] !== undefined && nextResponses[fieldId] !== '') {
        delete nextResponses[fieldId];
        hasCleared = true;
      }
    });

    if (hasCleared) {
      setFormResponses(nextResponses);
    }
  }, [fieldStates.visibleMap, form]);

  const clearFieldError = (fieldId) => {
    if (fieldErrors[fieldId]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  // Feature 6: Forgiving formatting (Phone & Numbers) in onChange
  const handleInputChange = (fieldId, value, fieldType = 'text', fieldLabel = '') => {
    clearFieldError(fieldId);

    // Remove from prefilled tracking if respondent modified it
    if (prefilledFields.has(fieldId)) {
      setPrefilledFields(prev => {
        const next = new Set(prev);
        next.delete(fieldId);
        return next;
      });
    }

    let formattedValue = value;
    const typeLower = (fieldType || '').toLowerCase();
    const labelLower = (fieldLabel || '').toLowerCase();

    // Phone formatting: allow +, brackets, dashes, spaces smoothly
    if (typeLower === 'phone' || typeLower === 'tel' || labelLower.includes('phone')) {
      const allowed = value.replace(/[^\d\s\+\-\(\)]/g, '');
      const rawDigits = allowed.replace(/\D/g, '');
      if (!allowed.startsWith('+') && rawDigits.length <= 10 && rawDigits.length > 3) {
        if (rawDigits.length <= 6) {
          formattedValue = `(${rawDigits.slice(0, 3)}) ${rawDigits.slice(3)}`;
        } else {
          formattedValue = `(${rawDigits.slice(0, 3)}) ${rawDigits.slice(3, 6)}-${rawDigits.slice(6)}`;
        }
      } else {
        formattedValue = allowed;
      }
    }
    // Number formatting: allow negative, decimal point, commas
    else if (typeLower === 'number') {
      formattedValue = value.replace(/[^\d.,\-]/g, '');
    }

    setFormResponses(prev => ({
      ...prev,
      [fieldId]: formattedValue
    }));
  };

  const handleCheckboxToggle = (fieldId, optionValue) => {
    clearFieldError(fieldId);
    setFormResponses(prev => {
      const current = prev[fieldId] || [];
      const updated = current.includes(optionValue)
        ? current.filter(v => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [fieldId]: updated };
    });
  };

  const handleFileUpload = async (fieldId, event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    clearFieldError(fieldId);
    setUploadingFields(prev => ({ ...prev, [fieldId]: true }));

    try {
      const res = await formsApi.uploadFile(file);
      setFormResponses(prev => ({
        ...prev,
        [fieldId]: res.id
      }));
      setUploadedFileInfo(prev => ({
        ...prev,
        [fieldId]: {
          id: res.id,
          name: res.original_name,
          size: res.file_size,
          url: res.download_url
        }
      }));
    } catch (err) {
      console.error('File upload failed:', err);
      setFieldErrors(prev => ({
        ...prev,
        [fieldId]: err.message || 'File upload failed. Allowed types: PDF, DOC, DOCX, JPG, PNG (Max 5MB).'
      }));
    } finally {
      setUploadingFields(prev => ({ ...prev, [fieldId]: false }));
      event.target.value = '';
    }
  };

  const handleRemoveFile = (fieldId) => {
    setFormResponses(prev => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
    setUploadedFileInfo(prev => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  // Feature 2: Inline validation on blur and live error calculation
  const getFieldError = (field) => {
    if (!field) return null;
    const fid = String(field.id);
    const flabel = field.label;
    const norm = flabel ? flabel.toLowerCase().replace(/[^a-z0-9_]+/g, '_') : '';

    // Check if server/submission error explicitly flagged this field
    const serverOrSubmitErr = fieldErrors[fid] || (flabel && fieldErrors[flabel]) || (norm && fieldErrors[norm]) || null;
    if (serverOrSubmitErr) return serverOrSubmitErr;

    // Feature 2: If touched, evaluate format constraints immediately
    if (!touched[fid]) return null;

    const val = formResponses[fid];
    const isVisible = fieldStates.visibleMap[fid] !== false;
    const isRequired = !!fieldStates.requiredMap[fid];

    if (!isVisible) return null;

    const isEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
    if (isRequired && isEmpty) {
      return `${field.label} is required.`;
    }

    if (!isEmpty) {
      const typeLower = (field.field_type || '').toLowerCase();
      const labelLower = (field.label || '').toLowerCase();

      // Email validation with regex ^[^\s@]+@[^\s@]+\.[^\s@]+$
      if (typeLower === 'email' || labelLower.includes('email')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(val).trim())) {
          return 'Please enter a valid email address (e.g., name@domain.com)';
        }
      }

      // Phone validation
      if (typeLower === 'phone' || typeLower === 'tel' || labelLower.includes('phone')) {
        const digits = String(val).replace(/\D/g, '');
        if (digits.length < 7 || digits.length > 15) {
          return 'Please enter a valid phone number (e.g., +1 (555) 019-2834)';
        }
      }

      // Number validation
      if (typeLower === 'number') {
        const cleaned = String(val).replace(/,/g, '').trim();
        if (isNaN(Number(cleaned))) {
          return `${field.label} must be a valid number.`;
        }
      }

      // Character limit validation
      const maxLen = field.validation_config?.max_length || field.validation_config?.max_chars || field.max_length;
      if (maxLen && String(val).length > maxLen) {
        return `${field.label} cannot exceed ${maxLen} characters.`;
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setFieldErrors({});

    // Client-side quick validation for required fields
    const localErrors = {};
    for (const field of (form && form.fields ? form.fields : [])) {
      const isVisible = fieldStates.visibleMap[field.id] !== false;
      const isRequired = !!fieldStates.requiredMap[field.id];
      if (isVisible && isRequired) {
        const val = formResponses[field.id];
        const isEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
        if (isEmpty) {
          localErrors[field.id] = `${field.label} is required.`;
        }
      }
    }

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setSubmitError('Please fill in all required fields.');
      return;
    }

    // Feature 6: Sanitize phone and number fields before submitting payload
    const sanitizedResponses = { ...formResponses };
    (form.fields || []).forEach(f => {
      const fid = f.id;
      const val = sanitizedResponses[fid];
      if (val !== undefined && val !== null) {
        const typeLower = (f.field_type || '').toLowerCase();
        const labelLower = (f.label || '').toLowerCase();

        // Sanitize phone: keep clean digits with optional leading +
        if (typeLower === 'phone' || typeLower === 'tel' || labelLower.includes('phone')) {
          if (typeof val === 'string') {
            const hasPlus = val.trim().startsWith('+');
            const cleanDigits = val.replace(/\D/g, '');
            sanitizedResponses[fid] = hasPlus ? `+${cleanDigits}` : cleanDigits;
          }
        }
        // Sanitize number: strip formatting commas so float(val) in backend parses correctly
        else if (typeLower === 'number') {
          if (typeof val === 'string') {
            const cleanNum = val.replace(/,/g, '').trim();
            if (cleanNum !== '' && !isNaN(Number(cleanNum))) {
              sanitizedResponses[fid] = Number(cleanNum);
            }
          }
        }
      }
    });

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    setIsSubmitting(true);

    try {
      const payload = {
        responses: sanitizedResponses,
        completion_time_seconds: elapsedSeconds,
        session_id: sessionId
      };
      const res = await formsApi.submitForm(slug, payload);

      setCompletionSeconds(elapsedSeconds);
      setSubmittedResponseId(res.response_id || '');
      setSubmitted(true);
    } catch (err) {
      console.error('Submission error:', err);
      const serverErrors = (err.detail && err.detail.errors) || (err.data && err.data.detail && err.data.detail.errors);
      if (serverErrors && typeof serverErrors === 'object') {
        const mappedErrors = {};
        Object.keys(serverErrors).forEach(key => {
          const errVal = serverErrors[key];
          const matchedField = form.fields.find(f => 
            String(f.id) === String(key) || 
            f.label === key || 
            (f.label && f.label.toLowerCase().replace(/[^a-z0-9_]+/g, '_') === key)
          );
          if (matchedField) {
            mappedErrors[matchedField.id] = errVal;
          } else {
            mappedErrors[key] = errVal;
          }
        });
        setFieldErrors(mappedErrors);
        setSubmitError('Please resolve the errors highlighted below.');
      } else {
        setSubmitError(err.message || 'Failed to submit response. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCompletionTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Progress metrics & Derived Calculations (BEFORE ANY CONDITIONAL RETURNS)
  const visibleFields = (form && form.fields ? form.fields : []).filter(field => fieldStates.visibleMap[field.id] !== false);
  const totalVisible = visibleFields.length;
  const answeredCount = visibleFields.filter(f => {
    const val = formResponses[f.id];
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }).length;
  const progressPercent = totalVisible > 0 ? Math.round((answeredCount / totalVisible) * 100) : 0;
  const progressPercentage = progressPercent;

  // Feature 1: Smart Disabled Submit Button with Explanatory Missing Fields
  const missingRequiredFields = React.useMemo(() => {
    if (!form || !form.fields) return [];
    return form.fields
      .filter(f => fieldStates.visibleMap[f.id] !== false && !!fieldStates.requiredMap[f.id])
      .filter(f => {
        const val = formResponses[f.id];
        if (val === undefined || val === null || val === '') return true;
        if (Array.isArray(val) && val.length === 0) return true;
        return false;
      })
      .map(f => f.label);
  }, [form, fieldStates, formResponses]);

  // Check if any visible field has inline errors
  const hasFormattingErrors = React.useMemo(() => {
    if (!form || !form.fields) return false;
    return form.fields.some(f => {
      if (fieldStates.visibleMap[f.id] === false) return false;
      return !!getFieldError(f);
    });
  }, [form, fieldStates, formResponses, touched, fieldErrors]);

  const isSubmitDisabled = isSubmitting || missingRequiredFields.length > 0 || hasFormattingErrors;

  const downloadReceipt = () => {
    try {
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) {
        // Fallback: standard print/download if CDN not ready
        window.print();
        return;
      }

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4"
      });

      const refCode = submittedResponseId || `RESP-${Date.now().toString(36).toUpperCase()}`;
      const formTitle = form?.title || "Form Submission";
      const dateStr = new Date().toUTCString();

      // 1. Header Banner
      doc.setFillColor(18, 19, 22); // Obsidian backdrop (#121316)
      doc.rect(0, 0, 595.28, 80, "F");

      // Title & Logo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(226, 184, 88); // Champagne Gold (#E2B858)
      doc.text("FORMPILOTX", 40, 48);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(142, 146, 156);
      doc.text("Official Submission Verification Receipt", 40, 65);

      // 2. Receipt Meta Box
      doc.setFillColor(26, 29, 36); // Surface card (#1A1D24)
      doc.roundedRect(40, 100, 515.28, 70, 4, 4, "F");

      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(`Form: ${formTitle}`, 55, 122);

      doc.setFontSize(9);
      doc.setTextColor(142, 146, 156);
      doc.text(`Reference ID: ${refCode}`, 55, 140);
      doc.text(`Submitted At (UTC): ${dateStr}`, 55, 155);

      // 3. Question & Answers Section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(226, 184, 88);
      doc.text("Submission Summary", 40, 200);

      doc.setDrawColor(42, 45, 53);
      doc.setLineWidth(1);
      doc.line(40, 208, 555.28, 208);

      let currentY = 230;
      doc.setFontSize(10);

      // Iterate through submitted fields
      const answers = formResponses || {};
      const fieldsList = (form?.fields || []).map((f) => {
        const val = answers[f.id] ?? answers[f.field_key] ?? answers[f.label] ?? "N/A";
        return {
          label: f.label || "Question",
          value: typeof val === "object" ? JSON.stringify(val) : String(val)
        };
      });

      fieldsList.forEach((item, index) => {
        // Check page break
        if (currentY > 750) {
          doc.addPage();
          currentY = 50;
        }

        doc.setFont("helvetica", "bold");
        doc.setTextColor(240, 240, 240);
        doc.text(`${index + 1}. ${item.label}`, 45, currentY);
        currentY += 15;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(180, 184, 192);
        const splitValue = doc.splitTextToSize(item.value || "None provided", 490);
        doc.text(splitValue, 55, currentY);
        currentY += splitValue.length * 13 + 12;
      });

      // 4. Footer & Verification Notice
      const footerY = Math.max(currentY + 20, 780);
      doc.setFontSize(8);
      doc.setTextColor(120, 125, 135);
      doc.text(
        "This document serves as an immutable confirmation of receipt recorded by FormPilotX.",
        40,
        footerY
      );
      doc.text(`Tracking Signature: ${refCode} • Verified SSL Submission`, 40, footerY + 12);

      // Save PDF
      doc.save(`Receipt-${refCode}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF receipt:", err);
      window.print();
    }
  };

  const handleDownloadReceipt = downloadReceipt;

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#121316] text-[#F5F3EF] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-xl mx-auto bg-[#1A1D24] border border-[#2A2D35] shadow-2xl shadow-black/80 rounded-2xl p-12 text-center">
          <div className="w-10 h-10 border-2 border-[#E2B858]/30 border-t-[#E2B858] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-medium text-[#949089]">Loading form...</p>
        </div>
      </div>
    );
  }

  if (isArchived) {
    return (
      <div className="min-h-screen w-full bg-[#121316] text-[#F5F3EF] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-xl mx-auto bg-[#1A1D24] border border-[#2A2D35] shadow-2xl shadow-black/80 rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#16181D] text-[#E2B858] flex items-center justify-center text-2xl mx-auto border border-[#2A2D35]">
            🔒
          </div>
          <h2 className="text-xl font-bold text-[#F5F3EF]">Form No Longer Available</h2>
          <p className="text-xs text-[#949089] leading-relaxed max-w-md mx-auto">
            This form has been archived by its creator and is no longer accepting public submissions.
          </p>
        </div>
      </div>
    );
  }

  if (form && form.is_closed) {
    return (
      <div className="min-h-screen w-full bg-[#121316] text-[#F5F3EF] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-xl mx-auto bg-[#1A1D24] border border-[#2A2D35] shadow-2xl shadow-black/80 rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E2B858]/10 text-[#E2B858] flex items-center justify-center mx-auto border border-[#E2B858]/30">
            <span className="material-symbols-outlined text-2xl">event_busy</span>
          </div>
          <h2 className="text-xl font-bold text-[#F5F3EF]">Submissions Closed</h2>
          <p className="text-xs text-[#949089] leading-relaxed max-w-md mx-auto">
            {form.closed_message || 'This form is no longer accepting new submissions.'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen w-full bg-[#121316] text-[#F5F3EF] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-xl mx-auto bg-[#1A1D24] border border-[#2A2D35] shadow-2xl shadow-black/80 rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E05D44]/15 text-[#E05D44] flex items-center justify-center text-2xl mx-auto border border-[#E05D44]/35">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-[#F5F3EF]">Form Link Invalid</h2>
          <p className="text-xs text-[#949089] leading-relaxed max-w-md mx-auto">
            {error || 'The link you opened is invalid or the form is not currently published.'}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen w-full bg-[#121316] text-[#F5F3EF] flex flex-col justify-center items-center p-3 sm:p-4">
        <div className="w-full max-w-xl mx-auto bg-[#1A1D24] border border-[#2A2D35] shadow-2xl rounded-xl sm:rounded-2xl p-4 sm:p-8 text-center space-y-4 sm:space-y-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#E2B858]/15 text-[#E2B858] flex items-center justify-center text-2xl sm:text-3xl mx-auto border border-[#E2B858]/30 shadow-[0_0_20px_rgba(226,184,88,0.2)]">
            ✓
          </div>
          <div className="space-y-2 sm:space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-[#F5F3EF]">Response Submitted!</h2>
            <p className="text-xs text-[#949089]">
              Thank you for completing <span className="font-semibold text-[#F5F3EF]">{form.title}</span>. Your response has been recorded.
            </p>
            {submittedResponseId && (
              <div className="p-3 bg-[#16181D] border border-[#2A2D35] rounded-xl max-w-xs mx-auto mt-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                <div className="text-[10px] uppercase tracking-wider font-mono text-[#949089]">Submission Reference ID</div>
                <div className="text-xs sm:text-sm font-mono font-bold text-[#E2B858] select-all mt-1">{submittedResponseId}</div>
              </div>
            )}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#16181D] rounded-full border border-[#2A2D35] text-[11px] font-mono text-[#949089] mt-2">
              <span>⏱️ Completion time:</span>
              <span className="font-semibold text-[#F5F3EF]">{formatCompletionTime(completionSeconds)} ({completionSeconds}s)</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 pt-2">
            <button
              onClick={handleDownloadReceipt}
              className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm inline-flex items-center justify-center gap-2 bg-[#20232B] hover:bg-[#2A2D35] text-[#E2B858] font-bold rounded-xl border border-[#2A2D35] shadow-sm transition-all cursor-pointer hover:border-[#E2B858]/40"
            >
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              <span>Download PDF Receipt</span>
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setFormResponses({});
                setFieldErrors({});
                setSubmitError('');
                setSubmittedResponseId('');
                setUploadedFileInfo({});
                setSessionId(null);
                initSession(slug);
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#C59B27] to-[#E2B858] text-[#2A1D00] font-semibold text-xs rounded-xl border border-[#FFE49E] shadow-[0_0_20px_rgba(226,184,88,0.35)] hover:brightness-110 transition-all cursor-pointer"
            >
              Submit Another Response
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#121316] text-[#F5F3EF] flex flex-col antialiased">
      {/* Full-Width Sticky Top Progress Line */}
      <div className="fixed top-0 left-0 right-0 w-full h-1.5 bg-[#1F2228] z-50 overflow-hidden">
        <div 
          className="h-full bg-[#E2B858] transition-all duration-300 ease-out shadow-[0_0_8px_rgba(226,184,88,0.5)]"
          style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
        />
      </div>

      {/* Top Banner / Header Strip */}
      <div className="w-full bg-[#0D0E11] border-b border-[#2A2D35] text-[#949089] py-2.5 px-4 sm:px-8 flex items-center justify-between text-xs z-30 pt-3">
        <div className="flex items-center gap-2.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-[#E2B858] inline-block shadow-[0_0_8px_rgba(226,184,88,0.6)]"></span>
          <span className="font-bold tracking-wider uppercase text-[11px] text-[#F5F3EF]">FormPilot<span className="text-[#DFB257]">X</span></span>
          <span className="text-[#949089]/40">•</span>
          <span className="text-[#949089] text-[11px] hidden sm:inline">Public Form Portal</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="px-2 py-0.5 rounded border border-[#2A2D35] bg-[#16181D] font-mono text-[#E2B858]">
            v{form.version_number}
          </span>
          <span className="font-mono text-[#949089]">
            {answeredCount}/{totalVisible} answered ({progressPercent}%)
          </span>
        </div>
      </div>

      {/* Form Content Container */}
      <div className="min-h-screen py-4 px-3 sm:py-10 sm:px-4 flex justify-center items-start w-full">
        <div className="w-full max-w-2xl bg-[#1A1D24] border border-[#2A2D35] rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-xl space-y-6 sm:space-y-8">
          {/* Form Header */}
          <div className="border-b border-[#2A2D35] pb-4 sm:pb-6 space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E2B858] bg-[#E2B858]/10 px-2.5 py-1 rounded-md border border-[#E2B858]/20">
                Official Questionnaire
              </span>
              <span className="text-[11px] font-mono text-[#949089]">
                {totalVisible} {totalVisible === 1 ? 'Question' : 'Questions'}
              </span>
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-white mb-1 sm:mb-2">{form.title}</h1>
            {form.description && (
              <p className="text-xs sm:text-sm text-[#8E929C] mb-4 sm:mb-6">{form.description}</p>
            )}
          </div>

          {/* Form Questions List */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {submitError && (
              <div className="text-[#FFDAD6] bg-[#E05D44]/20 border border-[#E05D44]/40 px-3.5 py-2.5 rounded-xl flex items-center gap-2.5 text-xs">
                <span className="text-base">⚠️</span>
                <span>{submitError}</span>
              </div>
            )}

            {(() => {
              if (visibleFields.length === 0) {
                return (
                  <div className="py-12 text-center text-xs text-[#949089]">
                    {form.fields.length === 0 ? 'This published form does not contain any fields.' : 'No active questions to display based on conditional logic.'}
                  </div>
                );
              }
              return visibleFields.map((field, index) => {
                const isRequired = !!fieldStates.requiredMap[field.id];
                const err = getFieldError(field);
                const hasErr = !!err;

                // Character counter setup (Feature 3)
                const maxLen = field.validation_config?.max_length || field.validation_config?.max_chars || field.max_length || (field.field_type === 'textarea' ? (field.validation_config?.max_len || 500) : null);
                const currentLength = (formResponses[field.id] || '').length;
                const isNearLimit = maxLen && currentLength >= maxLen * 0.9 && currentLength < maxLen;
                const isAtOrOverLimit = maxLen && currentLength >= maxLen;
                const counterColor = isAtOrOverLimit ? 'text-[#E05D44]' : isNearLimit ? 'text-[#E6A23C]' : 'text-[#949089]/60';

                // Security checklist setup (Feature 5)
                const isPasswordField = field.field_type === 'password' || (field.label && (field.label.toLowerCase().includes('password') || field.label.toLowerCase().includes('access code')));

                return (
                  <div
                    key={field.id}
                    className={`bg-[#16181D]/60 border ${hasErr ? 'border-[#E05D44] bg-[#1A1516] shadow-[0_0_12px_rgba(224,93,68,0.25)]' : 'border-[#2A2D35]'} rounded-xl p-5 sm:p-6 space-y-3 transition-all`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="block text-[#949089] font-medium text-xs tracking-wider uppercase">
                          {index + 1}. {field.label}
                          {isRequired && <span className="text-[#E2B858] ml-1 font-bold">*</span>}
                        </label>
                        {/* Feature 4: Pre-filled Tag */}
                        {prefilledFields.has(field.id) && (
                          <span className="text-[10px] font-normal text-[#E2B858] bg-[#E2B858]/10 border border-[#E2B858]/20 px-2 py-0.5 rounded-full lowercase tracking-normal">
                            Pre-filled from your account
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-[#949089] uppercase bg-[#16181D] px-2 py-0.5 rounded border border-[#2A2D35] shrink-0">
                        {field.field_type}
                      </span>
                    </div>

                    {/* Text Input */}
                    {field.field_type === 'text' && (
                      <div>
                        <input
                          type="text"
                          required={isRequired}
                          maxLength={maxLen || undefined}
                          placeholder={field.placeholder || 'Enter your response...'}
                          value={formResponses[field.id] || ''}
                          onBlur={() => setTouched(prev => ({ ...prev, [field.id]: true }))}
                          onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type, field.label)}
                          className={`w-full h-10 sm:h-12 px-3 sm:px-4 text-xs sm:text-sm bg-[#121316] text-[#F5F3EF] placeholder-[#949089]/60 rounded-lg transition-colors ${
                            hasErr
                              ? 'border border-[#E05D44] bg-[#1A1516] shadow-[0_0_12px_rgba(224,93,68,0.25)] focus:outline-none'
                              : 'border border-[#2A2D35] focus:outline-none focus:border-[#E2B858] focus:ring-1 focus:ring-[#E2B858]/50'
                          }`}
                        />
                        {/* Feature 3: Live Character Counter */}
                        {maxLen && (
                          <div className="flex justify-end pt-1">
                            <span className={`text-[10px] font-mono transition-colors ${counterColor}`}>
                              {currentLength} / {maxLen} characters
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Textarea Input */}
                    {field.field_type === 'textarea' && (
                      <div>
                        <textarea
                          rows={4}
                          required={isRequired}
                          maxLength={maxLen || undefined}
                          placeholder={field.placeholder || 'Enter your response...'}
                          value={formResponses[field.id] || ''}
                          onBlur={() => setTouched(prev => ({ ...prev, [field.id]: true }))}
                          onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type, field.label)}
                          className={`w-full p-3 sm:p-4 text-xs sm:text-sm bg-[#121316] text-[#F5F3EF] placeholder-[#949089]/60 rounded-lg transition-colors resize-y ${
                            hasErr
                              ? 'border border-[#E05D44] bg-[#1A1516] shadow-[0_0_12px_rgba(224,93,68,0.25)] focus:outline-none'
                              : 'border border-[#2A2D35] focus:outline-none focus:border-[#E2B858] focus:ring-1 focus:ring-[#E2B858]/50'
                          }`}
                        />
                        {/* Feature 3: Live Character Counter */}
                        {maxLen && (
                          <div className="flex justify-end pt-1">
                            <span className={`text-[10px] font-mono transition-colors ${counterColor}`}>
                              {currentLength} / {maxLen} characters
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Email Input */}
                    {field.field_type === 'email' && (
                      <div>
                        <input
                          type="email"
                          required={isRequired}
                          placeholder={field.placeholder || 'name@example.com'}
                          value={formResponses[field.id] || ''}
                          onBlur={() => setTouched(prev => ({ ...prev, [field.id]: true }))}
                          onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type, field.label)}
                          className={`w-full h-10 sm:h-12 px-3 sm:px-4 text-xs sm:text-sm bg-[#121316] text-[#F5F3EF] placeholder-[#949089]/60 rounded-lg transition-colors ${
                            hasErr
                              ? 'border border-[#E05D44] bg-[#1A1516] shadow-[0_0_12px_rgba(224,93,68,0.25)] focus:outline-none'
                              : 'border border-[#2A2D35] focus:outline-none focus:border-[#E2B858] focus:ring-1 focus:ring-[#E2B858]/50'
                          }`}
                        />
                      </div>
                    )}

                    {/* Phone / Tel Input */}
                    {(field.field_type === 'phone' || field.field_type === 'tel') && (
                      <div>
                        <input
                          type="tel"
                          required={isRequired}
                          placeholder={field.placeholder || '+1 (555) 019-2834'}
                          value={formResponses[field.id] || ''}
                          onBlur={() => setTouched(prev => ({ ...prev, [field.id]: true }))}
                          onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type, field.label)}
                          className={`w-full h-10 sm:h-12 px-3 sm:px-4 text-xs sm:text-sm bg-[#121316] text-[#F5F3EF] placeholder-[#949089]/60 rounded-lg transition-colors ${
                            hasErr
                              ? 'border border-[#E05D44] bg-[#1A1516] shadow-[0_0_12px_rgba(224,93,68,0.25)] focus:outline-none'
                              : 'border border-[#2A2D35] focus:outline-none focus:border-[#E2B858] focus:ring-1 focus:ring-[#E2B858]/50'
                          }`}
                        />
                      </div>
                    )}

                    {/* Password Input & Security Checklist (Feature 5) */}
                    {field.field_type === 'password' && (
                      <div>
                        <input
                          type="password"
                          required={isRequired}
                          placeholder={field.placeholder || 'Enter secure password or access code...'}
                          value={formResponses[field.id] || ''}
                          onBlur={() => setTouched(prev => ({ ...prev, [field.id]: true }))}
                          onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type, field.label)}
                          className={`w-full h-10 sm:h-12 px-3 sm:px-4 text-xs sm:text-sm bg-[#121316] text-[#F5F3EF] placeholder-[#949089]/60 rounded-lg transition-colors ${
                            hasErr
                              ? 'border border-[#E05D44] bg-[#1A1516] shadow-[0_0_12px_rgba(224,93,68,0.25)] focus:outline-none'
                              : 'border border-[#2A2D35] focus:outline-none focus:border-[#E2B858] focus:ring-1 focus:ring-[#E2B858]/50'
                          }`}
                        />
                      </div>
                    )}

                    {/* Feature 5: Security Micro-Checklist for Password / Access Code */}
                    {isPasswordField && (
                      <div className="mt-2.5 p-3 bg-[#16181D] border border-[#2A2D35] rounded-xl space-y-1.5 text-xs">
                        <div className="text-[11px] font-semibold text-[#949089] uppercase tracking-wider mb-1">
                          Security Requirements:
                        </div>
                        {[
                          { label: 'At least 8 characters', met: (formResponses[field.id] || '').length >= 8 },
                          { label: 'One uppercase letter', met: /[A-Z]/.test(formResponses[field.id] || '') },
                          { label: 'One number or special character', met: /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formResponses[field.id] || '') }
                        ].map((req, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 text-xs transition-colors ${
                              req.met ? 'text-[#52B788] font-medium' : 'text-[#949089]'
                            }`}
                          >
                            <span className="font-mono font-bold text-sm">
                              {req.met ? '✓' : '○'}
                            </span>
                            <span>{req.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Number Input */}
                    {field.field_type === 'number' && (
                      <div>
                        <input
                          type="text"
                          inputMode="numeric"
                          required={isRequired}
                          placeholder={field.placeholder || 'Enter numeric value...'}
                          value={formResponses[field.id] || ''}
                          onBlur={() => setTouched(prev => ({ ...prev, [field.id]: true }))}
                          onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type, field.label)}
                          className={`w-full h-10 sm:h-12 px-3 sm:px-4 text-xs sm:text-sm bg-[#121316] text-[#F5F3EF] placeholder-[#949089]/60 rounded-lg transition-colors ${
                            hasErr
                              ? 'border border-[#E05D44] bg-[#1A1516] shadow-[0_0_12px_rgba(224,93,68,0.25)] focus:outline-none'
                              : 'border border-[#2A2D35] focus:outline-none focus:border-[#E2B858] focus:ring-1 focus:ring-[#E2B858]/50'
                          }`}
                        />
                      </div>
                    )}

                    {/* Date Input */}
                    {field.field_type === 'date' && (
                      <input
                        type="date"
                        required={isRequired}
                        style={{ colorScheme: 'dark' }}
                        value={formResponses[field.id] || ''}
                        onBlur={() => setTouched(prev => ({ ...prev, [field.id]: true }))}
                        onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type, field.label)}
                        className={`w-full h-10 sm:h-12 px-3 sm:px-4 text-xs sm:text-sm bg-[#121316] text-[#F5F3EF] placeholder-[#949089]/60 rounded-lg transition-colors ${
                          hasErr
                            ? 'border border-[#E05D44] bg-[#1A1516] shadow-[0_0_12px_rgba(224,93,68,0.25)] focus:outline-none'
                            : 'border border-[#2A2D35] focus:outline-none focus:border-[#E2B858] focus:ring-1 focus:ring-[#E2B858]/50'
                        }`}
                      />
                    )}

                    {/* Dropdown Select */}
                    {field.field_type === 'dropdown' && (
                      <select
                        required={isRequired}
                        value={formResponses[field.id] || ''}
                        onBlur={() => setTouched(prev => ({ ...prev, [field.id]: true }))}
                        onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type, field.label)}
                        className={`w-full h-10 sm:h-12 px-3 sm:px-4 text-xs sm:text-sm bg-[#121316] text-[#F5F3EF] rounded-lg transition-colors ${
                          hasErr
                            ? 'border border-[#E05D44] bg-[#1A1516] shadow-[0_0_12px_rgba(224,93,68,0.25)] focus:outline-none'
                            : 'border border-[#2A2D35] focus:outline-none focus:border-[#E2B858] focus:ring-1 focus:ring-[#E2B858]/50'
                        }`}
                      >
                        <option value="" className="bg-[#121316] text-[#949089]">Select an option...</option>
                        {field.options && field.options.map(opt => (
                          <option key={opt.id} value={opt.option_value} className="bg-[#121316] text-[#F5F3EF]">
                            {opt.option_label}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Checkbox Group */}
                    {field.field_type === 'checkbox' && (
                      <div className="space-y-2 pt-1">
                        {field.options && field.options.map(opt => {
                          const isChecked = (formResponses[field.id] || []).includes(opt.option_value);
                          return (
                            <label
                              key={opt.id}
                              className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg border transition-all cursor-pointer text-xs sm:text-sm ${
                                isChecked
                                  ? 'border-[#E2B858] bg-[#E2B858]/10 text-[#F5F3EF]'
                                  : 'bg-[#121316] border-[#2A2D35] hover:border-[#949089] text-[#F5F3EF]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onBlur={() => setTouched(prev => ({ ...prev, [field.id]: true }))}
                                onChange={() => handleCheckboxToggle(field.id, opt.option_value)}
                                className="w-4 h-4 rounded border-[#2A2D35] bg-[#121316] accent-[#E2B858] cursor-pointer"
                              />
                              <span className="font-medium">{opt.option_label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Radio Group */}
                    {field.field_type === 'radio' && (
                      <div className="space-y-2 pt-1">
                        {field.options && field.options.map(opt => {
                          const isSelected = formResponses[field.id] === opt.option_value;
                          return (
                            <label
                              key={opt.id}
                              className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg border transition-all cursor-pointer text-xs sm:text-sm ${
                                isSelected
                                  ? 'border-[#E2B858] bg-[#E2B858]/10 text-[#F5F3EF]'
                                  : 'bg-[#121316] border-[#2A2D35] hover:border-[#949089] text-[#F5F3EF]'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`field_${field.id}`}
                                value={opt.option_value}
                                checked={isSelected}
                                onBlur={() => setTouched(prev => ({ ...prev, [field.id]: true }))}
                                onChange={() => handleInputChange(field.id, opt.option_value, field.field_type, field.label)}
                                className="w-4 h-4 rounded-full border-[#2A2D35] bg-[#121316] accent-[#E2B858] cursor-pointer"
                              />
                              <span className="font-medium">{opt.option_label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Rating Control */}
                    {field.field_type === 'rating' && (
                      <div className="flex items-center gap-2 pt-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isSelected = (formResponses[field.id] || 0) >= star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => {
                                handleInputChange(field.id, star, field.field_type, field.label);
                                setTouched(prev => ({ ...prev, [field.id]: true }));
                              }}
                              className={`w-10 h-10 rounded-xl font-bold text-xs transition-all flex items-center justify-center border ${
                                isSelected
                                  ? 'bg-[#E2B858]/15 border-[#E2B858] text-[#E2B858] shadow-[0_0_12px_rgba(226,184,88,0.25)]'
                                  : 'bg-[#16181D] border-[#2A2D35] text-[#38393C] hover:text-[#E2B858]/60 hover:border-[#949089]/40'
                              }`}
                            >
                              <span className="text-base">★</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* File Upload Control */}
                    {field.field_type === 'file' && (
                      <div className="space-y-2">
                        {formResponses[field.id] && uploadedFileInfo[field.id] ? (
                          <div className="flex items-center justify-between p-3.5 bg-[#16181D] border border-[#2A2D35] rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <span className="text-xl">📄</span>
                              <div className="truncate">
                                <div className="text-xs font-semibold text-[#F5F3EF] truncate">
                                  {uploadedFileInfo[field.id].name}
                                </div>
                                <div className="text-[10px] text-[#949089] font-mono">
                                  {(uploadedFileInfo[field.id].size / 1024).toFixed(1)} KB • Attached
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={uploadedFileInfo[field.id].download_url || `/files/${formResponses[field.id]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 text-[11px] font-semibold text-[#E2B858] hover:text-[#FFDF98] hover:bg-[#E2B858]/10 rounded-lg transition-all"
                              >
                                View File ↗
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(field.id)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-[#E05D44] hover:text-[#FFDAD6] hover:bg-[#E05D44]/10 rounded-lg transition-all"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={`border border-dashed ${hasErr ? 'border-[#E05D44] bg-[#1A1516]' : 'border-[#2A2D35] bg-[#16181D]'} hover:border-[#949089] rounded-xl p-6 text-center transition-all`}>
                            {uploadingFields[field.id] ? (
                              <div className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-[#E2B858]">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                </svg>
                                <span>Uploading file securely...</span>
                              </div>
                            ) : (
                              <label className="cursor-pointer block">
                                <div className="text-2xl mb-1">📁</div>
                                <span className="text-xs font-semibold text-[#E2B858] hover:text-[#FFDF98]">
                                  Click to choose file
                                </span>
                                <span className="text-xs text-[#949089]"> or drag and drop</span>
                                <p className="text-[10px] text-[#949089]/70 mt-1">
                                  PDF, DOC, DOCX, JPG, PNG (Max 5 MB)
                                </p>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  onChange={(e) => handleFileUpload(field.id, e)}
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline Field Error Message (Feature 2) */}
                    {hasErr && (
                      <div className="text-[#FFDAD6] bg-[#E05D44]/15 border border-[#E05D44]/35 rounded px-2.5 py-1 text-xs mt-1.5 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                        <span>⚠️</span>
                        <span>{err}</span>
                      </div>
                    )}
                  </div>
                );
              });
            })()}

            {/* Feature 1: Bottom Actions & Smart Disabled Submit Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-[#2A2D35]">
              {missingRequiredFields.length > 0 ? (
                <div className="text-[#FFDAD6] bg-[#E05D44]/20 border border-[#E05D44]/40 px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>
                    Action Required: Missing [
                    <strong className="font-semibold text-white">
                      {missingRequiredFields.slice(0, 3).join(', ')}
                      {missingRequiredFields.length > 3 && ` +${missingRequiredFields.length - 3} more`}
                    </strong>
                    ]
                  </span>
                </div>
              ) : hasFormattingErrors ? (
                <div className="text-[#FFDAD6] bg-[#E05D44]/20 border border-[#E05D44]/40 px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Please resolve the highlighted field formatting errors above.</span>
                </div>
              ) : (
                <div className="text-xs text-[#949089] font-medium flex items-center gap-1.5">
                  <span className="text-[#52B788] text-sm font-bold">✓</span>
                  <span>All required questions answered</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`w-full sm:w-auto py-2.5 sm:py-3 px-6 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shrink-0 ${
                  isSubmitDisabled
                    ? 'bg-[#23252B] text-[#71737A] border border-[#2A2D35] cursor-not-allowed'
                    : 'bg-[#E2B858] text-black border border-[#FFE49E] shadow-[0_0_20px_rgba(226,184,88,0.35)] hover:brightness-110 cursor-pointer'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-[#71737A]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Submitting Response...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Response</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

window.PublicFormView = PublicFormView;
