import React, { useState, useEffect, memo } from 'react';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { Modal, ConfirmDialog } from '../components/atoms/Modal';
import { DataTable, createTableColumns } from '../components/molecules/DataTable';
import { Plus, Tag, Loader2, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
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
          <span className="font-mono text-xs text-neutral-400">#{row.id}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Commodity Name',
        cell: (row) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-card group-hover:shadow-neon-cyan/20 transition-all">
              <Tag className="w-5 h-5 text-brand-400" />
            </div>
            <p className="font-semibold text-white">{row.name}</p>
          </div>
        ),
      },
    ],
    [
      {
        label: 'Edit',
        icon: <Edit2 className="mr-2 h-4 w-4" />,
        onClick: (row) => openEditModal(row),
      },
      {
        label: 'Delete',
        icon: <Trash2 className="mr-2 h-4 w-4" />,
        onClick: (row) => setDeleteTarget(row),
        variant: 'destructive',
      },
    ]
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar */}
      <div className="page-toolbar">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="page-icon-chip">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="page-title">Commodities</h1>
              <p className="page-subtitle">Product Categories</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={openCreateModal}
              className="h-10 w-44 font-bold shadow-card bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              NEW COMMODITY
            </Button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="page-table-shell">
        <div className="p-6">
          <DataTable
            columns={columns}
            data={commodities}
            loading={isLoading}
            searchPlaceholder="Search commodities..."
            onSearch={setSearchTerm}
            searchValue={searchTerm}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit Commodity' : 'New Commodity'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="field-label">
              Commodity Name <span className="text-danger-500">*</span>
            </label>
            <Input
              placeholder="Enter commodity name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
