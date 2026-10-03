import { createRoot } from "react-dom/client";
import axios from 'axios';
import App from "./App.tsx";
import "./index.css";

axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://vaartabot.com';
axios.defaults.withCredentials = true;

// Global interceptor for raw axios calls — safe for Safari Private Browsing
axios.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch { /* localStorage blocked (Safari Private) — cookie auth still works */ }
    return config;
});

createRoot(document.getElementById("root")!).render(<App />);// Redirect to login on 401
axios.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
            try { localStorage.removeItem('token'); } catch { /* ignore */ }
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

