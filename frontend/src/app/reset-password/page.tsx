'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authApi } from '../../../service/api/auth';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.resetPassword({
        token,
        newPassword: formData.newPassword,
      });
      setSuccess(response.message);
      setFormData({ newPassword: '', confirmPassword: '' });

      // Redirect to home after 2 seconds with success message
      setTimeout(() => {
        router.push('/?reset=success');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-950 px-4">
      <div className="min-w-[400px] px-2 max-w-md">
        <div
          className="rounded-3xl p-8 shadow-2xl"
          style={{
            background:
              'linear-gradient(135deg, #1a0b3d 0%, #2d1b69 50%, #1a0b3d 100%)',
          }}
        >
          <h1 className="text-4xl font-light text-white mb-12">
            Reset Password
          </h1>

          {success && (
            <div className="mb-6 p-3 bg-green-500/20 border border-green-500/30 text-green-200 rounded-lg text-sm">
              {success}
              <div className="mt-2 text-xs">Redirecting to login...</div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-white text-sm mb-4">
                Enter your new password below.
              </div>

              {/* New Password input */}
              <div>
                <input
                  type="password"
                  placeholder="New Password"
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                  required
                  minLength={8}
                  className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-xl focus:border-secondary focus:ring-secondary/20 w-full px-2"
                />
              </div>

              {/* Confirm Password input */}
              <div>
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                  minLength={8}
                  className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-xl focus:border-secondary focus:ring-secondary/20 w-full px-2"
                />
              </div>

              {/* Password requirements */}
              <div className="text-gray-400 text-xs">
                Password must be at least 8 characters long.
              </div>

              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full px-2 h-14 text-lg font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
                style={{
                  background:
                    'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #9333ea 100%)',
                }}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>


              <div className="text-center">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-purple-300 text-sm hover:text-purple-200 transition-colors underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {success && (
            <div className="text-center">
              <button
                onClick={handleBackToLogin}
                className="text-purple-300 text-sm hover:text-purple-200 transition-colors underline"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-primary-950">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
