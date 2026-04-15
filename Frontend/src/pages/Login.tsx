import React, { memo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Crown,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/atoms/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Input } from '../components/atoms/Input';
import { Logo } from '../components/atoms/Logo';
import { SUPERADMIN_CONFIG } from '../config/superadmin';

const DEMO_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
} as const;

export const Login = memo(function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = async (
    credentials: { username: string; password: string },
    fallbackMessage: string
  ) => {
    setError('');
    setIsLoading(true);

    const result = await login(credentials);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message || fallbackMessage);
    }

    setIsLoading(false);
  };

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

  const fillCredentials = (credentials: { username: string; password: string }) => {
    setUsername(credentials.username);
    setPassword(credentials.password);
    setError('');
  };

  const handleSuperadminLogin = async () => {
    await handleQuickLogin(
      {
        username: SUPERADMIN_CONFIG.username,
        password: SUPERADMIN_CONFIG.password,
      },
      'Superadmin login failed'
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(123,189,232,0.2),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef5f8_45%,_#f5f8fb_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-brand-200/40 to-transparent lg:block" />
        <div className="absolute -left-16 top-24 h-64 w-64 rounded-full bg-brand-200/25 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-brand-100/70 blur-3xl" />
        <div className="absolute bottom-0 right-24 h-56 w-56 rounded-full bg-brand-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg">
          <Card
            variant="elevated"
            className="overflow-hidden border-white/70 bg-white/90 shadow-[0_28px_60px_-20px_rgba(15,23,42,0.24)] backdrop-blur-xl"
          >
            <div className="h-1.5 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-700" />

            <CardHeader className="border-b border-neutral-100 px-6 pb-5 pt-6 sm:px-8" divider={false}>
              <div className="space-y-3">
                <div className="flex justify-center">
                  <Logo width={160} height={160} className="h-auto w-36" />
                </div>
                <div>
                  <CardTitle size="lg" className="text-center text-2xl font-heading">
                    Welcome back
                  </CardTitle>
                  <p className="mt-2 text-center text-sm leading-6 text-neutral-500">
                    Enter your credentials to continue to the Plusgrow warehouse command center.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-2 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Input
                  id="username"
                  label="Username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  size="lg"
                  leftElement={<User className="h-5 w-5" />}
                />

                <Input
                  id="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  size="lg"
                  leftElement={<Lock className="h-5 w-5" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="rounded-md p-1 text-neutral-400 transition-colors hover:text-neutral-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  }
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  className="mt-2 font-semibold shadow-brand-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Continue to dashboard
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Quick access</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      Use the built-in admin helpers for faster local testing.
                    </p>
                  </div>
                  <div className="hidden rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 sm:block">
                    Local only
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                          <Crown className="h-4 w-4" />
                          Superadmin access
                        </div>
                        <p className="mt-1 text-xs leading-5 text-amber-800/80">
                          Username <code className="rounded bg-white/70 px-1.5 py-0.5">{SUPERADMIN_CONFIG.username}</code> and password <code className="rounded bg-white/70 px-1.5 py-0.5">{SUPERADMIN_CONFIG.password}</code>
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSuperadminLogin}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                        Instant login
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">Demo account</p>
                        <p className="mt-1 text-xs leading-5 text-neutral-500">
                          Username <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-700">{DEMO_CREDENTIALS.username}</code> and password <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-700">{DEMO_CREDENTIALS.password}</code>
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fillCredentials(DEMO_CREDENTIALS)}
                      >
                        Fill credentials
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-neutral-100 pt-5 text-center">
                <p className="text-sm text-neutral-500">
                  Don&apos;t have an account?{' '}
                  <Link
                    to="/register"
                    className="font-semibold text-brand-600 transition-colors hover:text-brand-700 hover:underline"
                  >
                    Create Account
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

export default Login;
