// pages/Register.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Mail, Lock, Building2,
  ArrowRight, Eye, EyeOff, CheckCircle2, User,
  GitBranch, Filter, BarChart3,
} from 'lucide-react';
import { useAuth }    from '@/contexts/AuthContext';
import { Button }     from '@/components/ui/button';
import { Input }      from '@/components/ui/input';
import { Label }      from '@/components/ui/label';
import { useToast }   from '@/hooks/use-toast';
import { cn }         from '@/lib/utils';

// ─── Static content ───────────────────────────────────────────────────────────

const BRAND = {
  name:    'VaartaBot',
  tagline: 'Lead Management Platform',
  hero:    'Start managing leads smarter.',
  sub:     'Create your workspace and connect your lead sources. Your pipeline can be live in minutes.',
  trust:   'No credit card required to get started',
};

const PERKS = [
  'Centralised lead inbox from all sources',
  'Drag-and-drop pipeline management',
  'Automated follow-up reminders',
  'Real-time analytics & conversion reports',
];

// ─── Password strength ────────────────────────────────────────────────────────

function getPasswordStrength(pw: string) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: 'Too short', color: 'bg-red-500'    },
    { label: 'Weak',      color: 'bg-orange-400' },
    { label: 'Fair',      color: 'bg-yellow-400' },
    { label: 'Good',      color: 'bg-blue-500'   },
    { label: 'Strong',    color: 'bg-green-500'  },
  ];
  return { score, ...map[score] };
}

// ─── Component ────────────────────────────────────────────────────────────────

const Register: React.FC = () => {
  const [name, setName]                   = useState('');
  const [businessName, setBusinessName]   = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [isLoading, setIsLoading]         = useState(false);

  const { register } = useAuth();
  const navigate     = useNavigate();
  const { toast }    = useToast();

  const pwStrength = getPasswordStrength(password);

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!name.trim())                 return 'Please enter your full name.';
    if (!businessName.trim())         return 'Please enter your business name.';
    if (!email.trim())                return 'Please enter your email address.';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Please enter a valid email address.';
    if (password.length < 8)         return 'Password must be at least 8 characters.';
    if (pwStrength.score < 2)        return 'Please choose a stronger password.';
    return null;
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      toast({ title: 'Check your details', description: validationError, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const success = await register(
        name.trim(),
        email.trim().toLowerCase(),
        password,
        businessName.trim(),
      );

      if (success) {
        toast({
          title:       'Account created!',
          description: 'Welcome to VaartaBot. Let us set up your workspace.',
        });
        navigate('/dashboard');
      } else {
        toast({
          title:       'Registration failed',
          description: 'This email may already be in use. Try signing in instead.',
          variant:     'destructive',
        });
      }
    } catch (err: any) {
      const serverMsg = err?.response?.data?.error;
      toast({
        title:       'Registration failed',
        description: serverMsg || 'Please check your connection and try again.',
        variant:     'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — Branding ── */}
      <motion.div
        className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12 relative overflow-hidden"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
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
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold text-sidebar-foreground leading-tight">{BRAND.hero}</h2>
            <p className="text-sidebar-muted text-lg leading-relaxed">{BRAND.sub}</p>
          </motion.div>

          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {PERKS.map(perk => (
              <div key={perk} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-tenant-accent shrink-0" />
                <span className="text-sidebar-muted text-sm">{perk}</span>
              </div>
            ))}
          </motion.div>

          {/* Mini feature icons */}
          <motion.div
            className="flex gap-4 pt-2"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.5 }}
          >
            {[
              { icon: Filter,    label: 'Segment'  },
              { icon: GitBranch, label: 'Integrate' },
              { icon: BarChart3, label: 'Analyse'  },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-xl bg-sidebar-accent/60 border border-sidebar-border flex items-center justify-center">
                  <Icon className="w-4 h-4 text-tenant-accent" />
                </div>
                <span className="text-[11px] text-sidebar-muted">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10 space-y-2">
          <p className="text-sidebar-muted text-sm">{BRAND.trust}</p>
          <p className="text-sidebar-muted text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-tenant-accent hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>

      {/* ── Right panel — Form ── */}
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
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
          >
            <h2 className="text-3xl font-bold text-foreground">Create your account</h2>
            <p className="text-muted-foreground">
              Set up your {BRAND.name} workspace in under 2 minutes
            </p>
            <p className="text-sm text-muted-foreground pt-1">
              Already have an account?{' '}
              <Link to="/login" className="text-tenant-accent hover:underline font-medium">Sign in</Link>
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-5"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.45 }}
            noValidate
          >

            {/* Full name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  className="pl-10 h-12"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Business name */}
            <div className="space-y-2">
              <Label htmlFor="businessName">
                Business Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="businessName"
                  type="text"
                  autoComplete="organization"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="Acme Corp, City Clinic..."
                  className="pl-10 h-12"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email address <span className="text-destructive">*</span></Label>
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
              <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
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

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors duration-300',
                          i <= pwStrength.score ? pwStrength.color : 'bg-muted'
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Strength:{' '}
                    <span className={cn(
                      'font-medium',
                      pwStrength.score <= 1 && 'text-red-500',
                      pwStrength.score === 2 && 'text-yellow-500',
                      pwStrength.score === 3 && 'text-blue-500',
                      pwStrength.score === 4 && 'text-green-500',
                    )}>
                      {pwStrength.label}
                    </span>
                    {pwStrength.score < 3 && (
                      <span className="text-muted-foreground"> · Add uppercase, numbers or symbols</span>
                    )}
                  </p>
                </div>
              )}
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
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create account <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            {/* Legal */}
            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link to="/terms"   className="hover:text-tenant-accent underline underline-offset-2">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="hover:text-tenant-accent underline underline-offset-2">Privacy Policy</Link>.
            </p>
          </motion.form>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
