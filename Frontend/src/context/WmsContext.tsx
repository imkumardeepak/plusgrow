import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Customer, PurchaseInvoice, SalesInvoice, Stock, Activity } from '../types';
import { mockApi } from '../services/mockApi';
import { toast } from 'sonner';

interface WmsContextType {
  products: Product[];
  customers: Customer[];
  purchaseInvoices: PurchaseInvoice[];
  salesInvoices: SalesInvoice[];
  stock: Stock[];
  activities: Activity[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  updateStock: (sku: string, qtyChange: number, description: string) => void;
  addPurchaseInvoice: (pi: PurchaseInvoice) => void;
  updatePurchaseInvoiceStatus: (id: string, status: 'Open' | 'Completed') => void;
  addSalesInvoice: (si: SalesInvoice) => void;
  updateSalesInvoiceStatus: (id: string, status: 'Open' | 'Dispatched') => void;
  addCustomer: (customer: Customer) => void;
  addProduct: (product: Product) => void;
  assignBin: (sku: string, rack: string, shelf: string, bin: string, qty: number) => void;
  clearBin: (rack: string, shelf: string, bin: string) => void;
}

const WmsContext = createContext<WmsContextType | undefined>(undefined);

export const WmsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [p, c, pi, si, s, a] = await Promise.all([
        mockApi.getProducts(),
        mockApi.getCustomers(),
        mockApi.getPurchaseInvoices(),
        mockApi.getSalesInvoices(),
        mockApi.getStock(),
        mockApi.getActivities(),
      ]);
      setProducts(p);
      setCustomers(c);
      setPurchaseInvoices(pi);
      setSalesInvoices(si);
      setStock(s);
      setActivities(a);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshData = async () => {
    toast.promise(loadData(), {
      loading: 'Refreshing data from Tally...',
      success: 'Data refreshed successfully!',
      error: 'Failed to refresh data',
    });
  };

