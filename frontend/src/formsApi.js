const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    // When served via DevTunnel or localhost on port 8000, use the current origin
    return window.location.origin;
  }
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();
const API_BASE = API_BASE_URL;
if (typeof window !== 'undefined') {
  window.API_BASE_URL = API_BASE_URL;
  window.API_BASE = API_BASE_URL;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

const handleResponse = async (response) => {
  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }
  if (!response.ok) {
    const errorMsg = data && data.detail 
      ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
      : `HTTP ${response.status} ${response.statusText}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    err.detail = data ? data.detail : null;
    throw err;
  }
  return data;
};

const formsApi = {
  async listForms({ search, status } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/forms${queryString}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getForm(id) {
    const res = await fetch(`${API_BASE}/forms/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createForm({ title, description }) {
    const res = await fetch(`${API_BASE}/forms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, description })
    });
    return handleResponse(res);
  },

  async updateForm(id, payload) {
    const res = await fetch(`${API_BASE}/forms/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async publishForm(id) {
    const res = await fetch(`${API_BASE}/forms/${id}/publish`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async archiveForm(id) {
    const res = await fetch(`${API_BASE}/forms/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async unarchiveForm(id) {
    const res = await fetch(`${API_BASE}/forms/${id}/unarchive`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async deleteForm(id) {
    const res = await fetch(`${API_BASE}/forms/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },


  async addField(formId, fieldData) {
    const res = await fetch(`${API_BASE}/forms/${formId}/fields`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(fieldData)
    });
    return handleResponse(res);
  },

  async createField(formId, fieldData) {
    return this.addField(formId, fieldData);
  },

  async updateField(fieldId, fieldData) {
    const res = await fetch(`${API_BASE}/fields/${fieldId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(fieldData)
    });
    return handleResponse(res);
  },

  async deleteField(fieldId) {
    const res = await fetch(`${API_BASE}/fields/${fieldId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async reorderFields(formId, items) {
    const res = await fetch(`${API_BASE}/forms/${formId}/reorder-fields`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items })
    });
    return handleResponse(res);
  },

  async getFormVersions(id) {
    const res = await fetch(`${API_BASE}/forms/${id}/versions`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getFormVersionDetail(formId, versionId) {
    const res = await fetch(`${API_BASE}/forms/${formId}/versions/${versionId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async generateShareLink(id) {
    const res = await fetch(`${API_BASE}/forms/${id}/generate-link`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getPublicForm(slug) {
    const res = await fetch(`${API_BASE}/public/forms/${slug}`);
    return handleResponse(res);
  },

  async submitForm(slug, submissionData) {
    const res = await fetch(`${API_BASE}/public/forms/${slug}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submissionData)
    });
    return handleResponse(res);
  },

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
    return handleResponse(res);
  },

  async createRule(formId, ruleData) {
    const res = await fetch(`${API_BASE}/forms/${formId}/rules`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(ruleData)
    });
    return handleResponse(res);
  },

  async getRules(formId) {
    const res = await fetch(`${API_BASE}/forms/${formId}/rules`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateRule(ruleId, ruleData) {
    const res = await fetch(`${API_BASE}/rules/${ruleId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(ruleData)
    });
    return handleResponse(res);
  },

  async deleteRule(ruleId) {
    const res = await fetch(`${API_BASE}/rules/${ruleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getFormSubmissions(formId) {
    const res = await fetch(`${API_BASE}/forms/${formId}/submissions`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getFormAnalytics(formId, params = {}) {
    const query = new URLSearchParams();
    if (params.version_id) query.append('version_id', params.version_id);
    if (params.from_date) query.append('from_date', params.from_date);
    if (params.to_date) query.append('to_date', params.to_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/forms/${formId}/analytics${qs}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async startFormSession(slug) {
    const res = await fetch(`${API_BASE}/public/forms/${slug}/start`, {
      method: 'POST'
    });
    return handleResponse(res);
  },

  async getFormResponses(formId, params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.from_date) query.append('from_date', params.from_date);
    if (params.to_date) query.append('to_date', params.to_date);
    if (params.field_filters) {
      const ffStr = typeof params.field_filters === 'string'
        ? params.field_filters
        : JSON.stringify(params.field_filters);
      query.append('field_filters', ffStr);
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/forms/${formId}/responses${qs}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async exportResponsesCSV(formId, versionId = null) {
    const qs = versionId ? `?version_id=${versionId}` : '';
    const res = await fetch(`${API_BASE}/forms/${formId}/export/csv${qs}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to export CSV' }));
      throw new Error(err.detail || 'Failed to export CSV');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `responses_${formId}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return true;
  },

  async exportResponsesJSON(formId, versionId = null) {
    const qs = versionId ? `?version_id=${versionId}` : '';
    const res = await fetch(`${API_BASE}/forms/${formId}/export/json${qs}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to export JSON' }));
      throw new Error(err.detail || 'Failed to export JSON');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `responses_${formId}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return true;
  },

  async getResponseDetails(responseId) {
    const res = await fetch(`${API_BASE}/responses/${responseId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async bulkDeleteResponses(formId, responseIds) {
    const res = await fetch(`${API_BASE}/forms/${formId}/responses/bulk-delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ response_ids: responseIds })
    });
    return handleResponse(res);
  },

  async updateFormRetention(formId, retentionDays) {
    const res = await fetch(`${API_BASE}/forms/${formId}/retention`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ retention_days: retentionDays })
    });
    return handleResponse(res);
  },

  async bulkDeleteForms(formIds) {
    const res = await fetch(`${API_BASE}/forms/bulk-delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ form_ids: formIds })
    });
    return handleResponse(res);
  },

  async getDashboardSummary() {
    const res = await fetch(`${API_BASE}/dashboard/summary`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  }
};


