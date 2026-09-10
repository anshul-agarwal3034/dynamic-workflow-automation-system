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

  const handleInputChange = (fieldId, value) => {
    clearFieldError(fieldId);
    setFormResponses(prev => ({
      ...prev,
      [fieldId]: value
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

  const getFieldError = (field) => {
    if (!field) return null;
    const fid = String(field.id);
    const flabel = field.label;
    const norm = flabel ? flabel.toLowerCase().replace(/[^a-z0-9_]+/g, '_') : '';
    return fieldErrors[fid] || (flabel && fieldErrors[flabel]) || (norm && fieldErrors[norm]) || null;
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

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    setIsSubmitting(true);

    try {
      const payload = {
        responses: formResponses,
        completion_time_seconds: elapsedSeconds
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

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center my-auto shadow-2xl">
        <p className="text-xs font-semibold text-slate-400">Loading FormPilotX Public Form...</p>
      </div>
    );
  }

  if (isArchived) {
    return (
      <div className="w-full max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center my-auto shadow-2xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center text-2xl mx-auto border border-slate-700">
          🔒
        </div>
        <h2 className="text-xl font-bold text-slate-100">Form No Longer Available</h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          This form has been archived by its creator and is no longer accepting public submissions.
        </p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="w-full max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center my-auto shadow-2xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center text-2xl mx-auto border border-red-500/20">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-100">Form Link Invalid</h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          {error || 'The link you opened is invalid or the form is not currently published.'}
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="w-full max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center my-auto shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-3xl mx-auto border border-emerald-500/20">
          ✓
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-slate-100">Response Submitted!</h2>
          <p className="text-xs text-slate-400">
            Thank you for completing <span className="font-bold text-slate-200">{form.title}</span>. Your response has been recorded.
          </p>
          {submittedResponseId && (
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl max-w-xs mx-auto mt-2">
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500">Submission Reference ID</div>
              <div className="text-base font-mono font-black text-indigo-400 select-all mt-0.5">{submittedResponseId}</div>
            </div>
          )}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-full border border-slate-800 text-xs font-mono text-indigo-400 mt-2">
            <span>⏱️ Completion time:</span>
            <span className="font-bold text-slate-100">{formatCompletionTime(completionSeconds)} ({completionSeconds}s)</span>
          </div>
        </div>
        <button
          onClick={() => { setSubmitted(false); setFormResponses({}); setFieldErrors({}); setSubmitError(''); setSubmittedResponseId(''); setUploadedFileInfo({}); }}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
        >
          Submit Another Response
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 p-8 text-white relative">
        <div className="flex items-center justify-between gap-4 mb-3">
          <span className="px-3 py-1 text-[10px] font-bold bg-white/10 rounded-full backdrop-blur-md border border-white/20">
            Version {form.version_number}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">
            FormPilotX Public Form
          </span>
        </div>
        <h1 className="text-2xl font-extrabold mb-2">{form.title}</h1>
        {form.description && (
          <p className="text-xs text-blue-100 leading-relaxed max-w-xl">{form.description}</p>
        )}
      </div>

      {/* Form Questions List */}
      <form onSubmit={handleSubmit} className="p-8 bg-slate-950/80 space-y-6">
        {submitError && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2.5 text-xs text-rose-400">
            <span>⚠️</span>
            <span>{submitError}</span>
          </div>
        )}

        {(() => {
          const visibleFields = (form.fields || []).filter(field => fieldStates.visibleMap[field.id] !== false);
          if (visibleFields.length === 0) {
            return (
              <div className="py-12 text-center text-xs text-slate-500">
                {form.fields.length === 0 ? 'This published form does not contain any fields.' : 'No active questions to display based on conditional logic.'}
              </div>
            );
          }
          return visibleFields.map((field, index) => {
            const isRequired = !!fieldStates.requiredMap[field.id];
            const err = getFieldError(field);
            const hasErr = !!err;

            return (
              <div key={field.id} className={`bg-slate-900 border ${hasErr ? 'border-rose-500/50' : 'border-slate-800'} rounded-2xl p-6 shadow-xl space-y-3 transition-colors`}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200">
                    {index + 1}. {field.label}
                    {isRequired && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <span className="text-[10px] font-mono text-slate-500 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {field.field_type}
                  </span>
                </div>

                {/* Text Input */}
                {field.field_type === 'text' && (
                  <input
                    type="text"
                    required={isRequired}
                    placeholder={field.placeholder || 'Enter your response...'}
                    value={formResponses[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className={`w-full h-10 px-3.5 bg-slate-950 border ${hasErr ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/30'} rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2`}
                  />
                )}

                {/* Email Input */}
                {field.field_type === 'email' && (
                  <input
                    type="email"
                    required={isRequired}
                    placeholder={field.placeholder || 'name@example.com'}
                    value={formResponses[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className={`w-full h-10 px-3.5 bg-slate-950 border ${hasErr ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/30'} rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2`}
                  />
                )}

                {/* Number Input */}
                {field.field_type === 'number' && (
                  <input
                    type="number"
                    required={isRequired}
                    placeholder={field.placeholder || 'Enter numeric value...'}
                    value={formResponses[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className={`w-full h-10 px-3.5 bg-slate-950 border ${hasErr ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/30'} rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2`}
                  />
                )}

                {/* Date Input */}
                {field.field_type === 'date' && (
                  <input
                    type="date"
                    required={isRequired}
                    value={formResponses[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className={`w-full h-10 px-3.5 bg-slate-950 border ${hasErr ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/30'} rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2`}
                  />
                )}

                {/* Dropdown Select */}
                {field.field_type === 'dropdown' && (
                  <select
                    required={isRequired}
                    value={formResponses[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className={`w-full h-10 px-3.5 bg-slate-950 border ${hasErr ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/30'} rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2`}
                  >
                    <option value="">Select an option...</option>
                    {field.options && field.options.map(opt => (
                      <option key={opt.id} value={opt.option_value}>{opt.option_label}</option>
                    ))}
                  </select>
                )}

                {/* Checkbox Group */}
                {field.field_type === 'checkbox' && (
                  <div className="space-y-2 pt-1">
                    {field.options && field.options.map(opt => {
                      const isChecked = (formResponses[field.id] || []).includes(opt.option_value);
                      return (
                        <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxToggle(field.id, opt.option_value)}
                            className="w-4 h-4 text-indigo-600 border-slate-700 bg-slate-950 rounded focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-300 font-medium">{opt.option_label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Rating Control */}
                {field.field_type === 'rating' && (
                  <div className="flex items-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleInputChange(field.id, star)}
                        className={`w-10 h-10 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${
                          (formResponses[field.id] || 0) >= star
                            ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                            : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        ★ {star}
                      </button>
                    ))}
                  </div>
                )}

                {/* File Upload Control */}
                {field.field_type === 'file' && (
                  <div className="space-y-2">
                    {formResponses[field.id] && uploadedFileInfo[field.id] ? (
                      <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="text-xl">📄</span>
                          <div className="truncate">
                            <div className="text-xs font-semibold text-slate-200 truncate">
                              {uploadedFileInfo[field.id].name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {(uploadedFileInfo[field.id].size / 1024).toFixed(1)} KB • Uploaded
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={uploadedFileInfo[field.id].download_url || `/files/${formResponses[field.id]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-all"
                          >
                            View File ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(field.id)}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`border border-dashed ${hasErr ? 'border-rose-500/80 bg-rose-500/5' : 'border-slate-800 bg-slate-950/70'} hover:border-slate-700 rounded-xl p-5 text-center transition-all`}>
                        {uploadingFields[field.id] ? (
                          <div className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-indigo-400">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                            <span>Uploading file securely...</span>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <div className="text-2xl mb-1">📁</div>
                            <span className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                              Click to choose file
                            </span>
                            <span className="text-xs text-slate-400"> or drag and drop</span>
                            <p className="text-[10px] text-slate-500 mt-1">
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

                {/* Inline Field Error Message */}
                {hasErr && (
                  <p className="text-[11px] font-semibold text-rose-400 mt-1 flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>{err}</span>
                  </p>
                )}
              </div>
            );
          });
        })()}

        <div className="pt-4 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-3 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 ${
              isSubmitting
                ? 'bg-indigo-700/60 text-indigo-200 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
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
  );
};
