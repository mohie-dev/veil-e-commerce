import api from '../lib/api';
import type { CreateVariantPayload, ProductVariant, UpdateVariantPayload } from '../types';

export const variantsApi = {
  async createVariant(payload: CreateVariantPayload): Promise<ProductVariant> {
    return (await api.post<ProductVariant>('/variants', payload)) as unknown as ProductVariant;
  },
  async updateVariant(id: string, payload: UpdateVariantPayload): Promise<ProductVariant> {
    return (await api.patch<ProductVariant>(`/variants/${id}`, payload)) as unknown as ProductVariant;
  },
  async deleteVariant(id: string): Promise<void> {
    await api.delete(`/variants/${id}`);
  },
};
