// pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Mail, Lock, ArrowRight, Eye, EyeOff,
  GitBranch, Shield, BarChart3,
} from 'lucide-react';
import { useAuth }  from '@/contexts/AuthContext';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

// ─── Static content ───────────────────────────────────────────────────────────

const BRAND = {
  name:    'VaartaBot',
  tagline: 'Lead Management Platform',
  hero:    'Manage leads. Connect tools. Close faster.',
  sub:     'Centralise your leads, track every interaction, and integrate with any software — all from one dashboard.',
  trust:   'Trusted by growing businesses across India',
};

const STATS = [
  { label: 'Leads Managed',     value: '1.2M+' },
  { label: 'Active Businesses', value: '500+'  },
  { label: 'API Integrations',  value: '40+'   },
  { label: 'Conversion Uplift', value: '3.2x'  },
];

const FEATURES = [
  { icon: Users,     text: 'Centralised lead inbox from all sources' },
  { icon: BarChart3, text: 'Real-time pipeline analytics'            },
  { icon: Shield,    text: 'Role-based access & secure workspaces'   },
];

// ─── Component ────────────────────────────────────────────────────────────────

const Login: React.FC = () => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);

  const { login }    = useAuth();
  const navigate     = useNavigate();
  const { toast }    = useToast();

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast({
        title:       'Missing fields',
        description: 'Please enter your email and password.',
        variant:     'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email.trim().toLowerCase(), password);

      if (success) {
        toast({
          title:       'Welcome back!',
          description: 'Signed in successfully.',
        });
        navigate('/dashboard');
      } else {
        toast({
          title:       'Sign in failed',
          description: 'Invalid email or password. Please try again.',
          variant:     'destructive',
        });
      }
    } catch {
      toast({
        title:       'Something went wrong',
        description: 'Please check your connection and try again.',
        variant:     'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">

      {/* ════════════════════════════════════════
          LEFT PANEL — Branding
      ════════════════════════════════════════ */}
      <motion.div
        className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12 relative overflow-hidden"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar via-sidebar to-tenant-accent/20 pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-tenant-accent flex items-center justify-center shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-sidebar-foreground tracking-tight">{BRAND.name}</p>
            <p className="text-xs text-sidebar-muted">{BRAND.tagline}</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-8">
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold text-sidebar-foreground leading-tight">{BRAND.hero}</h2>
            <p className="text-sidebar-muted text-lg leading-relaxed">{BRAND.sub}</p>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-tenant-accent/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-tenant-accent" />
                </div>
                <span className="text-sidebar-muted text-sm">{text}</span>
              </div>
            ))}
          </motion.div>

          {/* Stats strip */}
          <motion.div
            className="grid grid-cols-2 gap-3 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.5 }}
          >
            {STATS.map(s => (
              <div key={s.label} className="bg-sidebar-accent/50 border border-sidebar-border rounded-xl p-3">
                <p className="text-lg font-bold text-sidebar-foreground">{s.value}</p>
                <p className="text-[11px] text-sidebar-muted">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Trust line */}
        <div className="relative z-10">
          <p className="text-sidebar-muted text-sm">{BRAND.trust}</p>
        </div>
      </motion.div>

      {/* ════════════════════════════════════════
          RIGHT PANEL — Login form
      ════════════════════════════════════════ */}
      <motion.div
        className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <div className="w-full max-w-md space-y-8">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-tenant-accent flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <p className="text-lg font-bold text-foreground">{BRAND.name}</p>
          </div>

          {/* Heading */}
          <motion.div
            className="space-y-1"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
          >
            <h2 className="text-3xl font-bold text-foreground">Sign in</h2>
            <p className="text-muted-foreground">Access your {BRAND.name} dashboard</p>
            <p className="text-sm text-muted-foreground pt-1">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-tenant-accent hover:underline font-medium">
                Create one free
              </Link>
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.45 }}
            noValidate
          >
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-10 h-12"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-tenant-accent transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-11 h-12"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground font-semibold text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </motion.form>

          {/* Footer */}
          <motion.p
            className="text-center text-xs text-muted-foreground leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            By signing in, you agree to our{' '}
            <Link to="/terms"   className="hover:text-tenant-accent underline underline-offset-2">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="hover:text-tenant-accent underline underline-offset-2">Privacy Policy</Link>.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
