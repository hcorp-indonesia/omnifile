import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { converterService } from '@/service/converter-service';
import { toast } from 'sonner';

export const converterKeys = {
  all: ['converters'] as const,
  lists: () => [...converterKeys.all, 'list'] as const,
  list: (page: number, perPage: number) => [...converterKeys.lists(), { page, perPage }] as const,
  details: () => [...converterKeys.all, 'detail'] as const,
  detail: (id: string) => [...converterKeys.details(), id] as const,
};

export function useConverterList(page = 1, perPage = 10) {
  return useQuery({
    queryKey: converterKeys.list(page, perPage),
    queryFn: () => converterService.list(page, perPage),
  });
}

export function useConverterDetail(id: string) {
  return useQuery({
    queryKey: converterKeys.detail(id),
    queryFn: () => converterService.getById(id),
    enabled: !!id,
  });
}

export function useCreateConverter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => converterService.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: converterKeys.lists() });
      toast.success('Converter created successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    },
  });
}

export function useUpdateConverter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      converterService.update(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: converterKeys.all });
      toast.success('Converter updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    },
  });
}

export function useDeleteConverter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => converterService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: converterKeys.lists() });
      toast.success('Converter deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    },
  });
}
