export interface ApiResponse<T> {
  success: boolean;
  message: string;
  metadata: Metadata;
  data: T;
}

export interface Metadata {
  per_page: number;
  current_page: number;
  total_row: number;
  total_page: number;
}

export interface Converter {
  id: string;
  name: string;
  description: string | null;
  from_unit: string;
  to_unit: string;
  formula: string;
  category: string;
  is_active: boolean;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export interface ConverterListItem {
  id: string;
  name: string;
  from_unit: string;
  to_unit: string;
  category: string;
  is_active: boolean;
  image_url: string;
}
