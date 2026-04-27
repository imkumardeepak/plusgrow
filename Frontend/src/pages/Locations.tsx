import React, { useState, useEffect, memo, useCallback } from 'react';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Modal, ConfirmDialog } from '../components/atoms/Modal';
import { DataTable, createTableColumns } from '../components/molecules/DataTable';
import { Plus, MapPin, Loader2, Trash2, Edit2, Upload, Box } from 'lucide-react';
import { toast } from 'sonner';
import { locationsApi, binsApi, Location, Bin, CreateLocationDto } from '../services/masterApi';
import { format } from 'date-fns';

export const Locations = memo(function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Location | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [formData, setFormData] = useState<CreateLocationDto>({
    aisle: '',
    rack: '',
    shelf: '',
    locationCode: '',
    bins: [],
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [locationsData, binsData] = await Promise.all([
        locationsApi.getAll(),
        binsApi.getAll(),
      ]);
      setLocations(locationsData);
      setBins(binsData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-generate location code
  useEffect(() => {
    if (formData.aisle && formData.rack && formData.shelf && !isEditing) {
        setFormData(prev => ({
            ...prev,
            locationCode: `${prev.aisle}-${prev.rack}-${prev.shelf}`
        }));
    }
  }, [formData.aisle, formData.rack, formData.shelf, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.locationCode.trim()) {
      toast.error('Location code is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await locationsApi.update(isEditing.id, formData);
        toast.success('Location updated successfully');
      } else {
        await locationsApi.create(formData);
        toast.success('Location created successfully');
      }
      await loadData();
      closeModal();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ aisle: '', rack: '', shelf: '', locationCode: '', bins: [] });
    setIsEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (location: Location) => {
    setFormData({
      aisle: location.aisle,
      rack: location.rack,
      shelf: location.shelf,
      locationCode: location.locationCode,
      bins: location.bins || [],
      id: location.id,
    });
    setIsEditing(location);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
    setFormData({ aisle: '', rack: '', shelf: '', locationCode: '', bins: [] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await locationsApi.delete(deleteTarget.id);
      toast.success('Location deleted successfully');
      await loadData();
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to delete location');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleBin = (binCode: string) => {
    setFormData(prev => {
        const currentBins = prev.bins || [];
        if (currentBins.includes(binCode)) {
            return { ...prev, bins: currentBins.filter(b => b !== binCode) };
        } else {
            return { ...prev, bins: [...currentBins, binCode] };
        }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await locationsApi.uploadExcel(file);
      if (result.success) {
        toast.success(`Successfully imported ${result.importedCount} locations`);
        await loadData();
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

  const columns = createTableColumns<Location>(
    [
      {
        accessorKey: 'locationCode',
        header: 'Location Code',
        cell: (row) => (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-card group-hover:shadow-neon-cyan/20 transition-all">
              <MapPin className="w-4.5 h-4.5 text-brand-400" />
            </div>
            <div>
              <p className="font-semibold text-white">{row.locationCode}</p>
              <p className="text-xs text-neutral-400">A:{row.aisle} R:{row.rack} S:{row.shelf}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'bins',
        header: 'Bins',
        cell: (row) => (
            <div className="flex flex-wrap gap-1 max-w-xs">
                {row.bins && row.bins.length > 0 ? row.bins.map(bin => (
                    <span key={bin} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
                        {bin}
                    </span>
                )) : (
                    <span className="text-xs text-neutral-500">No bins assigned</span>
                )}
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
      <div className="navbar bg-base-100 shadow-sm rounded-box mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="page-icon-chip">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Location Master</h1>
              <p className="text-sm opacity-70">Manage Warehouse Locations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="file"
                id="location-upload"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isImporting}
              />
              <Button
                variant="outline"
                className="h-9 border-brand-500/30 text-brand-400 hover:bg-brand-500/10"
                onClick={() => document.getElementById('location-upload')?.click()}
                leftIcon={isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                disabled={isImporting}
              >
                {isImporting ? 'IMPORTING...' : 'IMPORT EXCEL'}
              </Button>
            </div>
            <Button
              onClick={openCreateModal}
              className="h-9 w-44 font-bold shadow-card bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              ADD NEW
            </Button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm overflow-hidden">
        <div className="p-3">
          <DataTable
            columns={columns}
            data={locations}
            loading={isLoading}
            searchPlaceholder="Search locations..."
            onSearch={setSearchTerm}
            searchValue={searchTerm}
          />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit Location' : 'New Location'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                    <label className="label-text font-medium inline-block mb-1">Aisle <span className="text-danger-500">*</span></label>
                    <Input
                        placeholder="e.g. 101"
                        value={formData.aisle}
                        onChange={(e) => {
                            const aisle = e.target.value;
                            setFormData(prev => ({ 
                                ...prev, 
                                aisle,
                                locationCode: `${aisle}-${prev.rack}-${prev.shelf}`.replace(/^-|-$/g, '').replace(/--/g, '-')
                            }));
                        }}
                        className="h-9"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="label-text font-medium inline-block mb-1">Rack <span className="text-danger-500">*</span></label>
                    <Input
                        placeholder="e.g. A"
                        value={formData.rack}
                        onChange={(e) => {
                            const rack = e.target.value;
                            setFormData(prev => ({ 
                                ...prev, 
                                rack,
                                locationCode: `${prev.aisle}-${rack}-${prev.shelf}`.replace(/^-|-$/g, '').replace(/--/g, '-')
                            }));
                        }}
                        className="h-9"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="label-text font-medium inline-block mb-1">Shelf <span className="text-danger-500">*</span></label>
                    <Input
                        placeholder="e.g. 3"
                        value={formData.shelf}
                        onChange={(e) => {
                            const shelf = e.target.value;
                            setFormData(prev => ({ 
                                ...prev, 
                                shelf,
                                locationCode: `${prev.aisle}-${prev.rack}-${shelf}`.replace(/^-|-$/g, '').replace(/--/g, '-')
                            }));
                        }}
                        className="h-9"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="label-text font-medium inline-block mb-1">Location Code <span className="text-danger-500">*</span></label>
                <Input
                    placeholder="Auto-generated"
                    value={formData.locationCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, locationCode: e.target.value }))}
                    className="h-9 font-mono"
                />
            </div>

            <div className="space-y-2">
                <label className="label-text font-medium inline-block mb-1 mb-3 block">Assign Bins</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-4 border border-white/10 bg-white/5 rounded-xl scrollbar-thin">
                    {bins.map(bin => (
                        <div 
                            key={bin.id}
                            onClick={() => toggleBin(bin.binCode)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${
                                formData.bins?.includes(bin.binCode)
                                ? 'bg-brand-500/20 border-brand-500 text-white'
                                : 'bg-white/5 border-transparent text-neutral-400 hover:bg-white/10'
                            }`}
                        >
                            <Box className={`w-3.5 h-3.5 ${formData.bins?.includes(bin.binCode) ? 'text-brand-400' : 'text-neutral-500'}`} />
                            <span className="text-xs truncate">{bin.binCode}</span>
                        </div>
                    ))}
                    {bins.length === 0 && (
                        <div className="col-span-full py-4 text-center text-xs text-neutral-500 italic">
                            No bins available. Create them in Bin Master first.
                        </div>
                    )}
                </div>
            </div>

          <div className="flex gap-3 pt-6 border-t border-white/10">
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
        title="Delete Location"
        message={`Are you sure you want to delete "${deleteTarget?.locationCode}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
});

export default Locations;
