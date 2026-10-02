import { api } from '@/lib/api';
import type { ApiResponse, User, RegisterPayload, LoginPayload, GoogleAuthPayload } from '@/types';

export const authService = {
  requestPasswordReset: async (payload: { email: string }) => {
    const { data } = await api.post<ApiResponse<null>>('/auth/password-reset/request', payload);
    return data;
  },

  resetPassword: async (payload: { token: string; new_password: string; confirm_password: string }) => {
    const { data } = await api.post<ApiResponse<null>>('/auth/password-reset/confirm', payload);
    return data;
  },

  register: async (payload: RegisterPayload) => {
    const { data } = await api.post<ApiResponse<User>>('/auth/register', payload);
    return data;
  },

  login: async (payload: LoginPayload) => {
    const { data } = await api.post<ApiResponse<User>>('/auth/login', payload);
    return data;
  },

  googleAuth: async (payload: GoogleAuthPayload) => {
    const { data } = await api.post<ApiResponse<User>>('/auth/google', payload);
    return data;
  },

  me: async () => {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    return data;
  },

  refresh: async () => {
    const { data } = await api.post<ApiResponse<User>>('/auth/refresh');
    return data;
  },

  logout: async () => {
    const { data } = await api.post<ApiResponse<null>>('/auth/logout');
    return data;
  },
};
