import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://vaartabot.com',
    withCredentials: true,
});

// Attach token from localStorage on every request (safe for Safari Private)
function lsGet(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
}
function lsRemove(key: string) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
}

api.interceptors.request.use((config) => {
    const token = lsGet('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            lsRemove('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;