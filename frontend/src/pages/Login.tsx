import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Mail, Lock, ArrowRight, Building2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password);

      if (success) {
        toast({
          title: 'Welcome back!',
          description: 'You have been logged in successfully.',
        });
        navigate('/dashboard');
      } else {
        toast({
          title: 'Login failed',
          description: 'Invalid email or password. Please try again.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'company1@gmail.com', company: 'Sunrise Realtors' },
    { email: 'company2@gmail.com', company: 'GreenField Estates' },
    { email: 'company3@gmail.com', company: 'Royal Lands' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <motion.div 
        className="hidden lg:flex lg:w-1/2 bg-sidebar p-12 flex-col justify-between relative overflow-hidden"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar via-sidebar to-tenant-accent/20" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-tenant-accent flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-sidebar" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-sidebar-foreground">VENTURE BOT</h1>
              <p className="text-sidebar-muted text-sm">Marketing Platform</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold text-sidebar-foreground leading-tight">
              Transform Your Real Estate Marketing
            </h2>
            <p className="text-lg text-sidebar-muted">
              Connect with prospects instantly through WhatsApp. Manage leads, campaigns, and appointments all in one powerful platform.
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {[
              { label: 'Messages Sent', value: '2.5M+' },
              { label: 'Active Agents', value: '1,200+' },
              { label: 'Properties Sold', value: '15K+' },
              { label: 'Happy Clients', value: '98%' },
            ].map((stat, i) => (
              <div key={i} className="bg-sidebar-accent/50 backdrop-blur rounded-xl p-4">
                <p className="text-2xl font-bold text-sidebar-foreground">{stat.value}</p>
                <p className="text-sm text-sidebar-muted">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10">
          <p className="text-sidebar-muted text-sm">
            Trusted by 10+ leading real estate companies
          </p>
        </div>
      </motion.div>

      {/* Right Panel - Login Form */}
      <motion.div 
        className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold text-foreground">Welcome back</h2>
              <p className="mt-2 text-muted-foreground">
                Sign in to access your dashboard
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="text-tenant-accent underline">
                  Create one
                </Link>
              </p>
            </motion.div>
          </div>

          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="company1@gmail.com"
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 h-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Sign in
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </Button>
          </motion.form>

          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Demo Accounts</span>
              </div>
            </div>

            <div className="grid gap-2">
              {demoAccounts.map((account, i) => (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword('password123');
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{account.company}</p>
                    <p className="text-xs text-muted-foreground">{account.email}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              ))}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Use password: <code className="bg-muted px-1.5 py-0.5 rounded">password123</code> for all demo accounts
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
