// src/lib/superAdminAxios.ts
// Separate axios instance that uses sa_token, not the tenant token
import axios from 'axios';

const saAxios = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    withCredentials: true,
});

saAxios.interceptors.request.use((config) => {
    const token = localStorage.getItem('sa_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

saAxios.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('sa_token');
            localStorage.removeItem('sa_user');
            window.location.href = '/superadmin/login';
        }
        return Promise.reject(error);
    }
);

export default saAxios;