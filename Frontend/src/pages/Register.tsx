import React, { useState, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Logo } from '../components/atoms/Logo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Eye, EyeOff, Lock, User, Mail, Phone, AlertCircle, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';

export const Register = memo(function Register() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    email: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    const result = await register({
      username: formData.username.trim(),
      password: formData.password,
      fullName: formData.fullName.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
    });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setError(result.message || 'Registration failed');
    }
    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="theme-shell flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md relative z-10 text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-success-400/30 -/">
            <CheckCircle2 className="h-8 w-8 text-success-300" />
          </div>
          <h2 className="mb-2 text-2xl font-heading font-bold text-white">Registration Successful!</h2>
          <p className="mb-6 text-neutral-300">Redirecting you to login page...</p>
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="theme-shell flex min-h-screen items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="theme-grid-bg absolute inset-x-0 top-0 h-[48vh] opacity-20" />
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full -/ blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-4">
            <Logo width={160} height={160} />
          </div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-brand-300/20 bg-gradient-to-br from-brand-300 to-brand-500 shadow-brand">
            <ShieldCheck className="h-7 w-7 text-slate-950" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white">Create Account</h1>
          <p className="mt-1 text-neutral-300">Join PlusGrow WMS with the new premium control theme</p>
        </div>

        <Card variant="elevated" className="border-white/10 bg-[linear-gradient(180deg,rgba(18,29,46,0.95)_0%,rgba(10,18,32,0.98)_100%)] shadow-float">
          <CardHeader className="pb-4">
            <CardTitle size="md" className="text-center">Register</CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error message */}
              {error && (
                <div className="animate-in fade-in slide-in-from-top-2 flex items-center gap-2 rounded-2xl border border-danger-500/20 -/ p-3 text-sm text-danger-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Username */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-neutral-100">
                  Username <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300/60">
                    <User className="w-5 h-5" />
                  </div>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={handleChange}
                    className="theme-input h-11 pl-10"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-medium text-neutral-100">
                  Full Name <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300/60">
                    <User className="w-5 h-5" />
                  </div>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="theme-input h-11 pl-10"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-neutral-100">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300/60">
                    <Mail className="w-5 h-5" />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email (optional)"
                    value={formData.email}
                    onChange={handleChange}
                    className="theme-input h-11 pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-100">
                  Phone
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300/60">
                    <Phone className="w-5 h-5" />
                  </div>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Enter your phone (optional)"
                    value={formData.phone}
                    onChange={handleChange}
                    className="theme-input h-11 pl-10"
                    autoComplete="tel"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-neutral-100">
                  Password <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300/60">
                    <Lock className="w-5 h-5" />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                    className="theme-input h-11 pl-10 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300/60 transition-colors hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-neutral-300/70">Must be at least 6 characters</p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-100">
                  Confirm Password <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300/60">
                    <Lock className="w-5 h-5" />
                  </div>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="theme-input h-11 pl-10"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              {/* Login link */}
              <div className="text-center pt-2">
                <p className="text-sm text-neutral-300">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-brand-200 hover:text-brand-100 hover:underline"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default Register;
