import api from './authApi';

export interface StickerTemplate {
  name: string;
  size: string;
  type: 'Combined' | 'Separate' | 'Manufacture';
  fileName: string;
}

export interface StickerPreviewPayload {
  productId: number;
  manufacturerId?: number;
  importerId?: number;
  size: string;
  type: 'Combined' | 'Separate' | 'Manufacture';
  monthYear: string;
  batchNumber: string;
  note: string;
  quantity: number;
  mrp?: number | null;
}

export interface StickerPrintPayload {
  printerIp: string;
  items: Array<{
    config: StickerPreviewPayload;
    quantity: number;
  }>;
}

export const stickersApi = {
  getTemplates: async (): Promise<StickerTemplate[]> => {
    const response = await api.get<StickerTemplate[]>('/stickers/templates');
    return response.data;
  },

  getPreview: async (data: StickerPreviewPayload) => {
    const response = await api.post('/stickers/preview', data, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },

  generateZpl: async (data: StickerPreviewPayload) => {
    const response = await api.post('/stickers/generate', data);
    return response.data.zpl;
  },

  print: async (data: StickerPrintPayload) => {
    const response = await api.post('/stickers/print', data);
    return response.data;
  },
};
