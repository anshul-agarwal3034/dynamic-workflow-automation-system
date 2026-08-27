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
    const detail = data && data.detail 
      ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
      : `HTTP ${response.status} ${response.statusText}`;
    throw new Error(detail);
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

  async archiveForm(id) {
    const res = await fetch(`${API_BASE}/forms/${id}/archive`, {
      method: 'PATCH',
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
  }
};
