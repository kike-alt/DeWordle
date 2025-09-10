'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

type AuthMode = 'login' | 'signup' | 'forgot-password';

type AuthModalProps = {
  closeModal: () => void;
  initialMode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
  resetSuccess?: boolean;
};

export function AuthModal({ closeModal, initialMode = 'login', onModeChange, resetSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Sync internal mode state when initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleSwitchToSignup = () => {
    setMode('signup');
    onModeChange?.('signup');
  };

  const handleSwitchToLogin = () => {
    setMode('login');
    onModeChange?.('login');
  };

  const handleSwitchToForgotPassword = () => {
    setMode('forgot-password');
    onModeChange?.('forgot-password');
  };

  const handleSuccess = () => {
    closeModal();
  };

  return (
    <div className="min-w-[400px] px-2 max-w-md">
      <div
        className="rounded-3xl p-8 shadow-2xl"
        style={{
          background:
            'linear-gradient(135deg, #1a0b3d 0%, #2d1b69 50%, #1a0b3d 100%)',
        }}
      >
        {/* Title */}
        <div className="flex justify-between">
          <h1 className="text-4xl font-light text-white mb-12">
            {mode === 'signup' ? 'Sign Up' : mode === 'forgot-password' ? 'Forgot Password' : 'Login'}
          </h1>
          <button
            className="w-8 h-8 p-2 rounded-full bg-black items-center justify-center flex cursor-pointer border"
            onClick={closeModal}
          >
            X
          </button>
        </div>

        {/* Conditional Form Rendering */}
        {mode === 'login' ? (
          <LoginForm
            onSwitchToSignup={handleSwitchToSignup}
            onSwitchToForgotPassword={handleSwitchToForgotPassword}
            onSuccess={handleSuccess}
            resetSuccess={resetSuccess}
          />
        ) : mode === 'signup' ? (
          <SignupForm
            onSwitchToLogin={handleSwitchToLogin}
            onSuccess={handleSuccess}
          />
        ) : (
          <ForgotPasswordForm
            onSwitchToLogin={handleSwitchToLogin}
          />
        )}
      </div>
    </div>
  );
}
