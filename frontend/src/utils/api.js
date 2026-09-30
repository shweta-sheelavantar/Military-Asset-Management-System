import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: `${API_BASE}/api/v1`,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// also intercept login specifically if it's on a different route
const authApi = axios.create({
    baseURL: `${API_BASE}/api/auth`,
});

export { api, authApi };
