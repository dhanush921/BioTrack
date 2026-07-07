const API_BASE_URL = window.location.origin.includes('localhost:5173') ? 'http://localhost:5000/api' : '/api';

// Helper to get local JWT token
function getAuthToken() {
  return sessionStorage.getItem('biotrack_token');
}

// Global fetch wrapper with credentials & headers
async function request(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }

  // If content disposition is attachment, return blob/text (for spreadsheet or PDF backup download)
  const contentDisposition = response.headers.get('content-disposition');
  if (contentDisposition && contentDisposition.includes('attachment')) {
    return response;
  }

  return response.json();
}

export const api = {
  get: (endpoint: string) => request(endpoint, { method: 'GET' }),
  post: (endpoint: string, body: any) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body: any) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint: string) => request(endpoint, { method: 'DELETE' }),
  
  // Custom upload helper for files
  upload: (endpoint: string, formData: FormData) => {
    return request(endpoint, {
      method: 'POST',
      body: formData,
      // Let the browser set the boundary for multipart/form-data
    });
  }
};
