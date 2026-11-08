const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getToken() {
  return localStorage.getItem('sweety_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('sweety_token', token);
  } else {
    localStorage.removeItem('sweety_token');
  }
}

export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  const authToken = token === undefined ? getToken() : token;

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error || 'Something went wrong.', response.status);
  }

  return data;
}
