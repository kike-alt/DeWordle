'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

type AuthMode = 'login' | 'signup';

type AuthModalProps = {
  closeModal: () => void;
  initialMode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
};

export function AuthModal({ closeModal, initialMode = 'login', onModeChange }: AuthModalProps) {
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
            {mode === 'signup' ? 'Sign Up' : 'Login'}
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
            onSuccess={handleSuccess}
          />
        ) : (
          <SignupForm
            onSwitchToLogin={handleSwitchToLogin}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </div>
  );
}
