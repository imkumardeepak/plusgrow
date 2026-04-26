import React, { useState, useEffect, memo, useCallback } from 'react';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Modal, ConfirmDialog } from '../components/atoms/Modal';
import { DataTable, createTableColumns } from '../components/molecules/DataTable';
import { Plus, Box, Loader2, Trash2, Edit2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { binsApi, Bin, CreateBinDto } from '../services/masterApi';
import { format } from 'date-fns';

export const Bins = memo(function Bins() {
  const [bins, setBins] = useState<Bin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Bin | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [formData, setFormData] = useState<CreateBinDto>({
    binCode: '',
  });

  const loadBins = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await binsApi.getAll();
      setBins(data);
    } catch (error) {
      toast.error('Failed to load bins');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBins();
  }, [loadBins]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.binCode.trim()) {
      toast.error('Bin code is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await binsApi.update(isEditing.id, formData);
        toast.success('Bin updated successfully');
      } else {
        await binsApi.create(formData);
        toast.success('Bin created successfully');
      }
      await loadBins();
      closeModal();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save bin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ binCode: '' });
    setIsEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (bin: Bin) => {
    setFormData({
      binCode: bin.binCode,
      id: bin.id,
    });
    setIsEditing(bin);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
    setFormData({ binCode: '' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await binsApi.delete(deleteTarget.id);
      toast.success('Bin deleted successfully');
      await loadBins();
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to delete bin');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await binsApi.uploadExcel(file);
      if (result.success) {
        toast.success(`Successfully imported ${result.importedCount} bins`);
        await loadBins();
      } else {
        toast.error('Import failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error uploading file');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const columns = createTableColumns<Bin>(
    [
      {
        accessorKey: 'binCode',
        header: 'Bin Code',
        cell: (row) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-card group-hover:shadow-neon-cyan/20 transition-all">
              <Box className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="font-semibold text-white">{row.binCode}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Added',
        cell: (row) => (
          <span className="inline-flex items-center px-2 py-1 bg-white/5 text-neutral-400 text-xs rounded-md border border-white/10 font-medium">
            {row.createdAt ? format(new Date(row.createdAt), 'MMM dd, yyyy') : 'N/A'}
          </span>
        ),
      },
    ],
    [
      {
        label: 'Edit',
        icon: <Edit2 className="h-4 w-4" />,
        onClick: (row) => openEditModal(row),
      },
      {
        label: 'Delete',
        icon: <Trash2 className="h-4 w-4" />,
        onClick: (row) => setDeleteTarget(row),
        variant: 'destructive',
      },
    ]
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <div className="page-toolbar">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="page-icon-chip">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h1 className="page-title">Bin Master</h1>
              <p className="page-subtitle">Manage Storage Bins</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="file"
                id="bin-upload"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isImporting}
              />
              <Button
                variant="outline"
                className="h-10 border-brand-500/30 text-brand-400 hover:bg-brand-500/10"
                onClick={() => document.getElementById('bin-upload')?.click()}
                leftIcon={isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                disabled={isImporting}
              >
                {isImporting ? 'IMPORTING...' : 'IMPORT EXCEL'}
              </Button>
            </div>
            <Button
              onClick={openCreateModal}
              className="h-10 w-44 font-bold shadow-card bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              ADD NEW
            </Button>
          </div>
        </div>
      </div>

      <div className="page-table-shell">
        <div className="p-6">
          <DataTable
            columns={columns}
            data={bins}
            loading={isLoading}
            searchPlaceholder="Search bins..."
            onSearch={setSearchTerm}
            searchValue={searchTerm}
          />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit Bin' : 'New Bin'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="field-label">
              Bin Code <span className="text-danger-500">*</span>
            </label>
            <Input
              placeholder="Enter bin code"
              value={formData.binCode}
              onChange={(e) => setFormData(prev => ({ ...prev, binCode: e.target.value }))}
              className="h-10"
            />
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

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Bin"
        message={`Are you sure you want to delete "${deleteTarget?.binCode}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
});

export default Bins;
