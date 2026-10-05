import { authService } from '@/service/auth-service';
import { useAuthStore } from '@/store/auth-store';
import type { RequestLoginOTPPayload, VerifyLoginOTPPayload } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

export function useCurrentUser() {
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      try {
        const response = await authService.me();
        if (response.data) {
          setUser(response.data);
          return response.data;
        }
        clearAuth();
        return null;
      } catch {
        clearAuth();
        return null;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRequestLoginOTPMutation() {
  return useMutation({
    mutationFn: (payload: RequestLoginOTPPayload) => authService.requestLoginOTP(payload),
    onSuccess: () => {
      toast.success('A login code has been sent to your email.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Unable to send the login code. Please try again.');
    },
  });
}

export function useVerifyLoginOTPMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (payload: VerifyLoginOTPPayload) => authService.verifyLoginOTP(payload),
    onSuccess: (response) => {
      if (response.data) {
        setUser(response.data);
      }
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      toast.success('Signed in successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'The login code is invalid.');
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      toast.success('Signed out successfully.');
    },
    onError: () => {
      clearAuth();
      queryClient.clear();
    },
  });
}
