import React, { useState, useEffect, memo } from 'react';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { Modal, ConfirmDialog } from '../components/atoms/Modal';
import { DataTable, createTableColumns } from '../components/molecules/DataTable';
import { Plus, Factory, Globe, Loader2, MapPin, Trash2, Edit2, Building } from 'lucide-react';
import { toast } from 'sonner';
import { manufacturersApi, Manufacturer, CreateManufacturerDto } from '../services/masterApi';
import { format } from 'date-fns';

export const Manufacturers = memo(function Manufacturers() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Manufacturer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Manufacturer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<CreateManufacturerDto>({
    name: '',
    country: '',
    address: '',
  });

  useEffect(() => {
    loadManufacturers();
  }, []);

  const loadManufacturers = async () => {
    try {
      setIsLoading(true);
      const data = await manufacturersApi.getAll();
      setManufacturers(data);
    } catch (error) {
      toast.error('Failed to load manufacturers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Manufacturer name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await manufacturersApi.update(isEditing.id, formData);
        toast.success('Manufacturer updated successfully');
      } else {
        await manufacturersApi.create(formData);
        toast.success('Manufacturer created successfully');
      }
      await loadManufacturers();
      closeModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save manufacturer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: '', country: '', address: '' });
    setIsEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (manufacturer: Manufacturer) => {
    setFormData({
      name: manufacturer.name,
      country: manufacturer.country || '',
      address: manufacturer.address || '',
    });
    setIsEditing(manufacturer);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
    setFormData({ name: '', country: '', address: '' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await manufacturersApi.delete(deleteTarget.id);
      toast.success('Manufacturer deleted successfully');
      await loadManufacturers();
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to delete manufacturer');
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Create table columns
  const columns = createTableColumns<Manufacturer>(
    [
      {
        accessorKey: 'name',
        header: 'Company',
        cell: (row) => (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-sm group-hover:shadow-neon-cyan/20 transition-all">
              <Factory className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[11px] text-white truncate uppercase tracking-tight">{row.name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                {row.country && (
                  <p className="text-[10px] text-neutral-500 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-brand-500/50" />
                    {row.country}
                  </p>
                )}
                {row.address && (
                  <p className="text-[10px] text-neutral-500 flex items-center gap-1 truncate max-w-[200px]">
                    <MapPin className="w-3 h-3 text-brand-500/50" />
                    {row.address}
                  </p>
                )}
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Registered',
        cell: (row) => (
          <span className="text-[10px] text-neutral-500 font-medium tracking-wider">
            {row.created_at ? format(new Date(row.created_at), 'dd/MM/yy') : '--'}
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
      <div className="page-toolbar py-1 px-1.5 bg-brand-950/20 backdrop-blur-md border-b border-white/5 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center border border-brand-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
              <Factory className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h1 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Manufacturers</h1>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-brand-500 animate-pulse" />
                <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Master Directory</p>
              </div>
            </div>
          </div>
          <Button
            onClick={openCreateModal}
            className="h-7 px-4 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.2)] bg-brand-500 hover:bg-brand-400 text-brand-950 rounded-lg transition-all"
            leftIcon={<Plus className="w-3 h-3" />}
          >
            Register Partner
          </Button>
        </div>
      </div>

      {/* Data Table Shell - Tightened */}
      <div className="flex-1 min-h-0 bg-white/[0.01] rounded-b-xl border border-t-0 border-white/5 overflow-hidden">
        <div className="h-full p-2 overflow-auto scrollbar-thin">
          <DataTable
            columns={columns}
            data={manufacturers}
            loading={isLoading}
            searchPlaceholder="Filter partners..."
            onSearch={setSearchTerm}
            searchValue={searchTerm}
          />
        </div>
      </div>

      {/* Create/Edit Modal - Compact High Density */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? 'MODIFY PARTNER' : 'REGISTER PARTNER'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="p-1 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                <Building className="w-3 h-3 text-brand-500" />
                Company Name <span className="text-danger-500">*</span>
              </label>
              <Input
                placeholder="Partner legal name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="h-8 text-[11px] bg-white/[0.03] border-white/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-3 h-3 text-brand-500" />
                  Country
                </label>
                <Input
                  placeholder="Origin country"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="h-8 text-[11px] bg-white/[0.03] border-white/10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-brand-500" />
                  Address
                </label>
                <Input
                  placeholder="Location summary"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="h-8 text-[11px] bg-white/[0.03] border-white/10"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-white/5">
            <Button type="button" variant="outline" onClick={closeModal} className="flex-1 h-8 text-[10px] uppercase font-bold tracking-widest border-white/5 bg-white/5">
              Abort
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 h-8 text-[10px] uppercase font-bold tracking-widest bg-brand-500 text-brand-950 hover:bg-brand-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              {isSubmitting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>{isEditing ? 'Commit Changes' : 'Confirm Registration'}</>
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
        title="Delete Manufacturer"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
});

export default Manufacturers;
