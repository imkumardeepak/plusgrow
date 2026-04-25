import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export const stickersApi = {
  getTemplates: async () => {
    const response = await api.get('/stickers/templates');
    return response.data;
  },
  
  getPreview: async (data: any) => {
    const response = await api.post('/stickers/preview', data, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },
  
  generateZpl: async (data: any) => {
    const response = await api.post('/stickers/generate', data);
    return response.data.zpl;
  },

  print: async (data: any) => {
    const response = await api.post('/stickers/print', data);
    return response.data;
  },
};
