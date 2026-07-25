'use client';

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFocusTrap } from '@/lib/accessibility';

type ModalProps = {
  closeModal: () => void;
};
export function LoginForm({ closeModal }: ModalProps) {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useFocusTrap(true, containerRef);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignup) {
        await signup(formData.email, formData.password, formData.username);
      } else {
        await login(formData.email, formData.password);
        closeModal();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formId = isSignup ? 'signup-form' : 'login-form';

  return (
    <div className="min-w-[400px] px-2 max-w-md w-full sm:w-auto">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        className="rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-[calc(100vw-2rem)] sm:max-w-md"
        style={{
          background:
            'linear-gradient(135deg, #1a0b3d 0%, #2d1b69 50%, #1a0b3d 100%)',
        }}
      >
        <div className="flex justify-between">
          <h1 id={`${formId}-title`} className="text-4xl font-light text-white mb-12">
            {isSignup ? 'Sign Up' : 'Login'}
          </h1>
          <button
            type="button"
            aria-label="Close dialog"
            className="w-8 h-8 p-2 rounded-full bg-black items-center justify-center flex cursor-pointer border focus:outline-none focus:ring-2 focus:ring-white/60 touch-target"
            onClick={() => closeModal()}
          >
            <span aria-hidden="true">&#x2715;</span>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-6 p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm"
          >
            {error}
          </div>
        )}

        <form id={formId} onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="Email Address"
              autoComplete="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              aria-required="true"
              className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-xl focus:border-secondary focus:ring-secondary/20 w-full px-2"
            />
          </div>

          {isSignup && (
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                placeholder="Username"
                autoComplete="username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
                aria-required="true"
                className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-xl focus:border-secondary focus:ring-secondary/20 w-full px-2"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              aria-required="true"
              className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-xl focus:border-secondary focus:ring-secondary/20 w-full px-2"
            />
          </div>

          {!isSignup && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="border-white/30 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                />
                <label htmlFor="remember" className="text-white text-sm">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                className="text-white text-sm hover:text-purple-300 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-300 focus:underline rounded"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            aria-disabled={isLoading}
            className="w-full px-2 h-14 text-lg font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 touch-target"
            style={{
              background:
                'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #9333ea 100%)',
            }}
          >
            {isLoading ? 'Loading\u2026' : isSignup ? 'Sign Up' : 'Login'}
          </button>

          <div className="text-center">
            <span className="text-white text-sm">
              {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            </span>
            <button
              type="button"
              onClick={() => setIsSignup(!isSignup)}
              className="text-purple-300 text-sm hover:text-purple-200 transition-colors underline focus:outline-none focus:ring-1 focus:ring-purple-300 rounded"
            >
              {isSignup ? 'Login' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="my-8" aria-hidden="true">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full px-2 border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-white">
                Continue with
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Continue with Google"
          className="w-full px-2 h-14 bg-transparent border border-white/20 text-white hover:bg-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/60 touch-target"
          onClick={() => {
            console.log('Google login clicked');
          }}
        >
          <div className="flex items-center justify-center space-x-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-lg">Google</span>
          </div>
        </button>
      </div>
    </div>
  );
}
