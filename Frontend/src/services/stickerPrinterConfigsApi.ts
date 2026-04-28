import api from './authApi';

export interface StickerPrinterConfig {
  id: number;
  stickerSize: string;
  printerIp: string;
  printerPort: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const stickerPrinterConfigsApi = {
  getAll: async (): Promise<StickerPrinterConfig[]> => {
    const response = await api.get('/stickerprinterconfigs');
    return response.data.data;
  },

  getById: async (id: number): Promise<StickerPrinterConfig> => {
    const response = await api.get(`/stickerprinterconfigs/${id}`);
    return response.data.data;
  },

  create: async (config: Omit<StickerPrinterConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<StickerPrinterConfig> => {
    const response = await api.post('/stickerprinterconfigs', config);
    return response.data.data;
  },

  update: async (id: number, config: StickerPrinterConfig): Promise<StickerPrinterConfig> => {
    const response = await api.put(`/stickerprinterconfigs/${id}`, config);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/stickerprinterconfigs/${id}`);
  },
};
