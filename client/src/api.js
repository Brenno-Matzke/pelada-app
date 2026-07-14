const TOKEN_KEY = 'pelada_token';
// In production, point at the deployed API (set VITE_API_URL in Vercel).
// Locally, '/api' is proxied to localhost:3001 by vite.config.js.
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erro ${res.status}`);
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/auth/me'),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) =>
    request('/auth/reset-password', { method: 'POST', body: { token, password } }),
  updateProfile: (payload) => request('/users/me', { method: 'PATCH', body: payload }),
  listUsers: () => request('/users'),
  setUserAdmin: (userId, isAdmin) => request(`/users/${userId}/admin`, { method: 'PATCH', body: { isAdmin } }),

  getPelada: () => request('/peladas/current'),
  updatePelada: (payload) => request('/peladas/current', { method: 'PATCH', body: payload }),
  confirm: () => request('/peladas/current/confirm', { method: 'POST' }),
  cancel: () => request('/peladas/current/cancel', { method: 'POST' }),
  togglePaid: () => request('/peladas/current/paid', { method: 'PATCH' }),

  removePlayer: (userId) => request(`/peladas/current/players/${userId}`, { method: 'DELETE' }),
  togglePlayerPaid: (userId) => request(`/peladas/current/players/${userId}/paid`, { method: 'PATCH' }),
  promoteWaitlist: (userId) => request(`/peladas/current/waitlist/${userId}/promote`, { method: 'POST' }),

  generateTeams: () => request('/peladas/current/teams/generate', { method: 'POST' }),
  assignTeam: (userId, teamNumber) =>
    request('/peladas/current/teams', { method: 'PATCH', body: { userId, teamNumber } }),
};
