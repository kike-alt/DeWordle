'use client';

import {
  AuthResponse,
  LoginRequest,
  SignupRequest,
  UserResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '../../types/auth.entity';

const getApiUrl = (endpoint: string) => {
  const baseUrl = 'https://dewordle.onrender.com/api/v1';
  return `${baseUrl}${endpoint}`;
};

export const authApi = {
  login: async (data: LoginRequest): Promise<UserResponse> => {
    const response = await fetch(getApiUrl('/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const userData: UserResponse = await response.json();

    return userData;
  },

  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    const response = await fetch(getApiUrl('/auth/signup'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }
    const userData: AuthResponse = await response.json();

    return userData;
  },

  verify: async (token: string): Promise<{ valid: boolean }> => {
    const response = await fetch(getApiUrl('/auth/verify'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return { valid: response.ok };
  },

  logout: async (token: string): Promise<void> => {
    await fetch(getApiUrl('/auth/logout'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    const response = await fetch(getApiUrl('/auth/forgot-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send reset email');
    }

    return await response.json();
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    const response = await fetch(getApiUrl('/auth/reset-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reset password');
    }

    return await response.json();
  },
};
