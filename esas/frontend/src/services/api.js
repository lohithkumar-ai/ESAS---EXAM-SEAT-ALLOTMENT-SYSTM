import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('esas_token') || sessionStorage.getItem('esas_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (only redirect if expired while browsing protected pages, NEVER during login/auth)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('esas_token');
      localStorage.removeItem('esas_refresh');
      localStorage.removeItem('esas_user');
      sessionStorage.removeItem('esas_token');
      sessionStorage.removeItem('esas_refresh');
      sessionStorage.removeItem('esas_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ────────────────────────────────────────────────────
export const authAPI = {
  login: (identifier, password) => {
    if (typeof identifier === 'object') {
      return api.post('/auth/login/', identifier);
    }
    const payload = { password };
    if (identifier.includes('@')) {
      payload.email = identifier.trim();
      payload.username = identifier.trim();
    } else {
      payload.username = identifier.trim();
    }
    return api.post('/auth/login/', payload);
  },
  register: (data) =>
    api.post('/auth/register/', data),
  logout: (refresh) =>
    api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
  forgotPassword: (identifier) =>
    api.post('/auth/forgot-password/', { identifier }),
  resetPassword: (identifier, code, new_password) =>
    api.post('/auth/reset-password/', { identifier, code, new_password }),
};

// ── Dashboard ───────────────────────────────────────────────
export const dashboardAPI = {
  getStats: (sessionId) => api.get('/exams/dashboard/', { params: { session_id: sessionId } }),
};

// ── Exam Sessions ───────────────────────────────────────────
export const examAPI = {
  getSoftware: () => api.get('/exams/software/'),
  getSessions: (softwareId) =>
    api.get('/exams/sessions/', { params: { software: softwareId } }),
  createSession: (data) =>
    api.post('/exams/sessions/', data),
  getSession: (id) =>
    api.get(`/exams/sessions/${id}/`),
  lockSession: (id) =>
    api.post(`/exams/sessions/${id}/lock/`),
  unlockSession: (id) =>
    api.post(`/exams/sessions/${id}/unlock/`),
  getBranches: () => api.get('/exams/branches/'),
  getCurricula: () => api.get('/exams/curricula/'),
  createCurriculum: (data) => api.post('/exams/curricula/', data),
  deleteCurriculum: (id) => api.delete(`/exams/curricula/${id}/`),
  getYears: (curriculumId) => api.get('/exams/years/', { params: { curriculum: curriculumId } }),
  createYear: (data) => api.post('/exams/years/', data),
  deleteYear: (id) => api.delete(`/exams/years/${id}/`),
  getSemesters: (academicYearId) => api.get('/exams/semesters/', { params: { academic_year: academicYearId } }),
  createSemester: (data) => api.post('/exams/semesters/', data),
  deleteSemester: (id) => api.delete(`/exams/semesters/${id}/`),
  getSessionConfigs: (sessionId) => api.get('/exams/session-configs/', { params: { session: sessionId } }),
  deleteSession: (id) => api.delete(`/exams/sessions/${id}/`),
};

// ── NR Upload ───────────────────────────────────────────────
export const nrAPI = {
  upload: (sessionId, file) => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('file', file);
    return api.post('/nr/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  validate: (uploadId, sheetName = null) =>
    api.post('/nr/validate/', { upload_id: uploadId, sheet_name: sheetName }),
  importData: (uploadId, overrides = {}) => api.post('/nr/import/', { upload_id: uploadId, ...overrides }),
  preview: (uploadId) =>
    api.get('/nr/preview/', { params: { upload_id: uploadId } }),
};

// ── Students ────────────────────────────────────────────────
export const studentAPI = {
  search: (query, sessionId) =>
    api.get('/students/search/', { params: { q: query, session_id: sessionId } }),
  getCandidates: (params) =>
    api.get('/students/candidates/', { params }),
};

// ── Rooms ───────────────────────────────────────────────────
export const roomAPI = {
  list: (sessionId) =>
    api.get('/rooms/', { params: { session_id: sessionId } }),
  create: (data) =>
    api.post('/rooms/', data),
  delete: (id) =>
    api.delete(`/rooms/${id}/`),
  get: (id) =>
    api.get(`/rooms/${id}/`),
  getSeatingChart: (id, sessionId) =>
    api.get(`/rooms/${id}/seating_chart/`, { params: { session_id: sessionId } }),
};

// ── Allotment ───────────────────────────────────────────────
export const allotmentAPI = {
  generate: (sessionId, category = null, branches = []) =>
    api.post('/allotment/generate/', { session_id: sessionId, category, branches }),
  regenerate: (sessionId, category = null, branches = []) =>
    api.post('/allotment/regenerate/', { session_id: sessionId, category, branches }),
  reset: (sessionId) =>
    api.post('/allotment/reset/', { session_id: sessionId }),
  validate: (sessionId) =>
    api.post('/allotment/validate/', { session_id: sessionId }),
  getDetail: (sessionId, roomId) =>
    api.get('/allotment/detail/', { params: { session_id: sessionId, room_id: roomId } }),
};

// ── Reports ─────────────────────────────────────────────────
export const reportAPI = {
  seatAllotment: (sessionId) =>
    api.get('/reports/seat-allotment/', { params: { session_id: sessionId } }),
  roomSummary: (sessionId) =>
    api.get('/reports/room-summary/', { params: { session_id: sessionId } }),
  branchWise: (sessionId) =>
    api.get('/reports/branch-wise/', { params: { session_id: sessionId } }),
  subjectWise: (sessionId) =>
    api.get('/reports/subject-wise/', { params: { session_id: sessionId } }),
  curriculumWise: (sessionId) =>
    api.get('/reports/curriculum-wise/', { params: { session_id: sessionId } }),
  exportExcel: (sessionId) =>
    api.get('/reports/export/excel/', {
      params: { session_id: sessionId },
      responseType: 'blob',
    }),
  exportPDF: (sessionId) =>
    api.get('/reports/export/pdf/', {
      params: { session_id: sessionId },
      responseType: 'blob',
    }),
};

export default api;
