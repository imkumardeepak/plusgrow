import { initialProducts, initialCustomers, initialPurchaseInvoices, initialSalesInvoices, initialStock, initialActivities } from './mockData';
import { Product, Customer, PurchaseInvoice, SalesInvoice, Stock, Activity } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApi = {
  getProducts: async (): Promise<Product[]> => {
    await delay(600);
    return [...initialProducts];
  },
  getCustomers: async (): Promise<Customer[]> => {
    await delay(500);
    return [...initialCustomers];
  },
  getPurchaseInvoices: async (): Promise<PurchaseInvoice[]> => {
    await delay(800);
    return [...initialPurchaseInvoices];
  },
  getSalesInvoices: async (): Promise<SalesInvoice[]> => {
    await delay(700);
    return [...initialSalesInvoices];
  },
  getStock: async (): Promise<Stock[]> => {
    await delay(400);
    return [...initialStock];
  },
  getActivities: async (): Promise<Activity[]> => {
    await delay(300);
    return [...initialActivities];
  }
};
