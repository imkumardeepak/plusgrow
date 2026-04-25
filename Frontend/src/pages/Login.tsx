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
  ShieldCheck,
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
    <div className="theme-shell relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="theme-grid-bg absolute inset-x-0 top-0 h-[52vh] opacity-20" />
        <div className="absolute left-[-8rem] top-16 h-72 w-72 rounded-full bg-brand-500/16 blur-[130px]" />
        <div className="absolute right-[-4rem] top-8 h-80 w-80 rounded-full bg-brand-300/12 blur-[130px]" />
        <div className="absolute bottom-[-8rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-500/10 blur-[150px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="theme-hero hidden min-h-[680px] overflow-hidden lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(17,167,223,0.22),transparent_26%)]" />
            <div className="relative border-b border-white/6 px-10 py-8">
              <div className="flex items-center justify-between gap-4">
                <Logo width={180} height={180} className="h-auto w-44" />
                <div className="theme-pill text-sm font-semibold text-neutral-100">
                  <ShieldCheck className="h-4 w-4 text-brand-300" />
                  Secure WMS Access
                </div>
              </div>
            </div>

            <div className="relative flex-1 px-10 py-12">
              <div className="mx-auto max-w-xl text-center">
                <div className="theme-glow mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-brand-300/25 bg-gradient-to-br from-brand-300 to-brand-500">
                  <ShieldCheck className="h-10 w-10 text-slate-950" />
                </div>
                <h1 className="mt-8 text-5xl font-extrabold tracking-tight text-white">
                  Warehouse Command
                  <span className="block text-gradient-ocean">Center</span>
                </h1>
                <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-neutral-200/88">
                  Operate PlusGrow inbound, storage, and dispatch workflows from a single premium control surface inspired by your reference theme.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-neutral-300">
                  <span className="theme-pill">Live inventory visibility</span>
                  <span className="theme-pill">Process approvals</span>
                  <span className="theme-pill">Operator role access</span>
                </div>
              </div>
            </div>

            <div className="relative grid grid-cols-3 gap-4 border-t border-white/6 px-10 py-8">
              {[
                ['Receiving', 'Track intake volumes and warehouse arrivals'],
                ['Put Away', 'Route stock to the right mapped zones'],
                ['Dispatch', 'Monitor outbound execution in real time'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="w-full">
            <Card
              variant="elevated"
              className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(18,29,46,0.95)_0%,rgba(10,18,32,0.98)_100%)] shadow-float backdrop-blur-xl"
            >
              <div className="h-1.5 bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500" />

              <CardHeader className="px-6 pb-5 pt-6 sm:px-8" divider={false}>
                <div className="space-y-4">
                  <div className="flex justify-center lg:hidden">
                    <Logo width={160} height={160} className="h-auto w-36" />
                  </div>
                  <div className="flex justify-center">
                    <div className="theme-glow flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[24px] border border-brand-300/25 bg-gradient-to-br from-brand-300 to-brand-500">
                      <ShieldCheck className="h-8 w-8 text-slate-950" />
                    </div>
                  </div>
                  <div>
                    <CardTitle size="lg" className="text-center text-3xl font-heading">
                      Admin Login
                    </CardTitle>
                    <p className="mt-2 text-center text-sm leading-6 text-neutral-300">
                      Sign in to continue to the PlusGrow warehouse control environment.
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="animate-in fade-in slide-in-from-top-2 flex items-start gap-2 rounded-[22px] border border-danger-500/25 bg-danger-500/10 px-4 py-3 text-sm text-danger-200">
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
                  className="theme-input"
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
                  className="theme-input"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="rounded-md p-1 text-neutral-300/70 transition-colors hover:text-white"
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

              <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Quick access</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-300">
                      Use the built-in admin helpers for faster local testing.
                    </p>
                  </div>
                  <div className="hidden rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-200 sm:block">
                    Local only
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-[22px] border border-amber-400/20 bg-gradient-to-r from-amber-500/12 to-orange-500/10 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                          <Crown className="h-4 w-4" />
                          Superadmin access
                        </div>
                        <p className="mt-1 text-xs leading-5 text-amber-100/80">
                          Username <code className="rounded bg-white/10 px-1.5 py-0.5">{SUPERADMIN_CONFIG.username}</code> and password <code className="rounded bg-white/10 px-1.5 py-0.5">{SUPERADMIN_CONFIG.password}</code>
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSuperadminLogin}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:from-amber-300 hover:to-orange-400"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                        Instant login
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">Demo account</p>
                        <p className="mt-1 text-xs leading-5 text-neutral-300">
                          Username <code className="rounded bg-white/10 px-1.5 py-0.5 text-white">{DEMO_CREDENTIALS.username}</code> and password <code className="rounded bg-white/10 px-1.5 py-0.5 text-white">{DEMO_CREDENTIALS.password}</code>
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

              <div className="mt-6 border-t border-white/10 pt-5 text-center">
                <p className="text-sm text-neutral-300">
                  Don&apos;t have an account?{' '}
                  <Link
                    to="/register"
                    className="font-semibold text-brand-200 transition-colors hover:text-brand-100 hover:underline"
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
    </div>
  );
});

export default Login;
