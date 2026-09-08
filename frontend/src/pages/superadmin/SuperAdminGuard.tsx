// src/pages/superadmin/SuperAdminGuard.tsx
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { RefreshCw, Crown } from 'lucide-react';
import axios from 'axios';

const SuperAdminGuard: React.FC = () => {
    const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking');

    useEffect(() => {
        const token = localStorage.getItem('sa_token');
        if (!token) { setStatus('denied'); return; }

        // Verify token is still valid + user is still superadmin
        axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(({ data }) => {
                if (data.user?.is_superadmin) setStatus('allowed');
                else setStatus('denied');
            })
            .catch(() => {
                localStorage.removeItem('sa_token');
                localStorage.removeItem('sa_user');
                setStatus('denied');
            });
    }, []);

    if (status === 'checking') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
                <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-yellow-600" />
                </div>
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (status === 'denied') {
        return <Navigate to="/superadmin/login" replace />;
    }

    return <Outlet />;
};

export default SuperAdminGuard;