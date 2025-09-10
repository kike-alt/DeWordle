'use client';

import type React from 'react';
import { useState } from 'react';
import { authApi } from '../../../service/api/auth';

type ForgotPasswordFormProps = {
  onSwitchToLogin: () => void;
};

export function ForgotPasswordForm({ onSwitchToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await authApi.forgotPassword({ email });
      setSuccess(response.message);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {success && (
        <div className="mb-6 p-3 bg-green-500/20 border border-green-500/30 text-green-200 rounded-lg text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-white text-sm mb-4">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </div>

        {/* Email input */}
        <div>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-xl focus:border-secondary focus:ring-secondary/20 w-full px-2"
          />
        </div>

        {/* Send Reset Email button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-2 h-14 text-lg font-medium rounded-xl transition-all duration-200"
          style={{
            background:
              'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #9333ea 100%)',
          }}
        >
          {isLoading ? 'Sending...' : 'Send Reset Email'}
        </button>

        {/* Back to Login */}
        <div className="text-center">
          <span className="text-white text-sm">
            Remember your password?
          </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-purple-300 text-sm hover:text-purple-200 transition-colors underline ml-1"
          >
            Back to Login
          </button>
        </div>
      </form>
    </div>
  );
}
