import api from './authApi';

export interface MrpTrackingResult {
  id: number;
  poInvoiceId: number;
  productId: number;
  productName: string;
  sku: string;
  alias?: string | null;
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
  alias?: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  partyName: string | null;
  mrp: number | null;
  billedQty: number;
  quantity: number;
}

export interface MrpChange {
  productId: number;
  productName: string | null;
  sku: string | null;
  alias?: string | null;
  baseMrp: number | null;
  inwardMrp: number | null;
  difference: number | null;
  changePercent: number | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  partyName: string | null;
  billedQty: number;
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
  },

  getMrpChanges: async (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const response = await api.get(`/mrp-tracking/changes?${params.toString()}`);
    return response.data?.data as MrpChange[];
  },
};
