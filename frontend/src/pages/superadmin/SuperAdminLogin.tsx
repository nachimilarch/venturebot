// src/pages/superadmin/SuperAdminLogin.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '@/lib/superAdminAxios';
import { Crown, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const SuperAdminLogin: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { data } = await axios.post('/api/auth/login', { email, password });

            if (!data.success) throw new Error(data.error);
            if (!data.user?.is_superadmin) {
                toast.error('Access denied. Superadmin only.');
                return;
            }

            // Store superadmin token separately so it doesn't clash with tenant sessions
            localStorage.setItem('sa_token', data.token);
            localStorage.setItem('sa_user', JSON.stringify(data.user));
            toast.success('Welcome back! 👋');
            navigate('/superadmin/dashboard');
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-sm">

                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-100 flex items-center justify-center mb-3">
                        <Crown className="w-7 h-7 text-yellow-600" />
                    </div>
                    <h1 className="text-xl font-bold text-foreground">Super Admin</h1>
                    <p className="text-sm text-muted-foreground mt-1">VaartaBot Control Panel</p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="bg-card border border-border rounded-2xl p-6 space-y-4">
                    <div>
                        <Label className="text-xs font-medium mb-1.5 block">Email</Label>
                        <Input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@yourdomain.com"
                            className="h-10"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <Label className="text-xs font-medium mb-1.5 block">Password</Label>
                        <div className="relative">
                            <Input
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="h-10 pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <Button
                        type="submit"
                        className="w-full h-10 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
                        disabled={isLoading}
                    >
                        {isLoading
                            ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                            : <><Crown className="w-4 h-4 mr-2" /> Sign In</>
                        }
                    </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground mt-4">
                    This area is restricted to system administrators only
                </p>
            </div>
        </div>
    );
};

export default SuperAdminLogin;