import React, { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { Modal, ConfirmDialog } from '../components/atoms/Modal';
import { DataTable, createTableColumns } from '../components/molecules/DataTable';
import { Plus, Search, Package, Tag, Building, IndianRupee, Globe, CheckCircle2, Loader2, Trash2, Edit2, Copy, Eye, Upload, Download, FileSpreadsheet, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { productsApi, manufacturersApi, commoditiesApi, Product, Manufacturer, Commodity, CreateProductDto } from '../services/masterApi';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { TableAction } from '../components/molecules/DataTable';

export const MPD = memo(function MPD() {
  const [products, setProducts] = useState<Product[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState<CreateProductDto>({
    name: '',
    sku: '',
    commodityId: undefined,
    manufacturerId: undefined,
    countryOfOrigin: 'India',
    mrpQuantity: '',
    factor: 1,
    unitType: 'ML',
    ussp: 0,
    mrp: 0,
    bestBeforeMonths: 12,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [productsData, manufacturersData, commoditiesData] = await Promise.all([
        productsApi.getAll(),
        manufacturersApi.getAll(),
        commoditiesApi.getAll(),
      ]);
      setProducts(productsData);
      setManufacturers(manufacturersData);
      setCommodities(commoditiesData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) {
      toast.error('Product name and SKU are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: isEditing?.id || 0,
        name: formData.name,
        sku: formData.sku,
        commodityId: formData.commodityId || null,
        manufacturerId: formData.manufacturerId || null,
        countryOfOrigin: formData.countryOfOrigin || null,
        mrpQuantity: formData.mrpQuantity || null,
        factor: formData.factor || 1,
        unitType: (formData.unitType || 'UNIT').toUpperCase(),
        ussp: formData.ussp || 0,
        mrp: formData.mrp || 0,
        bestBeforeMonths: formData.bestBeforeMonths || 12,
      };

      if (isEditing) {
        await productsApi.update(isEditing.id, payload);
        toast.success('Product updated successfully');
      } else {
        await productsApi.create(payload);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.8 }, colors: ["#10b981", "#4E8EA2", "#0A4174"] });
        toast.success('Product cataloged successfully in the master registry.', {
          icon: <CheckCircle2 className="w-5 h-5 text-success-500" />
        });
      }
      await loadData();
      closeModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      sku: '',
      commodityId: undefined,
      manufacturerId: undefined,
      countryOfOrigin: 'India',
      mrpQuantity: '',
      factor: 1,
      unitType: 'UNIT',
      ussp: 0,
      mrp: 0,
      bestBeforeMonths: 12,
    });
    setIsEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setFormData({
      name: product.name,
      sku: product.sku || '',
      commodityId: product.commodityId,
      manufacturerId: product.manufacturerId,
      countryOfOrigin: product.countryOfOrigin || 'India',
      mrpQuantity: product.mrpQuantity || '',
      factor: product.factor || 1,
      unitType: product.unitType || 'UNIT',
      ussp: product.ussp || 0,
      mrp: product.mrp || 0,
      bestBeforeMonths: product.bestBeforeMonths || 12,
    });
    setIsEditing(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await productsApi.delete(deleteTarget.id);
      toast.success('Product deleted successfully');
      await loadData();
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleDownloadTemplate = () => {
    productsApi.downloadTemplate();
    toast.success('Template downloaded successfully');
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setUploadFile(file);
    } else {
      toast.error('Please upload a valid Excel file (.xlsx or .xls)');
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setUploadFile(file);
    } else {
      toast.error('Please upload a valid Excel file (.xlsx or .xls)');
    }
  };
  
  const handleUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    try {
      const result = await productsApi.uploadExcel(uploadFile);
      if (result.success) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#10b981", "#4E8EA2", "#0A4174"]
        });
        toast.success(`Successfully imported ${result.importedCount} products!`);
        if (result.errors && result.errors.length > 0) {
          toast.warning(`${result.errors.length} rows had errors`, { duration: 5000 });
        }
        await loadData();
        setIsUploadModalOpen(false);
        setUploadFile(null);
      } else {
        toast.error('Failed to import products');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to import products');
    } finally {
      setIsUploading(false);
    }
  };
  
  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
    setIsDragging(false);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.manufacturer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.commodity?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create table columns with actions
  const baseColumns = createTableColumns<Product>(
    [
      { 
        accessorKey: 'sku', 
        header: 'SKU',
cell: (row) => (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-500/10 text-brand-400 text-xs font-mono rounded-lg border border-brand-500/20 shadow-neon-cyan/10">
            {row.sku || 'N/A'}
          </span>
        )
      },
      { 
        accessorKey: 'name', 
        header: 'Product Name',
        cell: (row) => (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-card group-hover:shadow-neon-cyan/20 transition-all">
              <Package className="w-4.5 h-4.5 text-brand-400" />
            </div>
            <div>
              <span className="font-bold text-white block text-sm">{row.name}</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 font-medium uppercase tracking-wider mt-0.5">
                <Globe className="w-3 h-3" /> {row.countryOfOrigin || 'N/A'}
              </span>
            </div>
          </div>
        )
      },
      { 
        accessorKey: 'manufacturer', 
        header: 'Manufacturer',
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Building className="w-3.5 h-3.5 text-brand-400" />
            <span className="font-medium text-neutral-200 text-sm">
              {row.manufacturer?.name || 'N/A'}
            </span>
          </div>
        )
      },
      { 
        accessorKey: 'commodity', 
        header: 'Category',
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-warning-500" />
            <span className="font-medium text-neutral-200 text-sm">
              {row.commodity?.name || 'N/A'}
            </span>
          </div>
        )
      },
      { 
        accessorKey: 'mrp', 
        header: 'MRP',
        cell: (row) => (
          <div className="flex flex-col items-end">
            <span className="font-bold text-success-400 text-sm tracking-tight">
              ₹{(row.mrp || 0).toFixed(2)}
            </span>
            {row.ussp && row.ussp > 0 && (
              <span className="text-[10px] text-neutral-400 line-through">
                ₹{row.ussp.toFixed(2)}
              </span>
            )}
          </div>
        )
      },
    ],
    []
  );

  // Action column with inline buttons
  const actionColumn: ColumnDef<Product, any> = {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const product = row.original as Product;
      const isExpanded = expandedRow === product.id;
      return (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedRow(isExpanded ? null : product.id);
            }}
            className="h-8 w-8 p-0 text-neutral-400 hover:text-brand-400 hover:bg-brand-500/10"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Globe className="w-4 h-4" />
            </motion.div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(`${product.name} (${product.sku})`);
              toast.success('Copied to clipboard');
            }}
            className="h-8 w-8 p-0 text-neutral-400 hover:text-brand-400 hover:bg-brand-500/10"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(product);
            }}
            className="h-8 w-8 p-0 text-neutral-400 hover:text-brand-400 hover:bg-brand-500/10"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(product);
            }}
            className="h-8 w-8 p-0 text-neutral-400 hover:text-danger-400 hover:bg-danger-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      );
    },
  };

  const columns = [...baseColumns, actionColumn];

  // Row expansion details
  const ExpandedRow = ({ product }: { product: Product }) => (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="bg-white/[0.04] border-t border-b border-white/10 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Unit Type</p>
            <p className="text-sm font-medium text-neutral-200">{product.unitType || 'UNIT'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Best Before</p>
            <p className="text-sm font-medium text-neutral-200">{product.bestBeforeMonths || 12} months</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">USSP</p>
            <p className="text-sm font-medium text-warning-400">₹{(product.ussp || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar */}
      <Card variant="glass" className="p-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-neon-cyan/20">
              <Package className="w-4.5 h-4.5 text-brand-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight tracking-tight">Master Product Data</h1>
              <p className="text-xs text-neutral-500 font-medium tracking-wide uppercase mt-0.5">Asset Registration & Catalog</p>
            </div>
          </div>
<div className="flex items-center gap-3 border-l border-neutral-200/50 pl-4">
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              variant="outline"
              className="h-9 w-auto px-3 font-bold border-brand-500/20 text-brand-400 hover:bg-brand-500/10"
              leftIcon={<Upload className="w-4 h-4" />}
            >
              IMPORT
            </Button>
            <Button
              onClick={openCreateModal}
              className="h-9 w-40 font-bold shadow-card bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              NEW PRODUCT
            </Button>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card variant="elevated" className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-2.5 px-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <CardTitle size="sm" className="flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-500" />
              Products Directory
            </CardTitle>
            <Badge variant="primary" className="bg-brand-400/20 text-brand-400">{filteredProducts.length} Products</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="p-3">
            <DataTable 
              columns={columns} 
              data={filteredProducts} 
              loading={isLoading}
              searchPlaceholder="Search products..."
              onSearch={setSearchTerm}
              searchValue={searchTerm}
            />
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit Product' : 'New Product'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-neutral-200">
                Product Name <span className="text-danger-500">*</span>
              </label>
              <Input
                placeholder="e.g. Mechanical Keyboard Pro V2"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-200">
                SKU <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="SKU-XXXX-YY"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  className="h-9 pl-10 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-200">Manufacturer</label>
              <select
                className="w-full h-9 px-3 border rounded-md border-white/10 bg-white/[0.04] text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                value={formData.manufacturerId || ''}
                onChange={(e) => setFormData({ ...formData, manufacturerId: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">Select Manufacturer</option>
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-200">Commodity</label>
              <select
                className="w-full h-9 px-3 border rounded-md border-white/10 bg-white/[0.04] text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                value={formData.commodityId || ''}
                onChange={(e) => setFormData({ ...formData, commodityId: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">Select Commodity</option>
                {commodities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-200">MRP (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success-500" />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.mrp || ''}
                  onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
                  className="h-9 pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-200">USSP (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warning-500" />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.ussp || ''}
                  onChange={(e) => setFormData({ ...formData, ussp: Number(e.target.value) })}
                  className="h-9 pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-200">Unit Type</label>
              <Input
                placeholder="UNIT, KG, LTR, etc."
                value={formData.unitType}
                onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-200">Country of Origin</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="India"
                  value={formData.countryOfOrigin}
                  onChange={(e) => setFormData({ ...formData, countryOfOrigin: e.target.value })}
                  className="h-9 pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-200">Best Before (Months)</label>
              <Input
                type="number"
                min="0"
                placeholder="12"
                value={formData.bestBeforeMonths}
                onChange={(e) => setFormData({ ...formData, bestBeforeMonths: Number(e.target.value) })}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-200">MRP Quantity</label>
              <Input
                placeholder="e.g. 1L, 500g"
                value={formData.mrpQuantity}
                onChange={(e) => setFormData({ ...formData, mrpQuantity: e.target.value })}
                className="h-9"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>{isEditing ? 'Update' : 'Create'}</>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Excel Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={closeUploadModal}
        title="Import Products from Excel"
        size="lg"
      >
        <div className="space-y-6">
          {/* Template Download Section */}
          <div className="bg-white/[0.04] rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                  <FileSpreadsheet className="w-4.5 h-4.5 text-brand-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Product Import Template</p>
                  <p className="text-xs text-neutral-500">Download the template with correct column headers</p>
                </div>
              </div>
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                size="sm"
                className="border-brand-500/20 text-brand-400 hover:bg-brand-500/10"
                leftIcon={<Download className="w-4 h-4" />}
              >
                Download Template
              </Button>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="bg-warning-500/10 rounded-xl p-4 border border-warning-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning-400 shrink-0 mt-0.5" />
              <div className="text-sm text-warning-200 space-y-1">
                <p className="font-semibold">Important Instructions:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Use the template file to ensure correct column names</li>
                  <li>Manufacturer and Commodity names must already exist in the system</li>
                  <li>Product Name is required; SKU is optional</li>
                  <li>Only .xlsx and .xls files are supported</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Drop Zone */}
          <div
            className={cn(
              "relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200",
               isDragging
                ? "border-brand-500 bg-brand-500/10"
                : uploadFile
                ? "border-success-500 bg-success-500/10"
                : "border-white/15 hover:border-brand-500 hover:bg-brand-500/5"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-3">
              {uploadFile ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-success-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{uploadFile.name}</p>
                    <p className="text-sm text-neutral-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadFile(null);
                    }}
                    className="text-sm text-danger-500 hover:text-danger-300 flex items-center gap-1"
                  >
                    <X className="w-4 h-4" /> Remove file
                  </button>
                </>
              ) : (
                <>
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                    isDragging ? "bg-brand-500/20" : "bg-white/5"
                  )}>
                    <Upload className={cn(
                      "w-6 h-6",
                      isDragging ? "text-brand-500" : "text-neutral-400"
                    )} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {isDragging ? "Drop your file here" : "Drag & drop your Excel file"}
                    </p>
                    <p className="text-sm text-neutral-500">or click to browse</p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeUploadModal}
              className="flex-1"
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || isUploading}
              className="flex-1 bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700"
              leftIcon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            >
              {isUploading ? 'Importing...' : 'Import Products'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
});

export default MPD;
