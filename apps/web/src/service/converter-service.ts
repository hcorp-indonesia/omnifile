import { api } from '@/lib/api';
import type { ApiResponse, ConverterListItem, Converter } from '@/types';

export const converterService = {
  list: async (page = 1, perPage = 10) => {
    const { data } = await api.get<ApiResponse<ConverterListItem[]>>('/converters', {
      params: { page, per_page: perPage },
    });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<Converter>>(`/converters/${id}`);
    return data;
  },

  create: async (formData: FormData) => {
    const { data } = await api.post<ApiResponse<null>>('/converters', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  update: async (id: string, formData: FormData) => {
    const { data } = await api.put<ApiResponse<null>>(`/converters/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete<ApiResponse<null>>(`/converters/${id}`);
    return data;
  },
};
