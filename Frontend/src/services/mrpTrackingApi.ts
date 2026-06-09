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

export const mrpTrackingApi = {
  getTrackingReport: async (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const response = await api.get(`/mrp-tracking?${params.toString()}`);
    return response.data?.data as MrpTrackingResult[];
  }
};
