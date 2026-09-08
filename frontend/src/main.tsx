import { createRoot } from "react-dom/client";
import axios from 'axios';
import App from "./App.tsx";
import "./index.css";

axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://vaartabot.com';
axios.defaults.withCredentials = true;

// Global interceptor for raw axios calls
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

createRoot(document.getElementById("root")!).render(<App />);