  const addActivity = (type: Activity['type'], description: string) => {
    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      description,
      date: new Date().toISOString(),
    };
    setActivities(prev => [newActivity, ...prev]);
  };

  const updateStock = (sku: string, qtyChange: number, description: string) => {
    setStock(prev => {
      let newStock = [...prev];
      
      if (qtyChange > 0) {
        // Add to unassigned
        const unassigned = newStock.find(s => s.sku === sku && s.rack === 'Unassigned');
        if (unassigned) {
          newStock = newStock.map(s => s === unassigned ? { ...s, quantity: s.quantity + qtyChange } : s);
        } else {
          newStock.push({ sku, quantity: qtyChange, rack: 'Unassigned', shelf: 'Unassigned', bin: 'Unassigned' });
        }
      } else if (qtyChange < 0) {
        // Deduct from anywhere, starting with unassigned, then bins
        let remainingToDeduct = Math.abs(qtyChange);
        
        // Sort: Unassigned first, then others
        const skuItems = newStock.filter(s => s.sku === sku).sort((a, b) => a.rack === 'Unassigned' ? -1 : 1);
        
        for (const item of skuItems) {
          if (remainingToDeduct <= 0) break;
          
          if (item.quantity <= remainingToDeduct) {
            remainingToDeduct -= item.quantity;
            newStock = newStock.filter(s => s !== item);
          } else {
            newStock = newStock.map(s => s === item ? { ...s, quantity: s.quantity - remainingToDeduct } : s);
            remainingToDeduct = 0;
          }
        }
      }
      
      return newStock;
    });
    addActivity('Stock Update', description);
  };

  const addPurchaseInvoice = (pi: PurchaseInvoice) => {
    setPurchaseInvoices(prev => [pi, ...prev]);
    addActivity('Inward', `Created new Inward PI: ${pi.piNumber}`);
  };

  const updatePurchaseInvoiceStatus = (id: string, status: 'Open' | 'Completed') => {
    setPurchaseInvoices(prev => prev.map(pi => pi.id === id ? { ...pi, status } : pi));
    if (status === 'Completed') {
      const pi = purchaseInvoices.find(p => p.id === id);
      if (pi) {
        updateStock(pi.sku, pi.quantity, `Received ${pi.quantity} units for ${pi.piNumber}`);
      }
    }
  };

  const addSalesInvoice = (si: SalesInvoice) => {
    setSalesInvoices(prev => [si, ...prev]);
    addActivity('Outward', `Created new Sales Invoice: ${si.siNumber}`);
  };

  const updateSalesInvoiceStatus = (id: string, status: 'Open' | 'Dispatched') => {
    setSalesInvoices(prev => prev.map(si => si.id === id ? { ...si, status } : si));
    if (status === 'Dispatched') {
      const si = salesInvoices.find(s => s.id === id);
      if (si) {
        updateStock(si.sku, -si.quantity, `Dispatched ${si.quantity} units for ${si.siNumber}`);
      }
    }
  };

  const addCustomer = (customer: Customer) => {
    setCustomers(prev => [customer, ...prev]);
    toast.success("Customer added successfully");
  };

  const addProduct = (product: Product) => {
    setProducts(prev => [product, ...prev]);
    toast.success("Product added successfully");
  };

  const assignBin = (sku: string, rack: string, shelf: string, bin: string, qty: number) => {
    setStock(prev => {
      const unassigned = prev.find(s => s.sku === sku && s.rack === 'Unassigned');
      if (!unassigned) return prev;

      let newStock = [...prev];
      
      if (qty >= unassigned.quantity) {
        // Check if bin already has this SKU before moving
        const existingInBin = newStock.find(s => s.rack === rack && s.shelf === shelf && s.bin === bin && s.sku === sku);
        if (existingInBin) {
          // Merge with existing stock in bin
          newStock = newStock.map(s => s === existingInBin ? { ...s, quantity: s.quantity + unassigned.quantity } : s);
          // Remove the unassigned entry
          newStock = newStock.filter(s => s !== unassigned);
        } else {
          // Just move the unassigned stock to the bin
          newStock = newStock.map(s => s === unassigned ? { ...s, rack, shelf, bin } : s);
        }
      } else {
        // Partial quantity - reduce unassigned, add to bin
        newStock = newStock.map(s => s === unassigned ? { ...s, quantity: s.quantity - qty } : s);
        // Check if bin already has this SKU
        const existingInBin = newStock.find(s => s.rack === rack && s.shelf === shelf && s.bin === bin && s.sku === sku);
        if (existingInBin) {
           newStock = newStock.map(s => s === existingInBin ? { ...s, quantity: s.quantity + qty } : s);
        } else {
           newStock.push({ sku, quantity: qty, rack, shelf, bin });
        }
      }
      return newStock;
    });
    addActivity('Stock Update', `Put away ${qty} units of ${sku} to ${rack}-${shelf}-${bin}`);
    toast.success(`Assigned ${qty} units of ${sku} to Rack ${rack}, Shelf ${shelf}, Bin ${bin}`);
  };

  const clearBin = (rack: string, shelf: string, bin: string) => {
    setStock(prev => {
      let newStock = [...prev];
      const itemsInBin = newStock.filter(s => s.rack === rack && s.shelf === shelf && s.bin === bin);
      
      itemsInBin.forEach(item => {
        // Move back to unassigned
        const unassigned = newStock.find(s => s.sku === item.sku && s.rack === 'Unassigned');
        if (unassigned) {
          newStock = newStock.map(s => s === unassigned ? { ...s, quantity: s.quantity + item.quantity } : s);
          newStock = newStock.filter(s => s !== item);
        } else {
          newStock = newStock.map(s => s === item ? { ...s, rack: 'Unassigned', shelf: 'Unassigned', bin: 'Unassigned' } : s);
        }
      });
      return newStock;
    });
    toast.success(`Cleared Bin ${rack}-${shelf}-${bin}`);
  };

  return (
    <WmsContext.Provider value={{
      products, customers, purchaseInvoices, salesInvoices, stock, activities, isLoading,
      refreshData, updateStock, addPurchaseInvoice, updatePurchaseInvoiceStatus,
      addSalesInvoice, updateSalesInvoiceStatus, addCustomer, addProduct, assignBin, clearBin
    }}>
      {children}
    </WmsContext.Provider>
  );
};

export const useWms = () => {
  const context = useContext(WmsContext);
  if (context === undefined) {
    throw new Error('useWms must be used within a WmsProvider');
  }
  return context;
};
