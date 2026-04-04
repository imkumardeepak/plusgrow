import React, { useState, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Logo } from '../components/atoms/Logo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2, Crown } from 'lucide-react';
import { cn } from '../lib/utils';
import { SUPERADMIN_CONFIG } from '../config/superadmin';

export const Login = memo(function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    const result = await login({ username: username.trim(), password });

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message || 'Login failed');
    }
    setIsLoading(false);
  };

  const handleSuperadminLogin = async () => {
    setError('');
    setIsLoading(true);
    const result = await login({ 
      username: SUPERADMIN_CONFIG.username, 
      password: SUPERADMIN_CONFIG.password 
    });

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message || 'Superadmin login failed');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-brand-50/30 to-neutral-100 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-100/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-200/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Logo width={200} height={200} />
          </div>
          <h1 className="text-2xl font-heading font-bold text-neutral-900">Welcome Back</h1>
          <p className="text-neutral-500 mt-1">Sign in to continue to Plusgrow WMS</p>
        </div>

        <Card variant="elevated" className="shadow-xl border-neutral-200/50">
          <CardHeader className="pb-4">
            <CardTitle size="md" className="text-center">Sign In</CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Username */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-neutral-700">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <User className="w-5 h-5" />
                  </div>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-12"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
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
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              {/* Register link */}
              <div className="text-center pt-2">
                <p className="text-sm text-neutral-500">
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    Create Account
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Superadmin Quick Login */}
        <Card variant="elevated" className="mt-4 shadow-md border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="py-4">
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSuperadminLogin}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    Login as Superadmin
                  </>
                )}
              </button>
              <p className="text-xs text-neutral-500 text-center">
                <span className="font-semibold text-amber-700">Superadmin Credentials:</span>
                <br />
                Username: <code className="bg-amber-100 px-1 rounded text-amber-800">{SUPERADMIN_CONFIG.username}</code> | Password: <code className="bg-amber-100 px-1 rounded text-amber-800">{SUPERADMIN_CONFIG.password}</code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card variant="elevated" className="mt-4 shadow-md border-neutral-200/50">
          <CardContent className="py-4">
            <p className="text-xs text-neutral-500 text-center">
              <span className="font-semibold text-neutral-600">Demo Credentials:</span>
              <br />
              Username: <code className="bg-neutral-100 px-1 rounded">admin</code> | Password: <code className="bg-neutral-100 px-1 rounded">admin123</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default Login;
