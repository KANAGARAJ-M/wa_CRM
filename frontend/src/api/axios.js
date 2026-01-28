import axios from 'axios';

const api = axios.create({
    baseURL: 'http://srv1304549.hstgr.cloud/api', // Production
    // baseURL: 'http://localhost:3001/api', // Local Development
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    const companyId = localStorage.getItem('companyId');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (companyId) {
        config.headers['x-company-id'] = companyId;
    }

    return config;
});

// Response interceptor for handling auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
