const API_BASE = 'http://127.0.0.1:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
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

  async updateForm(id, { title, description }) {
    const res = await fetch(`${API_BASE}/forms/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, description })
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
  }
};
