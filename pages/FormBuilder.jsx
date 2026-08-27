const FormBuilderView = ({ id }) => {
  const [form, setForm] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [actionError, setActionError] = React.useState('');

  // Inline edit form title/description state
  const [isEditingHeader, setIsEditingHeader] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');

  // Add field form state
  const [fieldLabel, setFieldLabel] = React.useState('');
  const [fieldType, setFieldType] = React.useState('text');
  const [fieldRequired, setFieldRequired] = React.useState(false);
  const [fieldPlaceholder, setFieldPlaceholder] = React.useState('');
  const [fieldOptions, setFieldOptions] = React.useState([
    { option_label: '', option_value: '' }
  ]);
  const [addingField, setAddingField] = React.useState(false);

  // Modals state
  const [deleteFieldId, setDeleteFieldId] = React.useState(null);
  const [showArchiveModal, setShowArchiveModal] = React.useState(false);

  const loadForm = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await formsApi.getForm(id);
      setForm(data);
      setEditTitle(data.title);
      setEditDescription(data.description || '');
    } catch (err) {
      setError(err.message || 'Failed to load form details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/signin');
      return;
    }
    loadForm();
  }, [loadForm]);

  const activeVersion = form && form.versions && form.versions.length > 0 ? form.versions[0] : null;
  const fields = activeVersion && activeVersion.fields ? [...activeVersion.fields].sort((a, b) => a.display_order - b.display_order) : [];
  const isDraft = form && form.status === 'draft';

  // Handle header title/description update
  const handleSaveHeader = async () => {
    setActionError('');
    if (!editTitle.trim()) {
      setActionError('Form title cannot be empty.');
      return;
    }
    try {
      const updated = await formsApi.updateForm(form.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined
      });
      setForm(updated);
      setIsEditingHeader(false);
    } catch (err) {
      setActionError(err.message || 'Failed to update form header.');
    }
  };

  // Add Option row for dropdown/checkbox
  const handleAddOptionRow = () => {
    setFieldOptions(prev => [...prev, { option_label: '', option_value: '' }]);
  };

  const handleOptionChange = (index, field, value) => {
    setFieldOptions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'option_label' && !updated[index].option_value) {
        updated[index].option_value = value.toLowerCase().replace(/\s+/g, '_');
      }
      return updated;
    });
  };

  const handleRemoveOptionRow = (index) => {
    setFieldOptions(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Add Field
  const handleAddField = async (e) => {
    e.preventDefault();
    setActionError('');

    if (!fieldLabel.trim()) {
      setActionError('Field label is required.');
      return;
    }

    let parsedOptions = undefined;
    if (fieldType === 'dropdown' || fieldType === 'checkbox') {
      const validOptions = fieldOptions
        .filter(opt => opt.option_label.trim() !== '')
        .map((opt, idx) => ({
          option_label: opt.option_label.trim(),
          option_value: (opt.option_value.trim() || opt.option_label.trim().toLowerCase().replace(/\s+/g, '_')),
          display_order: idx + 1
        }));

      if (validOptions.length === 0) {
        setActionError(`Please add at least one valid option for ${fieldType} field.`);
        return;
      }
      parsedOptions = validOptions;
    }

    setAddingField(true);

    try {
      const newFieldData = {
        label: fieldLabel.trim(),
        field_type: fieldType,
        placeholder: fieldPlaceholder.trim() || undefined,
        is_required: fieldRequired,
        display_order: fields.length + 1,
        options: parsedOptions
      };

      await formsApi.addField(form.id, newFieldData);
      
      // Reset field form
      setFieldLabel('');
      setFieldType('text');
      setFieldRequired(false);
      setFieldPlaceholder('');
      setFieldOptions([{ option_label: '', option_value: '' }]);
      
      // Reload form
      await loadForm();
    } catch (err) {
      setActionError(err.message || 'Failed to add field.');
    } finally {
      setAddingField(false);
    }
  };

  // Delete field handler
  const confirmDeleteField = async () => {
    if (!deleteFieldId) return;
    setActionError('');
    try {
      await formsApi.deleteField(deleteFieldId);
      setDeleteFieldId(null);
      await loadForm();
    } catch (err) {
      setActionError(err.message || 'Failed to delete field.');
    }
  };

  // Reorder field handler (Move up/down)
  const handleMoveField = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const reorderedList = [...fields];
    const temp = reorderedList[index];
    reorderedList[index] = reorderedList[targetIndex];
    reorderedList[targetIndex] = temp;

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

  // Archive Form handler
  const confirmArchiveForm = async () => {
    setActionError('');
    try {
      const archived = await formsApi.archiveForm(form.id);
      setForm(archived);
      setShowArchiveModal(false);
    } catch (err) {
      setActionError(err.message || 'Failed to archive form.');
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-lg p-12 text-center my-auto">
        <p className="text-xs font-semibold text-slate-500">Loading Form Builder...</p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-lg p-8 my-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium mb-4">
          {error || 'Form not found'}
        </div>
        <button onClick={() => navigate('/forms')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg">
          ← Back to Forms
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden flex flex-col min-h-[600px] relative my-auto">
      {/* Header */}
      <header className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/forms')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
          >
            ← Back to Forms
          </button>
          <span className="text-slate-300">|</span>
          <h1 className="text-sm font-bold text-slate-900">Form Builder</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/forms/${form.id}`)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
          >
            Preview Form
          </button>

          {isDraft && (
            <button
              onClick={() => setShowArchiveModal(true)}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-lg transition-colors border border-red-200"
            >
              Archive Form
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 sm:p-8 flex-1 bg-slate-50 space-y-6">
        {/* Action Error alert */}
        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
            {actionError}
          </div>
        )}

        {/* Archived Banner Notice */}
        {!isDraft && (
          <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-700 flex items-center gap-3">
            <span className="text-base">🔒</span>
            <div>
              <span className="font-bold">This form is archived and cannot be edited.</span>
              <p className="text-[11px] text-slate-500 mt-0.5">All field structure and settings are in read-only mode.</p>
            </div>
          </div>
        )}

        {/* Form Title & Description Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Form Header</span>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${isDraft ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
                {form.status.toUpperCase()}
              </span>
            </div>
          </div>

          {isEditingHeader && isDraft ? (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full p-3 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveHeader}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditingHeader(false);
                    setEditTitle(form.title);
                    setEditDescription(form.description || '');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{form.title}</h2>
                <p className="text-xs text-slate-500 mt-1">{form.description || 'No description provided.'}</p>
              </div>
              {isDraft && (
                <button
                  onClick={() => setIsEditingHeader(true)}
                  className="px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors shrink-0"
                >
                  ✏️ Edit Title
                </button>
              )}
            </div>
          )}
        </div>

        {/* Existing Fields List Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900">Form Fields ({fields.length})</h3>
            <span className="text-xs text-slate-400">Order is defined by display arrows</span>
          </div>

          {fields.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <p className="text-xs text-slate-500 font-medium">No fields added to this form yet.</p>
              {isDraft && <p className="text-[11px] text-slate-400 mt-1">Use the "Add New Field" section below to add questions.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white transition-colors flex items-center justify-between gap-4"
                >
                  {/* Reorder Arrows (Only if draft) */}
                  {isDraft && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveField(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="w-6 h-6 rounded bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveField(idx, 'down')}
                        disabled={idx === fields.length - 1}
                        title="Move Down"
                        className="w-6 h-6 rounded bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center"
                      >
                        ▼
                      </button>
                    </div>
                  )}

                  {/* Field Summary */}
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{idx + 1}. {field.label}</span>
                      {field.is_required && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Required</span>
                      )}
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full uppercase">
                        {field.field_type}
                      </span>
                    </div>

                    {field.options && field.options.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {field.options.map((opt) => (
                          <span key={opt.id} className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">
                            {opt.option_label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Field Actions */}
                  {isDraft && (
                    <button
                      onClick={() => setDeleteFieldId(field.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Field Section (Draft Only) */}
        {isDraft && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">+</span>
              Add New Field
            </h3>

            <form onSubmit={handleAddField} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Field Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fieldLabel}
                    onChange={(e) => setFieldLabel(e.target.value)}
                    placeholder="e.g. Full Name or Choice"
                    required
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Field Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 bg-white font-medium"
                  >
                    <option value="text">Text Input</option>
                    <option value="email">Email Address</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="dropdown">Dropdown Select</option>
                    <option value="checkbox">Checkbox List</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRequiredField"
                  checked={fieldRequired}
                  onChange={(e) => setFieldRequired(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isRequiredField" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Mark as Required Field
                </label>
              </div>

              {/* Dynamic Option List for Dropdown and Checkbox */}
              {(fieldType === 'dropdown' || fieldType === 'checkbox') && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Options List <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddOptionRow}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      + Add Option
                    </button>
                  </div>

                  {fieldOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Option ${idx + 1} Label`}
                        value={opt.option_label}
                        onChange={(e) => handleOptionChange(idx, 'option_label', e.target.value)}
                        className="flex-1 h-8 px-2.5 border border-slate-300 rounded text-xs text-slate-900"
                      />
                      <input
                        type="text"
                        placeholder={`Option ${idx + 1} Value`}
                        value={opt.option_value}
                        onChange={(e) => handleOptionChange(idx, 'option_value', e.target.value)}
                        className="flex-1 h-8 px-2.5 border border-slate-300 rounded text-xs text-slate-900"
                      />
                      {fieldOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionRow(idx)}
                          className="w-8 h-8 text-red-500 hover:bg-red-50 rounded flex items-center justify-center font-bold text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={addingField}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {addingField ? 'Adding Field...' : '+ Add Field to Form'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Delete Field Modal */}
      {deleteFieldId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-left space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Delete this field?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this field from the draft form?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteFieldId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteField}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                Delete Field
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Form Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-left space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Archive this form?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Archive this form? It will no longer accept submissions.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchiveForm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                Archive Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
