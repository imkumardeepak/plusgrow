import React, { memo, useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Group, MultiSelect, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  Box,
  CheckCircle2,
  Download,
  Edit2,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "../components/atoms/Button";
import { Input } from "../components/atoms/Input";
import { Modal, ConfirmDialog } from "../components/atoms/Modal";
import {
  DataTable,
  createTableColumns,
} from "../components/molecules/DataTable";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import { toast } from "../lib/toast";
import {
  locationsApi,
  binsApi,
  Location,
  Bin,
  CreateLocationDto,
} from "../services/masterApi";

export const Locations = memo(function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Location | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<CreateLocationDto>({
    aisle: "",
    rack: "",
    shelf: "",
    locationCode: "",
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
    } catch {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    if (formData.aisle || formData.rack || formData.shelf) {
      setFormData((prev) => ({
        ...prev,
        locationCode: [prev.aisle, prev.rack, prev.shelf]
          .filter(Boolean)
          .join("-"),
      }));
    }
  }, [formData.aisle, formData.rack, formData.shelf, isEditing]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.locationCode.trim()) {
      toast.error("Location code is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await locationsApi.update(isEditing.id, formData);
        toast.success("Location updated successfully");
      } else {
        await locationsApi.create(formData);
        toast.success("Location created successfully");
      }
      await loadData();
      closeModal();
    } catch (error: any) {
      toast.error(error.message || "Failed to save location");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      aisle: "",
      rack: "",
      shelf: "",
      locationCode: "",
      bins: [],
    });
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
    setFormData({
      aisle: "",
      rack: "",
      shelf: "",
      locationCode: "",
      bins: [],
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await locationsApi.delete(deleteTarget.id);
      toast.success("Location deleted successfully");
      await loadData();
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete location");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadTemplate = () => {
    locationsApi.downloadTemplate();
    toast.success("Template downloaded successfully");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload a valid Excel file");
      return;
    }

    setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      return;
    }

    setIsUploading(true);
    try {
      const result = await locationsApi.uploadExcel(uploadFile);
      if (result.success) {
        toast.success(
          `Successfully imported ${result.importedCount} locations`,
        );
        await loadData();
        setIsUploadModalOpen(false);
        setUploadFile(null);
      } else {
        toast.error("Import failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Error uploading file");
    } finally {
      setIsUploading(false);
    }
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
  };

  const columns = createTableColumns<Location>(
    [
      {
        accessorKey: "locationCode",
        header: "Location",
        cell: (row) => (
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon
              size={40}
              radius="lg"
              variant="light"
              color="cyan"
              style={{
                background: "rgba(30, 192, 243, 0.12)",
                border: "1px solid rgba(30, 192, 243, 0.18)",
              }}
            >
              <MapPin size={18} />
            </ThemeIcon>
            <Stack gap={2}>
              <Text fw={700} size="sm">
                {row.locationCode}
              </Text>
              <Text size="11px" c="dimmed">
                A:{row.aisle} R:{row.rack} S:{row.shelf}
              </Text>
            </Stack>
          </Group>
        ),
      },
      {
        accessorKey: "bins",
        header: "Bins",
        cell: (row) => (
          <Text size="11px" c="dimmed" lineClamp={2}>
            {row.bins && row.bins.length > 0
              ? row.bins.join(", ")
              : "No bins assigned"}
          </Text>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: (row) => (
          <Text size="11px" c="dimmed">
            {row.createdAt
              ? format(new Date(row.createdAt), "dd MMM yyyy")
              : "N/A"}
          </Text>
        ),
      },
    ],
    [
      {
        label: "Edit",
        icon: <Edit2 className="h-4 w-4" />,
        onClick: (row) => openEditModal(row),
      },
      {
        label: "Delete",
        icon: <Trash2 className="h-4 w-4" />,
        onClick: (row) => setDeleteTarget(row),
        variant: "destructive",
      },
    ],
  );

  const binOptions = bins.map((bin) => ({
    value: bin.binCode,
    label: bin.binCode,
  }));

  return (
    <>
      <OperationsPage
        title="Location Master"
        description="Warehouse slot management now follows same SaaS page shell, actions, table, and form rhythm."
        icon={MapPin}
        actions={
          <Group gap="xs">
            <Button
              variant="outline"
              leftIcon={<Upload size={16} />}
              onClick={() => setIsUploadModalOpen(true)}
            >
              Import Excel
            </Button>
            <Button onClick={openCreateModal} leftIcon={<Plus size={16} />}>
              New Location
            </Button>
          </Group>
        }
        metrics={[
          { label: "Locations", value: locations.length, tone: "brand" },
          {
            label: "Assigned Bins",
            value: locations.reduce(
              (acc, item) => acc + (item.bins?.length ?? 0),
              0,
            ),
          },
        ]}
      >
        <OperationsPanel
          title="Location Directory"
          description="Import, edit, and assign bins inside one common enterprise shell."
          icon={MapPin}
        >
          <DataTable
            columns={columns}
            data={locations}
            loading={isLoading}
            searchPlaceholder="Search locations..."
            onSearch={setSearchTerm}
            searchValue={searchTerm}
          />
        </OperationsPanel>
      </OperationsPage>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "Edit Location" : "New Location"}
        size="xl"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Group grow align="flex-start">
              <Input
                label="Aisle"
                placeholder="101"
                value={formData.aisle}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    aisle: event.target.value,
                  }))
                }
                required
              />
              <Input
                label="Rack"
                placeholder="A"
                value={formData.rack}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, rack: event.target.value }))
                }
                required
              />
              <Input
                label="Shelf"
                placeholder="3"
                value={formData.shelf}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    shelf: event.target.value,
                  }))
                }
                required
              />
            </Group>
            <Input
              label="Location Code"
              placeholder="Auto-generated or custom code"
              value={formData.locationCode}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  locationCode: event.target.value,
                }))
              }
              leftElement={<MapPin size={16} />}
              required
            />
            <MultiSelect
              label="Assign Bins"
              placeholder="Select bins"
              data={binOptions}
              value={formData.bins || []}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, bins: value }))
              }
              searchable
              clearable
              maxDropdownHeight={240}
              styles={{
                input: {
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.12)",
                },
                dropdown: {
                  background:
                    "linear-gradient(180deg, rgba(16,25,41,0.98) 0%, rgba(8,14,26,0.98) 100%)",
                  borderColor: "rgba(148, 163, 184, 0.16)",
                },
              }}
            />
            <Group justify="flex-end" pt="sm">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isEditing ? "Update Location" : "Create Location"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={closeUploadModal}
        title="Import Locations from Excel"
        size="lg"
      >
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon
                size={42}
                radius="lg"
                variant="light"
                color="cyan"
                style={{
                  background: "rgba(30, 192, 243, 0.12)",
                  border: "1px solid rgba(30, 192, 243, 0.18)",
                }}
              >
                <FileSpreadsheet size={20} />
              </ThemeIcon>
              <Stack gap={2}>
                <Text fw={700}>Location Import Template</Text>
                <Text size="sm" c="dimmed">
                  Download template first. Each row should contain one location
                  code in Aisle-Rack-Shelf format (e.g., 101-A-1).
                </Text>
              </Stack>
            </Group>
            <Button
              variant="outline"
              leftIcon={<Download size={16} />}
              onClick={handleDownloadTemplate}
            >
              Download Template
            </Button>
          </Group>

          <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} />

          {uploadFile ? (
            <Group gap="sm" wrap="nowrap">
              <CheckCircle2 size={18} color="var(--mantine-color-green-4)" />
              <Stack gap={2}>
                <Text fw={600}>{uploadFile.name}</Text>
                <Text size="sm" c="dimmed">
                  {(uploadFile.size / 1024).toFixed(1)} KB ready
                </Text>
              </Stack>
            </Group>
          ) : (
            <Text size="sm" c="dimmed">
              Select Excel file to import location master data.
            </Text>
          )}

          <Group justify="flex-end">
            <Button variant="outline" onClick={closeUploadModal}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile}
              loading={isUploading}
              leftIcon={
                isUploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )
              }
            >
              Import Locations
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Location"
        message={`Delete "${deleteTarget?.locationCode}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
});

export default Locations;
