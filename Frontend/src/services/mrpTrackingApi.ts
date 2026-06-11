import api from './authApi';

export interface MrpTrackingResult {
  id: number;
  poInvoiceId: number;
  productId: number;
  productName: string;
  sku: string;
  invoiceNumber: string;
  invoiceDate: string;
  mrp: number | null;
  locationCode: string;
  quantity: number;
}

export interface MrpWiseStockSummary {
  productId: number;
  productName: string;
  sku: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  mrp: number | null;
  quantity: number;
}

export const mrpTrackingApi = {
  getTrackingReport: async (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const response = await api.get(`/mrp-tracking?${params.toString()}`);
    return response.data?.data as MrpTrackingResult[];
  },

  getMrpWiseStockSummary: async (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const response = await api.get(`/mrp-tracking/summary?${params.toString()}`);
    return response.data?.data as MrpWiseStockSummary[];
  }
};
