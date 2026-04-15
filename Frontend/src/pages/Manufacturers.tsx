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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center shadow-sm">
              <Factory className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="font-semibold text-neutral-900">{row.name}</p>
              <div className="mt-0.5 space-y-1">
                {row.country && (
                  <p className="text-xs text-neutral-500 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-brand-400" />
                    {row.country}
                  </p>
                )}
                {row.address && (
                  <p className="text-xs text-neutral-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-300" />
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
        header: 'Added',
        cell: (row) => (
          <span className="inline-flex items-center px-2 py-1 bg-neutral-50 text-neutral-500 text-xs rounded-md border border-neutral-100">
            {row.created_at ? format(new Date(row.created_at), 'MMM dd, yyyy') : 'N/A'}
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
      {/* Header Bar */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-md shadow-brand-200">
              <Factory className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900 leading-tight tracking-tight">Manufacturers</h1>
              <p className="text-xs text-neutral-500 font-medium tracking-wide uppercase mt-0.5">Production Partners</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={openCreateModal}
              className="h-10 w-44 font-bold shadow-sm bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              ADD NEW
            </Button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 bg-white mx-6 mb-6 rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <DataTable
            columns={columns}
            data={manufacturers}
            loading={isLoading}
            searchPlaceholder="Search manufacturers..."
            onSearch={setSearchTerm}
            searchValue={searchTerm}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit Manufacturer' : 'New Manufacturer'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">
              Company Name <span className="text-danger-500">*</span>
            </label>
            <Input
              placeholder="Enter company name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Address</label>
            <textarea
              placeholder="Manufacturer address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all duration-200 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:border-brand-500 resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Country</label>
            <Input
              placeholder="Country of origin"
              value={formData.country}
              onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
              className="h-10"
            />
          </div>
          <div className="flex gap-3 pt-4 border-t border-neutral-200">
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
