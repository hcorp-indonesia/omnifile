import { api } from '@/lib/api';
import type {
  ApiResponse,
  RequestLoginOTPPayload,
  RequestLoginOTPResult,
  User,
  VerifyLoginOTPPayload,
} from '@/types';

export const authService = {
  requestLoginOTP: async (payload: RequestLoginOTPPayload) => {
    const { data } = await api.post<ApiResponse<RequestLoginOTPResult>>(
      '/auth/request-otp',
      payload,
    );
    return data;
  },

  verifyLoginOTP: async (payload: VerifyLoginOTPPayload) => {
    const { data } = await api.post<ApiResponse<User>>('/auth/verify-otp', payload);
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
