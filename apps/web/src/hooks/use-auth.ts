import { authService } from "@/service/auth-service";
import { useAuthStore } from "@/store/auth-store";
import type { GoogleAuthPayload, LoginPayload, RegisterPayload } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

export function useCurrentUser() {
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      try {
        const res = await authService.me();
        if (res.data) {
          setUser(res.data);
          return res.data;
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

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: (res) => {
      if (res.data) {
        setUser(res.data);
      }
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      toast.success("Registration successful! Welcome to OmniFile.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Something went wrong. Please try again.");
    },
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (res) => {
      if (res.data) {
        setUser(res.data);
      }
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      toast.success("Signed in successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Something went wrong. Please try again.");
    },
  });
}

export function useGoogleAuthMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (payload: GoogleAuthPayload) => authService.googleAuth(payload),
    onSuccess: (res) => {
      if (res.data) {
        setUser(res.data);
      }
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      toast.success("Signed in with Google successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Something went wrong. Please try again.");
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
      toast.success("Signed out successfully.");
    },
    onError: () => {
      clearAuth();
      queryClient.clear();
    },
  });
}
