import React, { useState, useEffect, memo, useCallback } from 'react';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Modal, ConfirmDialog } from '../components/atoms/Modal';
import { DataTable, createTableColumns } from '../components/molecules/DataTable';
import { Plus, Box, Loader2, Trash2, Edit2, Upload } from 'lucide-react';
import { toast } from '../lib/toast';
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
        header: 'Bin Location',
        cell: (row) => (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-sm group-hover:shadow-neon-cyan/20 transition-all">
              <Box className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <p className="font-bold text-[11px] text-white uppercase tracking-tight">{row.binCode}</p>
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Added',
        cell: (row) => (
          <span className="text-[10px] text-neutral-500 font-medium tracking-wider">
            {row.createdAt ? format(new Date(row.createdAt), 'dd/MM/yy') : '--'}
          </span>
        ),
      },
    ],
    [
      {
        label: 'Edit',
        icon: <Edit2 className="h-3.5 w-3.5" />,
        onClick: (row) => openEditModal(row),
      },
      {
        label: 'Delete',
        icon: <Trash2 className="h-3.5 w-3.5" />,
        onClick: (row) => setDeleteTarget(row),
        variant: 'destructive',
      },
    ]
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar - Compact Pro Max */}
      <div className="navbar bg-base-100 shadow-sm rounded-box mb-4 py-1 px-1.5 bg-brand-950/20 backdrop-blur-md border-b border-white/5 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center border border-brand-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
              <Box className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h1 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Bin Master</h1>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-brand-500 animate-pulse" />
                <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Storage Grid</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
                className="h-7 px-3 text-[10px] font-black uppercase tracking-widest border-brand-500/20 text-brand-400 hover:bg-brand-500/10 rounded-lg transition-all"
                onClick={() => document.getElementById('bin-upload')?.click()}
                leftIcon={isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                disabled={isImporting}
              >
                {isImporting ? 'Parsing...' : 'Bulk Import'}
              </Button>
            </div>
            <Button
              onClick={openCreateModal}
              className="h-7 px-4 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.2)] bg-brand-500 hover:bg-brand-400 text-brand-950 rounded-lg transition-all"
              leftIcon={<Plus className="w-3 h-3" />}
            >
              Add Bin
            </Button>
          </div>
        </div>
      </div>

      {/* Data Table Shell - Tightened */}
      <div className="flex-1 min-h-0 bg-white/[0.01] rounded-b-xl border border-t-0 border-white/5 overflow-hidden">
        <div className="h-full p-2 overflow-auto scrollbar-thin">
          <DataTable
            columns={columns}
            data={bins}
            loading={isLoading}
            searchPlaceholder="Filter bins..."
            onSearch={setSearchTerm}
            searchValue={searchTerm}
          />
        </div>
      </div>

      {/* Create/Edit Modal - Compact High Density */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? 'MODIFY BIN' : 'ADD NEW BIN'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="p-1 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
              <Box className="w-3 h-3 text-brand-500" />
              Bin Code <span className="text-danger-500">*</span>
            </label>
            <Input
              placeholder="e.g. A-101-B"
              value={formData.binCode}
              onChange={(e) => setFormData(prev => ({ ...prev, binCode: e.target.value }))}
              className="h-8 text-[11px] bg-white/[0.03] border-white/10"
            />
          </div>
          <div className="flex gap-2 pt-4 border-t border-white/5">
            <Button type="button" variant="outline" onClick={closeModal} className="flex-1 h-8 text-[10px] uppercase font-bold tracking-widest border-white/5 bg-white/5">
              Abort
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 h-8 text-[10px] uppercase font-bold tracking-widest bg-brand-500 text-brand-950 hover:bg-brand-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              {isSubmitting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>{isEditing ? 'Commit Changes' : 'Confirm Bin'}</>
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

