import React, { useState, useEffect, memo } from 'react';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { Modal, ConfirmDialog } from '../components/atoms/Modal';
import { DataTable, createTableColumns } from '../components/molecules/DataTable';
import { Plus, Tag, Loader2, Trash2, Edit2 } from 'lucide-react';
import { toast } from '../lib/toast';
import { commoditiesApi, Commodity, CreateCommodityDto } from '../services/masterApi';
import { format } from 'date-fns';

export const Commodities = memo(function Commodities() {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Commodity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Commodity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<CreateCommodityDto>({
    name: '',
  });

  useEffect(() => {
    loadCommodities();
  }, []);

  const loadCommodities = async () => {
    try {
      setIsLoading(true);
      const data = await commoditiesApi.getAll();
      setCommodities(data);
    } catch (error) {
      toast.error('Failed to load commodities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Commodity name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await commoditiesApi.update(isEditing.id, formData);
        toast.success('Commodity updated successfully');
      } else {
        await commoditiesApi.create(formData);
        toast.success('Commodity created successfully');
      }
      await loadCommodities();
      closeModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save commodity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: '' });
    setIsEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (commodity: Commodity) => {
    setFormData({ name: commodity.name });
    setIsEditing(commodity);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
    setFormData({ name: '' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await commoditiesApi.delete(deleteTarget.id);
      toast.success('Commodity deleted successfully');
      await loadCommodities();
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to delete commodity');
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Create table columns
  const columns = createTableColumns<Commodity>(
    [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: (row) => (
          <span className="font-mono text-[10px] text-neutral-500 font-bold opacity-50">#{row.id}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Commodity',
        cell: (row) => (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-sm group-hover:shadow-neon-cyan/20 transition-all">
              <Tag className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <p className="font-bold text-[11px] text-white uppercase tracking-tight">{row.name}</p>
          </div>
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
              <Tag className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h1 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Commodities</h1>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-brand-500 animate-pulse" />
                <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Category Management</p>
              </div>
            </div>
          </div>
          <Button
            onClick={openCreateModal}
            className="h-7 px-4 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.2)] bg-brand-500 hover:bg-brand-400 text-brand-950 rounded-lg transition-all"
            leftIcon={<Plus className="w-3 h-3" />}
          >
            New Category
          </Button>
        </div>
      </div>

      {/* Data Table Shell - Tightened */}
      <div className="flex-1 min-h-0 bg-white/[0.01] rounded-b-xl border border-t-0 border-white/5 overflow-hidden">
        <div className="h-full p-2 overflow-auto scrollbar-thin">
          <DataTable
            columns={columns}
            data={commodities}
            loading={isLoading}
            searchPlaceholder="Filter categories..."
            onSearch={setSearchTerm}
            searchValue={searchTerm}
          />
        </div>
      </div>

      {/* Create/Edit Modal - Compact High Density */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? 'MODIFY CATEGORY' : 'NEW CATEGORY'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="p-1 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
              <Tag className="w-3 h-3 text-brand-500" />
              Category Name <span className="text-danger-500">*</span>
            </label>
            <Input
              placeholder="e.g. Raw Materials, Spares"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                <>{isEditing ? 'Commit Changes' : 'Confirm Category'}</>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Commodity"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
});

export default Commodities;

