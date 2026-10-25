// Robust API Client for DraftMate Evidence Intelligence
// Supports HttpOnly cookie authentication, multi-user isolation, and binary document streaming

const BACKEND_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL ? import.meta.env.VITE_API_URL : '').replace(/\/+$/, '');
const API_BASE = `${BACKEND_BASE}/api`;

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // Transmit and receive HttpOnly session cookies
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || `Server returned status ${response.status}: ${response.statusText}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.code = data.code;
      throw error;
    }

    return data;
  } catch (err) {
    if (endpoint !== '/auth/me') {
      console.error(`API request error on ${endpoint}:`, err.message);
    }
    throw err;
  }
}

// Binary File Downloader for PDF and DOCX Exports
async function downloadFile(endpoint, payload, defaultFilename) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Export failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition');
  let filename = defaultFilename;
  if (disposition && disposition.includes('filename=')) {
    const matches = disposition.match(/filename="?([^";]+)"?/);
    if (matches && matches[1]) filename = matches[1];
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
  return { success: true, filename };
}

// Authorized Document File Downloader (checks ownership on backend)
async function downloadAuthorizedDocument(documentId, defaultFilename = 'document.txt') {
  const url = `${API_BASE}/documents/${documentId}/download`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition');
  let filename = defaultFilename;
  if (disposition && disposition.includes('filename=')) {
    const matches = disposition.match(/filename="?([^";]+)"?/);
    if (matches && matches[1]) filename = matches[1];
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
  return { success: true, filename };
}

export const api = {
  // Authentication & Account API
  signup: (data) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (data) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),

  // Matters API (User Isolated)
  getMatters: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(query ? `/matters?${query}` : '/matters');
  },
  getMatterStats: () => request('/matters/stats'),
  checkDuplicateCaseNumber: (caseNumber, cnr, excludeId) => 
    request(`/matters/check-duplicate?caseNumber=${encodeURIComponent(caseNumber || '')}&cnr=${encodeURIComponent(cnr || '')}&excludeId=${excludeId || ''}`),
  getMatter: (id) => request(`/matters/${id}`),
  getMatterTimeline: (id) => request(`/matters/${id}/timeline`),
  createMatter: (data) => request('/matters', { method: 'POST', body: JSON.stringify(data) }),
  updateMatter: (id, data) => request(`/matters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateMatterStatus: (id, status) => request(`/matters/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteMatter: (id) => request(`/matters/${id}`, { method: 'DELETE' }),

  // Hearings & Court Calendar API (User Isolated)
  getHearings: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(query ? `/hearings?${query}` : '/hearings');
  },
  getHearing: (id) => request(`/hearings/${id}`),
  createHearing: (data) => request('/hearings', { method: 'POST', body: JSON.stringify(data) }),
  updateHearing: (id, data) => request(`/hearings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHearing: (id) => request(`/hearings/${id}`, { method: 'DELETE' }),

  // Hearing Reminders & Deadlines API (User Isolated)
  getReminders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(query ? `/reminders?${query}` : '/reminders');
  },
  markReminderRead: (id) => request(`/reminders/${id}/read`, { method: 'PUT' }),
  completeReminder: (id) => request(`/reminders/${id}/complete`, { method: 'PUT' }),
  dismissReminder: (id) => request(`/reminders/${id}/dismiss`, { method: 'PUT' }),
  createReminder: (data) => request('/reminders', { method: 'POST', body: JSON.stringify(data) }),
  deleteReminder: (id) => request(`/reminders/${id}`, { method: 'DELETE' }),

  // Documents API (User Isolated)
  getDocuments: (matterId) => request(matterId ? `/documents?matterId=${matterId}` : '/documents'),
  getDocument: (id) => request(`/documents/${id}`),
  getMatterEvidence: (matterId) => request(`/documents/matter/${matterId}/evidence`),
  interpretDocumentWithAI: (id, matterContext) => request(`/documents/${id}/ai-interpret`, { method: 'POST', body: JSON.stringify({ matterContext }) }),
  createDocument: (data) => request('/documents', { method: 'POST', body: JSON.stringify(data) }),
  updateDocumentContent: (id, content) => request(`/documents/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
  downloadDocument: downloadAuthorizedDocument,
  uploadDocument: (file, matterId) => {
    const formData = new FormData();
    formData.append('document', file);
    if (matterId) formData.append('matterId', matterId);
    return request('/documents/upload', { method: 'POST', body: formData });
  },

  // Drafting Studio & Generation API
  getTemplates: () => request('/drafting/templates'),
  generateDraft: (params) => request('/drafting/generate', { method: 'POST', body: JSON.stringify(params) }),
  reviseParagraph: (params) => request('/drafting/revise-paragraph', { method: 'POST', body: JSON.stringify(params) }),
  reviseDraft: (params) => request('/drafting/revise', { method: 'POST', body: JSON.stringify(params) }),

  // Persistent Drafts Repository
  getDrafts: (matterId) => request(matterId ? `/drafts?matterId=${matterId}` : '/drafts'),
  getDraft: (id) => request(`/drafts/${id}`),
  saveDraft: (data) => request('/drafts', { method: 'POST', body: JSON.stringify(data) }),
  updateDraft: (id, data) => request(`/drafts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDraft: (id) => request(`/drafts/${id}`, { method: 'DELETE' }),

  // Legal Research & Cross-Reference API
  getStatutes: (query) => request(query ? `/research/statutes?query=${encodeURIComponent(query)}` : '/research/statutes'),
  getPrecedents: (query) => request(query ? `/research/precedents?query=${encodeURIComponent(query)}` : '/research/precedents'),
  searchResearch: (query) => request('/research/query', { method: 'POST', body: JSON.stringify({ query }) }),

  // Risk Radar & Evidence API
  getRiskRadar: (params) => request('/analysis/risk-radar', { method: 'POST', body: JSON.stringify(params) }),
  getEvidenceSummary: (params) => request('/analysis/evidence-summary', { method: 'POST', body: JSON.stringify(params) }),

  // Verification API
  verifyCitations: (textOrParams, extraParams = {}) => {
    const payload = typeof textOrParams === 'object' && textOrParams !== null
      ? textOrParams
      : { text: textOrParams, ...extraParams };
    return request('/verification/citations', { method: 'POST', body: JSON.stringify(payload) });
  },
  verifySingleCitation: (citationOrParams) => {
    const payload = typeof citationOrParams === 'object' && citationOrParams !== null
      ? citationOrParams
      : { citation: citationOrParams };
    return request('/verification/single', { method: 'POST', body: JSON.stringify(payload) });
  },
  verifyBsaElectronic: (data) => request('/verification/bsa-electronic', { method: 'POST', body: JSON.stringify(data) }),

  // Redline Compare API & Persistent Session History
  compareTexts: (params) => request('/redline/compare', { method: 'POST', body: JSON.stringify(params) }),
  applyRedlineDecisions: (params) => request('/redline/apply-decisions', { method: 'POST', body: JSON.stringify(params) }),
  getRedlineHistory: (matterId) => request(matterId ? `/redline/history?matterId=${matterId}` : '/redline/history'),
  getRedlineSession: (id) => request(`/redline/history/${id}`),
  saveRedlineSession: (data) => request('/redline/save-session', { method: 'POST', body: JSON.stringify(data) }),
  deleteRedlineSession: (id) => request(`/redline/history/${id}`, { method: 'DELETE' }),

  // Real PDF and DOCX Binary Document Exports
  exportDraft: (params) => downloadFile('/export/draft', params, `${params.title || 'Legal_Draft'}.${params.format || 'pdf'}`),
  exportRedline: (params) => downloadFile('/export/redline', params, `${params.title || 'Redline_Report'}.${params.format || 'pdf'}`),
  exportEvidence: (params) => downloadFile('/export/evidence', params, `${params.title || 'Evidence_Dossier'}.${params.format || 'pdf'}`),
  exportRiskRadar: (params) => downloadFile('/export/risk-radar', params, `${params.title || 'Risk_Radar_Report'}.${params.format || 'pdf'}`),
  exportCitations: (params) => downloadFile('/export/citations', params, `${params.title || 'Citation_Report'}.${params.format || 'pdf'}`),

  // Configuration & Health API
  getConfigStatus: () => request('/config/status'),
  updateApiKey: (apiKey) => request('/config/update-key', { method: 'POST', body: JSON.stringify({ apiKey }) }),
  getHealth: () => request('/health')
};
