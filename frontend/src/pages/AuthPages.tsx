import React, { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Mail, User, Sparkles, CheckCircle2, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher';
import { apiRequest } from '../lib/api';
import { UserProfile } from '../types';

const AuthShell: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to HABITUDE</span>
        </Link>
        <ThemeSwitcher compact />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="max-w-md w-full mx-auto my-8 p-7 sm:p-9 rounded-3xl bg-surface border border-border shadow-apple-lg"
      >
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center font-bold text-sm">
            H
          </div>
          <div>
            <span className="font-semibold tracking-tight text-sm text-foreground block leading-none">
              HABITUDE
            </span>
            <span className="text-[11px] text-muted">
              Build a better you, one day at a time.
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-xs text-muted mt-1.5 leading-relaxed">{subtitle}</p>

        <div className="mt-6">{children}</div>
      </motion.div>

      <div className="text-center text-xs text-muted">
        HABITUDE Personal Growth & Habit Architecture
      </div>
    </div>
  );
};

export const LoginPage: React.FC = () => {
  const { loginWithToken, showToast } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      loginWithToken(res.token, res.user);
      showToast({
        title: `Welcome back, ${res.user.full_name || res.user.username}`,
        description: 'Your personal growth dashboard is ready.',
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/auth/demo-login/', {
        method: 'POST',
      });
      loginWithToken(res.token, res.user);
      showToast({
        title: 'Signed in as Alex Mercer (Demo)',
        description: 'Loaded 45 days of habits, analytics, Stoic notes, and goals.',
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Could not sign in to demo account.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in to your account"
      subtitle="Continue your daily habits, reflections, and personal analytics."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-danger-soft text-danger text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@habitude.app"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-muted">Password</label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-accent hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-muted absolute left-3.5 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>

        <div className="relative py-2 flex items-center justify-center">
          <div className="border-t border-border w-full" />
          <span className="bg-surface px-3 text-[11px] text-muted uppercase tracking-wider">
            or
          </span>
          <div className="border-t border-border w-full" />
        </div>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={demoLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-surface-secondary hover:bg-border/60 border border-border text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>
            {demoLoading
              ? 'Loading Demo Workspace...'
              : 'Explore Populated Demo Account (Alex Mercer)'}
          </span>
        </button>

        <p className="text-center text-xs text-muted pt-2">
          New to HABITUDE?{' '}
          <Link to="/register" className="text-accent font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
};

export const RegisterPage: React.FC = () => {
  const { loginWithToken, showToast } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/auth/register/', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          theme_preference: theme,
        }),
      });
      loginWithToken(res.token, res.user);
      showToast({
        title: 'Welcome to HABITUDE',
        description: 'Your personal growth workspace has been created.',
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Could not complete registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your HABITUDE account"
      subtitle="Begin building consistent habits, clear intentions, and mindful reflections."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-danger-soft text-danger text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-muted absolute left-3.5 top-3" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Mercer"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Password (minimum 8 characters)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-muted absolute left-3.5 top-3" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          {loading ? 'Creating Account...' : 'Get Started'}
        </button>

        <p className="text-center text-xs text-muted pt-2">
          Already have an account?{' '}
          <Link to="/login" className="text-accent font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ detail: string; reset_token?: string | null }>(
        '/auth/forgot-password/',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );
      setSubmitted(true);
      if (res.reset_token) {
        setGeneratedToken(res.reset_token);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email associated with your HABITUDE account to receive a reset token."
    >
      {submitted ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-success-soft text-success text-xs leading-relaxed flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Reset instructions generated</p>
              <p className="mt-1">
                If an account exists for <strong>{email}</strong>, a password reset link is ready.
              </p>
            </div>
          </div>

          {generatedToken && (
            <div className="p-4 rounded-2xl bg-surface-secondary border border-border space-y-2">
              <p className="text-xs font-semibold text-foreground">
                Direct Password Reset Link:
              </p>
              <Link
                to={`/reset-password/${generatedToken}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline break-all"
              >
                <KeyRound className="w-3.5 h-3.5 shrink-0" />
                <span>Proceed to Reset Password</span>
              </Link>
            </div>
          )}

          <Link
            to="/login"
            className="block text-center text-xs font-medium text-accent hover:underline pt-2"
          >
            Return to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-danger-soft text-danger text-xs font-medium">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@habitude.app"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
          >
            {loading ? 'Generating Link...' : 'Send Reset Link'}
          </button>
          <p className="text-center text-xs text-muted pt-2">
            Remembered your password?{' '}
            <Link to="/login" className="text-accent font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const { token: paramToken } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const { loginWithToken, showToast } = useAuth();
  const navigate = useNavigate();

  const [token, setToken] = useState(paramToken || searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>(
        '/auth/reset-password/',
        {
          method: 'POST',
          body: JSON.stringify({ token, password }),
        }
      );
      loginWithToken(res.token, res.user);
      showToast({
        title: 'Password Updated',
        description: 'You are now signed in with your new password.',
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired reset token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Enter your reset token and set a new password for your account."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-danger-soft text-danger text-xs font-medium">
            {error}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Reset Token</label>
          <input
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste reset token"
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground font-mono focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">New Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Confirm New Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground focus:outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
        >
          {loading ? 'Updating Password...' : 'Reset Password'}
        </button>
      </form>
    </AuthShell>
  );
};
